import {useRef, useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {
    ApprovalProcessResponse,
    ApprovalStageAttachmentResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {STAGE_DECISION_META} from "@/constants/coordinationParams.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {resolveVndDocTitle} from "@/utils/fileNaming.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {
    AlertCircle,
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
     * (RU/KG/EN), чтобы дать возможность заменить только нужные языки. */
    redaction: VndRedactionResponse | undefined;
    /** Требуется ли обязательно приложить ТИД вместе с исправленной редакцией — true, если
     * у ВНД уже была предыдущая редакция (см. VndRedactionResponse.number > 1 на родительской
     * странице). Для первой редакции нового ВНД ТИД не нужен. */
    requiresTid: boolean;
    /** Вызывается после успешной отправки (resubmit) или изменения матрицы, чтобы перезагрузить процесс */
    onChanged: () => Promise<void>;
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

/** Комментарии к простому согласованию ("approved") - не замечания, а просто
 * пояснения согласующего. Показываем отдельным блоком, и только если они есть. */
function collectApprovalComments(process: ApprovalProcessResponse): RemarkItem[] {
    return process.stages.flatMap((stage) => {
        const comments: RemarkItem[] = [];

        if (stage.primaryComment && stage.primaryDecision === "approved") {
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
        if (stage.repeatComment && stage.repeatDecision === "approved") {
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
        if (stage.finalHoldComment && stage.finalHoldDecision === "approved") {
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

const COMMENT_TRUNCATE_LENGTH = 260;

/** Карточка одного замечания/комментария - в духе StageCardView: обрезанный текст,
 * кнопка на полный просмотр (модалка) и список прикреплённых файлов. */
function RemarkCard({
                        item,
                        isRemark,
                        onOpenFull,
                    }: {
    item: RemarkItem;
    isRemark: boolean;
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
                isRemark ? "border-[#f0dcae] bg-[#fffcf5]" : "border-[#e9edf3] bg-white"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-[#1c2740]">{item.approverName}</span>
                <span className="text-[11px] font-medium text-[#8b97ab]">{item.phase}</span>
            </div>

            <div className="whitespace-pre-wrap text-[12.5px] leading-[1.55] text-[#3c424a]">
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

type DocLang = "ru" | "kg" | "en";

interface DocReplaceState {
    requiresReplace: boolean;
    file: File | null;
}

const EMPTY_DOC_STATE: DocReplaceState = {requiresReplace: false, file: null};

interface DocSlot {
    lang: DocLang;
    label: string;
    fileId: number;
    title: string;
}

/** Строка одного документа редакции с возможностью пометить "требует замены" и
 * загрузить новый файл на его место (в духе строки из "Данная редакция…:", но вместо
 * "Просмотр"/"Скачивание" — чекбокс "требует замены" и кнопка "Заменить"). */
function DocReplaceRow({slot, state, onToggle, onFileSelected, onClearFile}: {
    slot: DocSlot;
    state: DocReplaceState;
    onToggle: () => void;
    onFileSelected: (file: File) => void;
    onClearFile: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isUpdated = state.file !== null;

    return (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-[10px]">
            <FileText size={16} className="flex-none text-[#4e57d6]"/>

            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                    {slot.label}
                </span>
                <span className="truncate text-[13px] text-[#26324a]">
                    {isUpdated ? state.file!.name : slot.title}
                </span>
            </span>

            <span
                className={`flex-none inline-flex items-center gap-1 text-[11px] font-semibold ${
                    isUpdated ? "text-[#1e8e3e]" : "text-[#8b97ab]"
                }`}
            >
                {isUpdated && <CheckCircle2 size={12} className="flex-none"/>}
                {isUpdated ? "Обновлено" : "Не обновлено"}
            </span>

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

            <label className="flex-none flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#3a4560] select-none">
                <input
                    type="checkbox"
                    checked={state.requiresReplace}
                    onChange={onToggle}
                    className="h-[15px] w-[15px] cursor-pointer accent-[#4e57d6]"
                />
                требует замены
            </label>

            <button
                type="button"
                disabled={!state.requiresReplace}
                onClick={() => inputRef.current?.click()}
                className={`flex-none inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-[6px] text-[11.5px] font-semibold transition-colors ${
                    state.requiresReplace
                        ? "cursor-pointer border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc]"
                        : "cursor-not-allowed border-[#e5e9f0] bg-[#f3f4f7] text-[#b7bdc9]"
                }`}
            >
                <RefreshCcw size={13}/>
                Заменить
            </button>
            <input
                ref={inputRef}
                type="file"
                accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelected(file);
                    e.target.value = "";
                }}
            />
        </div>
    );
}

export function VndRevisionNeededPanel({vndId, vnd, process, redaction, requiresTid, onChanged}: VndRevisionNeededPanelProps) {
    const [docState, setDocState] = useState<Record<DocLang, DocReplaceState>>({
        ru: EMPTY_DOC_STATE,
        kg: EMPTY_DOC_STATE,
        en: EMPTY_DOC_STATE,
    });
    const [tid, setTid] = useState<File | null>(null);
    const [comment, setComment] = useState("");
    const [agreesWithAllRemarks, setAgreesWithAllRemarks] = useState<boolean | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openRemark, setOpenRemark] = useState<{item: RemarkItem; isRemark: boolean} | null>(null);

    const remarks = collectRemarks(process);
    const approvalComments = collectApprovalComments(process);
    const rows = process.disagreementMatrixRows;

    const docSlots: DocSlot[] = redaction
        ? [
            {lang: "ru", label: "Русский", fileId: redaction.docFileRuId, title: resolveVndDocTitle(vnd, "ru")},
            ...(redaction.docFileKgId !== null
                ? [{lang: "kg" as const, label: "Кыргызча", fileId: redaction.docFileKgId, title: resolveVndDocTitle(vnd, "kg")}]
                : []),
            ...(redaction.docFileEnId !== null
                ? [{lang: "en" as const, label: "English", fileId: redaction.docFileEnId, title: resolveVndDocTitle(vnd, "en")}]
                : []),
        ]
        : [];

    const hasAnyUpdatedDoc = Object.values(docState).some((s) => s.file !== null);

    const tidMissing = requiresTid && !tid;

    // Причина, по которой отправка сейчас заблокирована - показываем тултипом на кнопке
    let disabledReason: string | null = null;
    if (agreesWithAllRemarks === null) {
        disabledReason = "Сначала укажите, согласны ли вы со всеми замечаниями";
    } else if (agreesWithAllRemarks === true && !hasAnyUpdatedDoc) {
        disabledReason = "Отметьте хотя бы один документ как «требует замены» и загрузите обновлённый файл";
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
            return {...prev, [lang]: {requiresReplace: nextRequires, file: nextRequires ? cur.file : null}};
        });
    };

    const setDocFile = (lang: DocLang, file: File) => {
        setDocState((prev) => ({...prev, [lang]: {...prev[lang], file}}));
    };

    const clearDocFile = (lang: DocLang) => {
        setDocState((prev) => ({...prev, [lang]: {...prev[lang], file: null}}));
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
                tid: tid ?? undefined,
                comment: comment.trim() || undefined,
                agreesWithAllRemarks,
            });
            await onChanged();
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
            </div>

            {agreesWithAllRemarks === true && (
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                        Загрузить редакцию с исправленными замечаниями:
                    </div>

                    <div className="flex flex-col gap-2 px-5 py-4">
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
                                onToggle={() => toggleDocReplace(slot.lang)}
                                onFileSelected={(file) => setDocFile(slot.lang, file)}
                                onClearFile={() => clearDocFile(slot.lang)}
                            />
                        ))}

                        <label className="mt-2 block text-[12.5px] font-semibold text-[#26324a]">
                            Комментарий о внесённых исправлениях
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                className="mt-[6px] w-full resize-none rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] p-3 text-[13px] font-normal text-[#26324a] outline-none focus:border-[#4e57d6] focus:bg-white"
                            />
                        </label>
                    </div>
                </div>
            )}

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
        </div>
    );
}
