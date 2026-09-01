import {useRef, useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {
    ApprovalProcessResponse,
    ApprovalStageAttachmentResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    COMMENT_TRUNCATE_LENGTH,
    MAX_RESOLUTION_ATTACHMENTS,
    MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES,
    MAX_RESOLUTION_COMMENT_LENGTH,
    STAGE_DECISION_META,
} from "@/constants/coordinationParams.ts";
import {VND_REDACTION_MAX_ATTACHMENTS} from "@/constants/validation/vndValidation.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {resolveVndDocTitle} from "@/utils/fileNaming.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {downloadWithToast} from "@/utils/downloadFile.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    FileCheck2,
    FileText,
    MessageSquareText,
    Paperclip,
    RefreshCcw,
    Trash2,
} from "lucide-react";
import {DisagreementMatrixTable} from "./DisagreementMatrixTable.tsx";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {
    CommentViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/CommentViewModal.tsx";


interface VndRevisionNeededPanelProps {
    vndId: number;
    vnd: VndResponse;
    process: ApprovalProcessResponse;
    /** Редакция, вынесенная на согласование — берём отсюда текущие файлы документа
     * (RU/KG/EN) и вложения, чтобы дать возможность заменить/удалить только нужное. */
    redaction: VndRedactionResponse | undefined;
    /** Требуется ли обязательно приложить ТИД вместе с исправленной редакцией — true, если
     * у ВНД уже была предыдущая редакция (см. VndRedactionResponse.number > 1 на родительской
     * странице). Для первой редакции нового ВНД ТИД не нужен. */
    requiresTid: boolean;
    /** Вызывается после изменения матрицы разногласий (добавление/удаление строки),
     * чтобы перезагрузить процесс. */
    onChanged: () => Promise<void>;
    /** Вызывается после успешной отправки (resubmit). Родитель сам отвечает за перезагрузку
     * процесса/редакций (метка "Обновлено, дата" берётся из персистентных полей редакции,
     * которые придут со свежими данными) и всплывающее уведомление. */
    onResubmitted: () => Promise<void>;
}

interface RemarkItem {
    stageId: number;
    approverName: string;
    approverUserId: number;
    phase: string;
    comment: string;
    decidedAt: string | null;
    attachments: ApprovalStageAttachmentResponse[];
}

type RevisionPhaseKey = "primary" | "repeat" | "finalHold";

const PHASE_LABEL_BY_KEY: Record<RevisionPhaseKey, string> = {
    primary: "Первичное согласование",
    repeat: "Повторное согласование",
    finalHold: "Финальная выдержка",
};

/** Каким этапом вызван ТЕКУЩИЙ статус "На доработке" - нужно, чтобы отделить ещё не устранённые
 * замечания (с этого этапа) от уже устранённых (с более раннего этапа - см. RemarkCard ниже,
 * блок "Устранённые замечания"). Согласование может возвращаться на доработку несколько раз
 * подряд (первичное → доработка → повторное → снова доработка → снова повторное → ... →
 * финальная выдержка → доработка и т.д. - см. CompleteRepeatPhaseAsync/
 * ReturnToRevisionFromFinalHoldAsync на бэке), и при каждой повторной отправке (resubmit)
 * комментарии предыдущего "своего" круга обнуляются (RepeatComment/FinalHoldComment) - то есть
 * непустой repeatComment/finalHoldComment у этапа всегда относится именно к последнему кругу.
 * Поэтому "последний начавшийся из двух" (по repeatStartedAt/finalHoldStartedAt) и есть источник
 * текущих активных замечаний; всё, что осталось непустым в более ранних этапах (чаще всего -
 * первичное согласование) - уже устранённая история. */
function getActiveRevisionPhase(process: ApprovalProcessResponse): RevisionPhaseKey {
    const repeatTs = process.repeatStartedAt ? new Date(process.repeatStartedAt).getTime() : -1;
    const finalHoldTs = process.finalHoldStartedAt ? new Date(process.finalHoldStartedAt).getTime() : -1;
    if (finalHoldTs > -1 && finalHoldTs > repeatTs) return "finalHold";
    if (repeatTs > -1) return "repeat";
    return "primary";
}

/** Собираем замечания по редакции - с любого этапа (первичный / повторный / финальная
 * выдержка), т.к. RevisionNeeded может наступить после любого из них. Замечанием
 * считается комментарий именно к решению "approved_with_comment" (отправлено на
 * устранение замечаний) - комментарий к простому "approved" сюда не попадает. */
function collectRemarks(process: ApprovalProcessResponse): RemarkItem[] {
    return process.stages.flatMap((stage) => {
        const remarks: RemarkItem[] = [];

        if (stage.primaryComment && stage.primaryDecision === "approved_with_comment") {
            remarks.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "Первичное согласование",
                comment: stage.primaryComment,
                decidedAt: stage.primaryDecidedAt,
                attachments: stage.primaryAttachments,
            });
        }
        if (stage.repeatComment && stage.repeatDecision === "approved_with_comment") {
            remarks.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "Повторное согласование",
                comment: stage.repeatComment,
                decidedAt: stage.repeatDecidedAt,
                attachments: stage.repeatAttachments,
            });
        }
        if (stage.finalHoldComment && stage.finalHoldDecision === "approved_with_comment") {
            remarks.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "Финальная выдержка",
                comment: stage.finalHoldComment,
                decidedAt: stage.finalHoldDecidedAt,
                attachments: stage.finalHoldAttachments,
            });
        }
        return remarks;
    });
}

/** Системные автосгенерированные тексты комментариев (см. AutoApproveInitiatorStages,
 * ResetFinalHoldDecisions в VndApprovalService.cs на бэке) — это не пояснение от
 * реального согласующего, а техническая пометка "решение проставлено автоматически".
 * В блоке "пришедшие комментарии" такие записи только сбивают с толку, поэтому
 * не показываем их там (сами решения/статусы этапов при этом никак не скрываются). */
const AUTO_GENERATED_COMMENT_TEXTS = new Set([
    "Согласовано автоматически — инициатор является согласующим на этом этапе",
    "Согласовано автоматически — вы уже согласовали эту редакцию без замечаний ранее",
]);

/** Комментарии к простому согласованию ("approved") - не замечания, а просто
 * пояснения согласующего. Показываем отдельным блоком, и только если они есть. */
function collectApprovalComments(process: ApprovalProcessResponse): RemarkItem[] {
    return process.stages.flatMap((stage) => {
        const comments: RemarkItem[] = [];

        if (
            stage.primaryComment &&
            stage.primaryDecision === "approved" &&
            !AUTO_GENERATED_COMMENT_TEXTS.has(stage.primaryComment)
        ) {
            comments.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "Первичное согласование",
                comment: stage.primaryComment,
                decidedAt: stage.primaryDecidedAt,
                attachments: stage.primaryAttachments,
            });
        }
        if (
            stage.repeatComment &&
            stage.repeatDecision === "approved" &&
            !AUTO_GENERATED_COMMENT_TEXTS.has(stage.repeatComment)
        ) {
            comments.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "Повторное согласование",
                comment: stage.repeatComment,
                decidedAt: stage.repeatDecidedAt,
                attachments: stage.repeatAttachments,
            });
        }
        if (
            stage.finalHoldComment &&
            stage.finalHoldDecision === "approved" &&
            !AUTO_GENERATED_COMMENT_TEXTS.has(stage.finalHoldComment)
        ) {
            comments.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "Финальная выдержка",
                comment: stage.finalHoldComment,
                decidedAt: stage.finalHoldDecidedAt,
                attachments: stage.finalHoldAttachments,
            });
        }
        return comments;
    });
}

// Корректное склонение "замечание/замечания/замечаний" по числу
function pluralizeRemarkCount(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "замечание";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "замечания";
    return "замечаний";
}

/** Карточка одного замечания/комментария - в духе StageCardView: обрезанный текст,
 * кнопка на полный просмотр (модалка) и список прикреплённых файлов.
 * resolved=true - замечание уже устранено на более раннем круге доработки (см. resolvedRemarks
 * в VndRevisionNeededPanel) - оформляем серым, не жёлтым/красным, чтобы визуально не путать
 * с тем, что требует исправления прямо сейчас. */
function RemarkCard({
                        item,
                        isRemark,
                        resolved,
                        onOpenFull,
                    }: {
    item: RemarkItem;
    isRemark: boolean;
    resolved?: boolean;
    onOpenFull: () => void;
}) {
    const isLong = item.comment.length > COMMENT_TRUNCATE_LENGTH;
    const displayedComment = isLong
        ? item.comment.slice(0, COMMENT_TRUNCATE_LENGTH).trimEnd() + "…"
        : item.comment;
    const buttonLabel = isRemark ? "См. замечания полностью" : "См. комментарий полностью";

    return (
        <div
            className={`flex flex-col gap-2 rounded-[12px] border p-3.5 ${
                resolved
                    ? "border-[#e9edf3] bg-[#fafbfc]"
                    : isRemark ? "border-[#f0dcae] bg-[#fffcf5]" : "border-[#e9edf3] bg-white"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[12.5px] font-semibold ${resolved ? "text-[#8b97ab]" : "text-[#1c2740]"}`}>
                    {item.approverName}
                </span>
                <span className="text-[11px] font-medium text-[#8b97ab]">{item.phase}</span>
            </div>

            <div className={`whitespace-pre-wrap text-[12.5px] leading-[1.55] ${resolved ? "text-[#8b97ab]" : "text-[#3c424a]"}`}>
                {displayedComment}
            </div>

            {item.attachments.length > 0 && (
                <div className="rounded-[9px] border border-[#eef2f7] bg-white p-2">
                    <div className="mb-1 text-[10px] font-semibold text-[#8b97ab]">
                        Прикреплённые файлы:
                    </div>
                    <div className="flex flex-col gap-1">
                        {item.attachments.map((a) => (
                            <AttachmentRow key={a.id} fileId={a.fileId} fileName={a.fileName}/>
                        ))}
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={onOpenFull}
                className="cursor-pointer flex-none self-start rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
            >
                {buttonLabel}
            </button>
        </div>
    );
}

/** Кнопка-чекбокс единого стиля с "Требуется согласование" (VndUploadRedactionModal) /
 * "Только связанные со мной" (VndFilters) — квадрат со скруглением и галочкой вместо
 * нативного input[type=checkbox]. */
function CheckToggleButton({checked, onChange, label, disabled}: {
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onChange}
            className="inline-flex flex-none items-center gap-2 rounded-[9px] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50"
        >
            <span
                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                style={{
                    borderColor: checked ? "#4e57d6" : "#cbd3df",
                    background: checked ? "#4e57d6" : "white",
                }}
            >
                <Check
                    className="w-[13px] h-[13px] text-white"
                    strokeWidth={3}
                    style={{opacity: checked ? 1 : 0}}
                />
            </span>
            {label}
        </button>
    );
}

export type DocLang = "ru" | "kg" | "en";

interface DocSlotState {
    requiresReplace: boolean;
    file: File | null;
    remove: boolean;
}

const EMPTY_DOC_STATE: DocSlotState = {requiresReplace: false, file: null, remove: false};

interface DocSlot {
    lang: DocLang;
    label: string;
    fileId: number | null;
    exists: boolean;
    /** RU обязателен - его нельзя удалить, только заменить */
    deletable: boolean;
    title: string;
}

const DOC_ACCEPT = ".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx";

// Максимальный размер одного файла (документа редакции или вложения) — совпадает с
// ограничением в VndUploadRedactionModal, см. formatFileSize для вывода в UI.
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ

/** Строка одного документа редакции: для существующего - "требует замены" (открывает
 * "Заменить") либо удаление (для необязательных KG/EN); для отсутствующего языка -
 * простая загрузка "Добавить документ". */
function DocReplaceRow({slot, state, onToggleReplace, onToggleRemove, onFileSelected, onClearFile}: {
    slot: DocSlot;
    state: DocSlotState;
    onToggleReplace: () => void;
    onToggleRemove?: () => void;
    onFileSelected: (file: File) => void;
    onClearFile: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isUpdated = state.file !== null;
    const willBeRemoved = state.remove;

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelected(file);
        e.target.value = "";
    };

    if (!slot.exists) {
        return (
            <div className="flex flex-wrap items-center gap-2.5 rounded-[9px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] px-3 py-[10px]">
                <FileText size={16} className="flex-none text-[#c3c9d4]"/>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                        {slot.label}
                    </span>
                    <span className="truncate text-[13px] text-[#8b97ab]">
                        {isUpdated ? state.file!.name : "Документ не загружен"}
                    </span>
                </span>

                {isUpdated && (
                    <span className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e8e3e]">
                        <CheckCircle2 size={12} className="flex-none"/>
                        Добавлено
                    </span>
                )}

                {isUpdated && (
                    <button
                        type="button"
                        onClick={onClearFile}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                        title="Убрать выбранный файл"
                    >
                        <Trash2 size={14}/>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-none cursor-pointer inline-flex items-center gap-1.5 rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                >
                    <Paperclip size={13}/>
                    {isUpdated ? "Заменить" : "Добавить документ"}
                </button>
                <input ref={inputRef} type="file" accept={DOC_ACCEPT} className="hidden" onChange={handlePick}/>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-wrap items-center gap-2.5 rounded-[9px] border px-3 py-[10px] ${
                willBeRemoved ? "border-[#f0c4c4] bg-[#fdf5f5]" : "border-[#e5e9f0] bg-white"
            }`}
        >
            <FileText size={16} className="flex-none text-[#4e57d6]"/>

            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                    {slot.label}
                </span>
                <span
                    className={`truncate text-[13px] ${
                        willBeRemoved ? "text-[#c0392b] line-through" : "text-[#26324a]"
                    }`}
                >
                    {isUpdated ? state.file!.name : slot.title}
                </span>
            </span>

            <span
                className={`flex-none inline-flex items-center gap-1 text-[11px] font-semibold ${
                    willBeRemoved ? "text-[#c0392b]" : isUpdated ? "text-[#1e8e3e]" : "text-[#8b97ab]"
                }`}
            >
                {!willBeRemoved && isUpdated && <CheckCircle2 size={12} className="flex-none"/>}
                {willBeRemoved ? "Будет удалено" : isUpdated ? "Обновлено" : "Не обновлено"}
            </span>

            {isUpdated && !willBeRemoved && (
                <button
                    type="button"
                    onClick={onClearFile}
                    className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                    title="Убрать выбранный файл"
                >
                    <Trash2 size={14}/>
                </button>
            )}

            <CheckToggleButton
                checked={state.requiresReplace}
                onChange={onToggleReplace}
                label="требует замены"
                disabled={willBeRemoved}
            />

            <button
                type="button"
                disabled={!state.requiresReplace || willBeRemoved}
                onClick={() => inputRef.current?.click()}
                className={`flex-none inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                    state.requiresReplace && !willBeRemoved
                        ? "cursor-pointer border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc]"
                        : "cursor-not-allowed border-[#e5e9f0] bg-[#f3f4f7] text-[#b7bdc9]"
                }`}
            >
                <RefreshCcw size={13}/>
                Заменить
            </button>
            <input ref={inputRef} type="file" accept={DOC_ACCEPT} className="hidden" onChange={handlePick}/>

            {slot.deletable && onToggleRemove && (
                <button
                    type="button"
                    onClick={onToggleRemove}
                    className={`flex-none cursor-pointer inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                        willBeRemoved
                            ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                            : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                    }`}
                >
                    <Trash2 size={13}/>
                    {willBeRemoved ? "Отменить удаление" : "Удалить"}
                </button>
            )}
        </div>
    );
}

export function VndRevisionNeededPanel({
                                            vndId, vnd, process, redaction, requiresTid, onChanged, onResubmitted,
                                        }: VndRevisionNeededPanelProps) {
    const [docState, setDocState] = useState<Record<DocLang, DocSlotState>>({
        ru: EMPTY_DOC_STATE,
        kg: EMPTY_DOC_STATE,
        en: EMPTY_DOC_STATE,
    });
    const [tid, setTid] = useState<File | null>(null);
    const [comment, setComment] = useState("");
    const [agreesWithAllRemarks, setAgreesWithAllRemarks] = useState<boolean | null>(null);

    const [newAttachments, setNewAttachments] = useState<File[]>([]);
    const [attachmentCountLimitHit, setAttachmentCountLimitHit] = useState(false);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<Set<number>>(new Set());

    // Вложения к самому комментарию о внесённых исправлениях (отдельно от "Вложений редакции"
    // выше) - см. VndApproverResolutionPanel для того же паттерна на стороне согласующего.
    const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
    const [commentAttachmentCountLimitHit, setCommentAttachmentCountLimitHit] = useState(false);
    const [oversizedCommentFileNames, setOversizedCommentFileNames] = useState<string[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openRemark, setOpenRemark] = useState<{item: RemarkItem; isRemark: boolean} | null>(null);

    // Подтверждение удаления существующего (уже сохранённого) документа/вложения редакции —
    // только для случая "пометить на удаление", отмена пометки ("Отменить удаление") идёт
    // без подтверждения, т.к. ничего не теряет. Само удаление физически произойдёт только
    // при отправке (handleSubmit) - здесь лишь ставится флаг remove/removedAttachmentIds.
    const [pendingRemoval, setPendingRemoval] = useState<
        {kind: "doc"; lang: DocLang; label: string} | {kind: "attachment"; fileId: number; label: string} | null
    >(null);

    const confirmPendingRemoval = () => {
        if (!pendingRemoval) return;
        if (pendingRemoval.kind === "doc") toggleDocRemove(pendingRemoval.lang);
        else toggleRemoveExistingAttachment(pendingRemoval.fileId);
        setPendingRemoval(null);
    };

    const allRemarks = collectRemarks(process);
    const activePhaseLabel = PHASE_LABEL_BY_KEY[getActiveRevisionPhase(process)];
    // Замечания, требующие исправления ПРЯМО СЕЙЧАС (с последнего пройденного этапа) - отдельно
    // от уже устранённых замечаний более раннего этапа (см. resolvedRemarks ниже - те остаются
    // видны для истории/контекста, но серым отдельным блоком, не как активное "надо исправить").
    const remarks = allRemarks.filter((r) => r.phase === activePhaseLabel);
    const resolvedRemarks = allRemarks.filter((r) => r.phase !== activePhaseLabel);
    const approvalComments = collectApprovalComments(process);
    const rows = process.disagreementMatrixRows;

    const docSlots: DocSlot[] = redaction
        ? [
            {
                lang: "ru", label: "Русский", fileId: redaction.docFileRuId, exists: true, deletable: false,
                title: resolveVndDocTitle(vnd, "ru"),
            },
            {
                lang: "kg", label: "Кыргызча", fileId: redaction.docFileKgId,
                exists: redaction.docFileKgId !== null, deletable: true,
                title: resolveVndDocTitle(vnd, "kg"),
            },
            {
                lang: "en", label: "English", fileId: redaction.docFileEnId,
                exists: redaction.docFileEnId !== null, deletable: true,
                title: resolveVndDocTitle(vnd, "en"),
            },
        ]
        : [];

    const hasAnyDocChange = Object.values(docState).some((s) => s.file !== null || s.remove);

    const existingAttachmentIds = (redaction?.attachmentFileIds ?? []).filter((id) => !removedAttachmentIds.has(id));
    const totalAttachmentCount = existingAttachmentIds.length + newAttachments.length;
    const attachmentSlotsLeft = VND_REDACTION_MAX_ATTACHMENTS - totalAttachmentCount;
    const attachmentLimitReached = attachmentSlotsLeft <= 0;
    const hasAnyAttachmentChange = newAttachments.length > 0 || removedAttachmentIds.size > 0;

    const tidMissing = requiresTid && !tid;

    // Причина, по которой отправка сейчас заблокирована - показываем тултипом на кнопке
    let disabledReason: string | null = null;
    if (agreesWithAllRemarks === null) {
        disabledReason = "Сначала укажите, согласны ли вы со всеми замечаниями";
    } else if (agreesWithAllRemarks === true && !hasAnyDocChange && !hasAnyAttachmentChange) {
        disabledReason = "Отметьте хотя бы один документ как «требует замены» (или добавьте/удалите вложение) и загрузите обновлённый файл";
    } else if (agreesWithAllRemarks === false && rows.length === 0) {
        disabledReason = "Добавьте хотя бы одну строку в матрицу разногласий, чтобы отправить";
    } else if (tidMissing) {
        disabledReason = "Приложите файл ТИД (Таблица изменений и дополнений) — он обязателен при актуализации ВНД";
    }

    const canSubmit = disabledReason === null && !submitting;

    const handleAddRow = async (row: {
        developerPosition: string;
        opponentPosition: string;
        developerJustification?: string;
    }) => {
        await coordinationService.addDisagreementRow(vndId, row);
        await onChanged();
    };

    const handleDeleteRow = async (rowId: number) => {
        await coordinationService.deleteDisagreementRow(vndId, rowId);
        await onChanged();
    };

    const handleTidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setTid(file);
        e.target.value = "";
    };

    const toggleDocReplace = (lang: DocLang) => {
        setDocState((prev) => {
            const cur = prev[lang];
            const nextRequires = !cur.requiresReplace;
            // Снимаем чекбокс - выбранный файл сбрасывается, к отправке вернётся старый файл
            return {...prev, [lang]: {requiresReplace: nextRequires, file: nextRequires ? cur.file : null, remove: false}};
        });
    };

    const toggleDocRemove = (lang: DocLang) => {
        setDocState((prev) => {
            const cur = prev[lang];
            const nextRemove = !cur.remove;
            return {
                ...prev,
                [lang]: {requiresReplace: false, file: nextRemove ? null : cur.file, remove: nextRemove},
            };
        });
    };

    const setDocFile = (lang: DocLang, file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            setError(`Файл «${file.name}» превышает допустимый размер (${formatFileSize(MAX_FILE_SIZE)})`);
            return;
        }
        setError(null);
        setDocState((prev) => ({...prev, [lang]: {...prev[lang], file, remove: false}}));
    };

    const clearDocFile = (lang: DocLang) => {
        setDocState((prev) => ({...prev, [lang]: {...prev[lang], file: null}}));
    };

    const handleAddNewAttachments = (files: FileList | null) => {
        if (!files) return;
        const incoming = Array.from(files);

        const oversized = incoming.find((f) => f.size > MAX_FILE_SIZE);
        if (oversized) {
            setError(`Файл «${oversized.name}» превышает допустимый размер (${formatFileSize(MAX_FILE_SIZE)})`);
            return;
        }

        setError(null);
        const accepted = incoming.slice(0, Math.max(0, attachmentSlotsLeft));
        setAttachmentCountLimitHit(accepted.length < incoming.length);
        setNewAttachments((prev) => [...prev, ...accepted]);
    };

    const removeNewAttachment = (index: number) => {
        setNewAttachments((prev) => prev.filter((_, i) => i !== index));
        setAttachmentCountLimitHit(false);
    };

    const commentAttachmentSlotsLeft = MAX_RESOLUTION_ATTACHMENTS - commentAttachments.length;
    const commentAttachmentLimitReached = commentAttachmentSlotsLeft <= 0;

    const handleAddCommentAttachments = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const incoming = Array.from(files);

        // Лимит по размеру - на каждый файл отдельно, как в VndApproverResolutionPanel.
        const withinSizeLimit = incoming.filter((f) => f.size <= MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES);
        const oversized = incoming.filter((f) => f.size > MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES);
        const accepted = withinSizeLimit.slice(0, Math.max(0, commentAttachmentSlotsLeft));

        setCommentAttachments((prev) => [...prev, ...accepted]);
        setCommentAttachmentCountLimitHit(accepted.length < withinSizeLimit.length);
        setOversizedCommentFileNames(oversized.map((f) => f.name));
    };

    const removeCommentAttachment = (index: number) => {
        setCommentAttachments((prev) => prev.filter((_, i) => i !== index));
        setCommentAttachmentCountLimitHit(false);
    };

    const toggleRemoveExistingAttachment = (fileId: number) => {
        setRemovedAttachmentIds((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!canSubmit || agreesWithAllRemarks === null) return;
        setSubmitting(true);
        setError(null);
        try {
            await coordinationService.resubmit(vndId, {
                docRu: docState.ru.file ?? undefined,
                docKg: docState.kg.file ?? undefined,
                docEn: docState.en.file ?? undefined,
                removeDocKg: docState.kg.remove,
                removeDocEn: docState.en.remove,
                tid: tid ?? undefined,
                newAttachments: newAttachments.length > 0 ? newAttachments : undefined,
                removedAttachmentFileIds: removedAttachmentIds.size > 0 ? Array.from(removedAttachmentIds) : undefined,
                comment: comment.trim() || undefined,
                commentAttachments: commentAttachments.length > 0 ? commentAttachments : undefined,
                agreesWithAllRemarks,
            });
            await onResubmitted();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось отправить редакцию");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-6 space-y-5">
            {/* Замечания при согласовании - карточки в духе StageCardView, с количеством красным */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#d62815]"/>
                    <span className="text-[13.5px] font-bold text-[#d62815]">
                        {remarks.length === 0
                            ? "Замечаний нет"
                            : `Необходимо исправить: ${remarks.length} ${pluralizeRemarkCount(remarks.length)}`}
                    </span>
                </div>
                {remarks.length > 0 && (
                    <div className="flex flex-col gap-3 p-4">
                        {remarks.map((r, i) => (
                            <RemarkCard
                                key={i}
                                item={r}
                                isRemark
                                onOpenFull={() => setOpenRemark({item: r, isRemark: true})}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Замечания более раннего круга доработки - уже устранены (иначе согласование не
                дошло бы до следующего этапа и не вернулось сюда заново) - показываем для
                контекста отдельным серым блоком, не смешивая с тем, что нужно исправить сейчас. */}
            {resolvedRemarks.length > 0 && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-[#fbfcfe]">
                    <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#a3adbd]"/>
                        <span className="text-[13.5px] font-bold text-[#8b97ab]">
                            Устранённые замечания предыдущего этапа
                        </span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        {resolvedRemarks.map((r, i) => (
                            <RemarkCard
                                key={i}
                                item={r}
                                isRemark
                                resolved
                                onOpenFull={() => setOpenRemark({item: r, isRemark: true})}
                            />
                        ))}
                    </div>
                </div>
            )}

            {approvalComments.length > 0 && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="flex items-center gap-1.5 border-b border-[#eef2f7] px-5 py-[13px]">
                        <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-[#4e57d6]"/>
                        <span className="text-[13.5px] font-bold text-[#1c2740]">
                            Также посмотрите пришедшие комментарии по согласованию:
                        </span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                        {approvalComments.map((c, i) => (
                            <RemarkCard
                                key={i}
                                item={c}
                                isRemark={false}
                                onOpenFull={() => setOpenRemark({item: c, isRemark: false})}
                            />
                        ))}
                    </div>
                </div>
            )}

            {openRemark && (
                <CommentViewModal
                    title={openRemark.isRemark ? "См. замечания полностью" : "См. комментарий полностью"}
                    approverName={openRemark.item.approverName}
                    approverUserId={openRemark.item.approverUserId}
                    decidedAt={openRemark.item.decidedAt}
                    comment={openRemark.item.comment}
                    attachments={openRemark.item.attachments}
                    decisionLabel={
                        openRemark.isRemark
                            ? STAGE_DECISION_META.approved_with_comment.label
                            : STAGE_DECISION_META.approved.label
                    }
                    decisionBadgeClass={
                        openRemark.isRemark
                            ? STAGE_DECISION_META.approved_with_comment.badgeClass
                            : STAGE_DECISION_META.approved.badgeClass
                    }
                    onClose={() => setOpenRemark(null)}
                />
            )}

            {/* Единый блок: вопрос "согласны ли" + (при "Нет") матрица разногласий сразу внутри него */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                    Согласны ли вы со всеми замечаниями?
                </div>
                <div className="px-5 py-4">
                    <div role="radiogroup" className="flex gap-3">
                        {([
                            {label: "Да", value: true},
                            {label: "Нет", value: false},
                        ] as const).map(({label, value}) => {
                            const isSelected = agreesWithAllRemarks === value;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    onClick={() => setAgreesWithAllRemarks(value)}
                                    className={`bg-white text-[#3a4560] font-medium hover:bg-[#f6f8fb] inline-flex items-center gap-2 h-9 px-4 rounded-[9px] text-[13px] cursor-pointer transition-colors`}
                                >
                                    <span
                                        className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                                            isSelected ? "border-[#4e57d6]" : "border-[#c3c9d4]"
                                        }`}
                                    >
                                        {isSelected && <span className="h-[8px] w-[8px] rounded-full bg-[#4e57d6]"/>}
                                    </span>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {agreesWithAllRemarks === false && (
                    <div>
                        <DisagreementMatrixTable rows={rows} onAddRow={handleAddRow} onDeleteRow={handleDeleteRow}/>
                    </div>
                )}

                {/* Раньше это была отдельная карточка ниже - визуально "отваливалась" от блока
                    с вопросом "Согласны ли вы...", тогда как матрица разногласий (ветка "Нет"
                    выше) остаётся внутри той же карточки. Встраиваем сюда же для единообразия -
                    один блок продолжается заголовком с border-t вместо новой карточки. */}
                {agreesWithAllRemarks === true && (
                    <>
                    <div className="border-t border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                        Загрузить редакцию с исправленными замечаниями:
                    </div>

                    <div className="flex flex-col gap-2 px-5 py-4">
                        <div className="mb-1 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[11.5px] leading-[1.5] text-[#8b97ab]">
                            Допустимый формат: DOCX. Максимальный
                            размер каждого файла — {formatFileSize(MAX_FILE_SIZE)}.
                        </div>
                        {docSlots.length === 0 && (
                            <div className="text-[12.5px] text-[#8b97ab]">
                                Не удалось загрузить документы текущей редакции — обновите страницу.
                            </div>
                        )}
                        {docSlots.map((slot) => (
                            <DocReplaceRow
                                key={slot.lang}
                                slot={slot}
                                state={docState[slot.lang]}
                                onToggleReplace={() => toggleDocReplace(slot.lang)}
                                onToggleRemove={slot.deletable ? () => {
                                    // Отмена уже выставленной пометки на удаление ничего не
                                    // теряет - подтверждение нужно только на сам момент удаления.
                                    if (docState[slot.lang].remove) toggleDocRemove(slot.lang);
                                    else setPendingRemoval({kind: "doc", lang: slot.lang, label: slot.label});
                                } : undefined}
                                onFileSelected={(file) => setDocFile(slot.lang, file)}
                                onClearFile={() => clearDocFile(slot.lang)}
                            />
                        ))}

                        {/* Вложения редакции - существующие (с возможностью удалить) + новые */}
                        <div className="mt-3">
                            <div className="mb-[6px] flex items-center justify-between gap-2">
                                <span className="text-[12.5px] font-semibold text-[#26324a]">
                                    Вложения редакции <span className="text-[#8b97ab] font-normal">(необязательно)</span>
                                </span>
                                <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                                    Добавлено {totalAttachmentCount} из {VND_REDACTION_MAX_ATTACHMENTS} файлов максимум
                                    <HelpTooltip
                                        content={`Количество вложений к редакции ограничено — не более ${VND_REDACTION_MAX_ATTACHMENTS}.`}
                                        side="top"
                                        className="h-5 w-5"
                                    />
                                </span>
                            </div>

                            {(redaction?.attachments.length ?? 0) > 0 && (
                                <div className="flex flex-col gap-[6px]">
                                    {(redaction?.attachments ?? []).map((attachment) => {
                                        const willBeRemoved = removedAttachmentIds.has(attachment.fileId);
                                        return (
                                            <div
                                                key={attachment.fileId}
                                                className={`flex items-center gap-2 rounded-[9px] border px-3 py-[8px] ${
                                                    willBeRemoved ? "border-[#f0c4c4] bg-[#fdf5f5]" : "border-[#e5e9f0] bg-white"
                                                }`}
                                            >
                                                <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadWithToast(attachment.fileId, attachment.fileName)}
                                                    className={`flex-1 truncate text-left text-[12.5px] cursor-pointer hover:underline ${
                                                        willBeRemoved ? "text-[#c0392b] line-through" : "text-[#26324a]"
                                                    }`}
                                                >
                                                    {attachment.fileName}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (willBeRemoved) toggleRemoveExistingAttachment(attachment.fileId);
                                                        else setPendingRemoval({
                                                            kind: "attachment",
                                                            fileId: attachment.fileId,
                                                            label: attachment.fileName,
                                                        });
                                                    }}
                                                    className={`cursor-pointer flex-none rounded-[7px] border px-2.5 py-[5px] text-[11px] font-semibold transition-colors ${
                                                        willBeRemoved
                                                            ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                                                            : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                                                    }`}
                                                >
                                                    {willBeRemoved ? "Отменить удаление" : "Удалить"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {newAttachments.length > 0 && (
                                <div className="mt-[6px] flex flex-col gap-[6px]">
                                    {newAttachments.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[8px]"
                                        >
                                            <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                                            <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{file.name}</span>
                                            <span className="flex-none text-[11px] text-[#a3adbd]">
                                                {formatFileSize(file.size)}
                                            </span>
                                            <span className="flex-none inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e8e3e]">
                                                <CheckCircle2 size={12} className="flex-none"/>
                                                Добавлено
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeNewAttachment(index)}
                                                className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {attachmentLimitReached ? (
                                <Tooltip
                                    content={`Достигнут максимум — ${VND_REDACTION_MAX_ATTACHMENTS} вложений на редакцию`}
                                    side="top"
                                    className="mt-[6px] w-full"
                                >
                                    <span
                                        className="flex h-[42px] w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#e5e9f0] bg-[#f6f8fb] text-[11.5px] text-[#b7bfcc]"
                                    >
                                        <Paperclip size={14}/>
                                        Добавить файлы
                                    </span>
                                </Tooltip>
                            ) : (
                                <label
                                    className="mt-[6px] flex h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[11.5px] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                >
                                    <Paperclip size={14}/>
                                    Добавить файлы
                                    <input
                                        type="file"
                                        multiple
                                        accept={DOC_ACCEPT}
                                        className="hidden"
                                        onChange={(e) => {
                                            handleAddNewAttachments(e.target.files);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                            )}

                            {attachmentCountLimitHit && (
                                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                                    <span>
                                        Часть выбранных файлов не добавлена — максимум {VND_REDACTION_MAX_ATTACHMENTS} вложений на редакцию.
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 mb-[6px] flex items-center justify-between">
                            <span className="text-[12.5px] font-semibold text-[#26324a]">
                                Комментарий о внесённых исправлениях
                            </span>
                            <CharCounter length={comment.length} max={MAX_RESOLUTION_COMMENT_LENGTH}/>
                        </div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, MAX_RESOLUTION_COMMENT_LENGTH))}
                            maxLength={MAX_RESOLUTION_COMMENT_LENGTH}
                            rows={3}
                            className="w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] font-normal text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                        />

                        <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-0.5 text-[11px] text-[#8b97ab]">
                                Добавлено {commentAttachments.length} из {MAX_RESOLUTION_ATTACHMENTS} файлов максимум
                                <HelpTooltip
                                    content={`Файлы, приложенные к комментарию — не более ${MAX_RESOLUTION_ATTACHMENTS}, каждый не больше ${formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)}. Сохраняются в истории согласования бессрочно, наравне с текстом комментария.`}
                                    side="top"
                                    className="h-5 w-5"
                                />
                            </span>

                            {commentAttachmentLimitReached ? (
                                <Tooltip
                                    content={`Достигнут максимум — ${MAX_RESOLUTION_ATTACHMENTS} файлов на комментарий`}
                                    side="top"
                                >
                                    <span className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] bg-[#f6f8fb] px-3 py-[6px] text-[11.5px] font-semibold text-[#b7bfcc]">
                                        <Paperclip size={13}/>
                                        Прикрепить файл
                                    </span>
                                </Tooltip>
                            ) : (
                                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] border border-[#d7dee8] bg-white px-3 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]">
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            handleAddCommentAttachments(e.target.files);
                                            e.target.value = "";
                                        }}
                                    />
                                    <Paperclip size={13}/>
                                    Прикрепить файл
                                </label>
                            )}
                        </div>

                        {commentAttachmentCountLimitHit && (
                            <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                                <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                                <span>
                                    Часть выбранных файлов не добавлена — максимум {MAX_RESOLUTION_ATTACHMENTS} файлов на комментарий.
                                </span>
                            </div>
                        )}

                        {oversizedCommentFileNames.length > 0 && (
                            <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                                <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                                <span>
                                    Не добавлен{oversizedCommentFileNames.length > 1 ? "ы" : ""} «{oversizedCommentFileNames.join("», «")}»
                                    {" "}— размер файла не должен превышать {formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)}.
                                </span>
                            </div>
                        )}

                        {commentAttachments.length > 0 && (
                            <div className="mt-2 flex flex-col gap-[6px]">
                                {commentAttachments.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[7px] text-[12px] text-[#3a4560]"
                                    >
                                        <Paperclip size={13} className="flex-none text-[#8b97ab]"/>
                                        <Tooltip content={file.name} side="top" className="min-w-0 flex-1">
                                            <span className="block truncate">{file.name}</span>
                                        </Tooltip>
                                        <span className="flex-none text-[11px] text-[#a3adbd]">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeCommentAttachment(index)}
                                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                        >
                                            <Trash2 size={13}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </>
                )}
            </div>

            {requiresTid && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                        Таблица изменений и дополнений (ТИД)
                    </div>
                    <div className="px-5 py-4">
                        <p className="mb-3 text-[12.5px] leading-[1.5] text-[#8b97ab]">
                            Обязательна при актуализации ВНД — прикладывайте обновлённый ТИД на каждом круге
                            доработки вместе с исправленной редакцией.
                        </p>

                        {!tid ? (
                            <label
                                className={`flex h-10 w-fit cursor-pointer items-center gap-2 rounded-[10px] border px-[15px] text-[13px] font-semibold transition-colors ${
                                    tidMissing
                                        ? "border-[#e8b4b4] bg-[#fdf1f1] text-[#c0392b] hover:bg-[#fbe4e4]"
                                        : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                                }`}
                            >
                                <Paperclip size={14}/>
                                Загрузить ТИД
                                <input
                                    type="file"
                                    accept=".doc,.docx"
                                    className="hidden"
                                    onChange={handleTidChange}
                                />
                            </label>
                        ) : (
                            <div className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 py-[8px]">
                                <FileCheck2 size={14} className="flex-none text-[#2f9e5c]"/>
                                <span className="flex-1 truncate text-[12.5px] text-[#26324a]">{tid.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setTid(null)}
                                    className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        )}

                        {tidMissing && (
                            <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                                <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                                <span>Файл ТИД обязателен для отправки</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div
                    className="rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {/* Обернули кнопку и связанное с ней сообщение в flex flex-col items-center */}
            <div className="flex flex-col items-center gap-2">
                <Tooltip
                    content={disabledReason ?? ""}
                    disabled={canSubmit || !disabledReason}
                    side="top"
                >
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="hover:brightness-[1.06] cursor-pointer rounded-[10px] bg-[#4e57d6] px-5 py-[10px] text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {submitting
                            ? "Отправка…"
                            : agreesWithAllRemarks === false
                                ? "Отправить на финальную выдержку"
                                : "Отправить на повторное согласование"}
                    </button>
                </Tooltip>

                {!canSubmit && disabledReason && (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                        <AlertCircle size={12} className="flex-none"/>
                        {disabledReason}
                    </div>
                )}
            </div>

            <ConfirmActionModal
                open={pendingRemoval !== null}
                onClose={() => setPendingRemoval(null)}
                onConfirm={confirmPendingRemoval}
                variant="danger"
                icon={Trash2}
                title="Удалить документ?"
                message={
                    pendingRemoval?.kind === "doc"
                        ? `Документ «${pendingRemoval.label}» будет помечен на удаление — редакция останется без него. ` +
                          "Само удаление произойдёт при отправке на согласование, до этого можно отменить."
                        : `Вложение «${pendingRemoval?.label ?? ""}» будет помечено на удаление. ` +
                          "Само удаление произойдёт при отправке на согласование, до этого можно отменить."
                }
                confirmLabel="Удалить"
            />
        </div>
    );
}
