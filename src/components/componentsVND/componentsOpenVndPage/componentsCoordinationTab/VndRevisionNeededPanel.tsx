import {useState} from "react";
import {useTranslation} from "react-i18next";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {RemarksAgreement, type ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {MAX_RESOLUTION_ATTACHMENTS, MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES, STAGE_DECISION_META} from "@/constants/validation/coordinationValidatuon.ts";
import {VND_REDACTION_MAX_ATTACHMENTS} from "@/constants/validation/vndValidation.ts";
import {resolveVndDocTitle} from "@/utils/downloadFiles/fileNaming.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {generateDisagreementMatrixDocx} from "@/utils/docxWork/docxDisagreementMatrixExport.ts";
import {VndDisagreementMatrixSection, type DisagreementMatrixMode} from "./VndDisagreementMatrixSection.tsx";
import {CommentViewModal} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/CommentViewModal.tsx";
import type {FormattedCommentQuoteRef} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";
import {VndUploadTidModal} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/componentsModal/uploadTidModal/VndUploadTidModal.tsx";
import {
    collectApprovalComments, collectRemarks, getActiveRevisionPhase, type RemarkItem,
} from "./revisionPanel/revisionRemarks.ts";
import {
    EMPTY_DOC_STATE, MAX_FILE_SIZE, type DocLang, type DocSlot, type DocSlotState,
} from "./revisionPanel/revisionDocs.ts";
import {DocReplaceRow} from "./revisionPanel/DocReplaceRow.tsx";
import {RevisionRemarksGroups} from "./revisionPanel/RevisionRemarksGroups.tsx";
import {RevisionAgreementChoice} from "./revisionPanel/RevisionAgreementChoice.tsx";
import {RevisionRedactionAttachments} from "./revisionPanel/RevisionRedactionAttachments.tsx";
import {RevisionComment} from "./revisionPanel/RevisionComment.tsx";
import {RevisionTidSection} from "./revisionPanel/RevisionTidSection.tsx";
import {AttachmentDocxPreviewModal} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {AlertCircle, Trash2} from "lucide-react";

export type {DocLang};

interface VndRevisionNeededPanelProps {
    vndId: number;
    vnd: VndResponse;
    process: ApprovalProcessResponse;
    /** Редакция, вынесенная на согласование - берём отсюда текущие файлы документа
     * (RU/KG/EN) и вложения, чтобы дать возможность заменить/удалить только нужное. */
    redaction: VndRedactionResponse | undefined;
    /** Требуется ли обязательно приложить ТИД вместе с исправленной редакцией - true, если
     * у ВНД уже была предыдущая редакция (см. VndRedactionResponse.number > 1 на родительской
     * странице). Для первой редакции нового ВНД ТИД не нужен. */
    requiresTid: boolean;
    /** RU-файл действующей (актуальной) редакции ВНД - с ним автоматически сравнивается
     * исправленная редакция в окне формирования ТИД (VndUploadTidModal в режиме onAttach).
     * null - сравнивать не с чем (тогда таблица автосравнения просто недоступна). */
    tidPreviousFileId: number | null;
    /** "Разработчик" по умолчанию в сформированном ТИД и право его менять - те же правила, что и
     * при загрузке ТИД на вкладке "Редакции" (см. VndEditionsTab.canChangeTidDeveloper). */
    tidDefaultResponsibleUserId: number | null;
    tidDefaultResponsibleUserName: string | null;
    tidCanSelectResponsible: boolean;
    /** Вызывается после изменения матрицы разногласий (добавление/удаление строки),
     * чтобы перезагрузить процесс. */
    onChanged: () => Promise<void>;
    /** Вызывается после успешной отправки (resubmit). Родитель сам отвечает за перезагрузку
     * процесса/редакций (метка "Обновлено, дата" берётся из персистентных полей редакции,
     * которые придут со свежими данными) и всплывающее уведомление. */
    onResubmitted: () => Promise<void>;
    /** Кнопка-лупа "Показать в тексте" рядом с цитатой внутри модалки "См. замечания/комментарий
     * полностью" */
    onShowQuoteInText?: (quote: FormattedCommentQuoteRef) => void;
}

export function VndRevisionNeededPanel({
                                            vndId, vnd, process, redaction, requiresTid, onChanged, onResubmitted,
                                            onShowQuoteInText,
                                            tidPreviousFileId, tidDefaultResponsibleUserId,
                                            tidDefaultResponsibleUserName, tidCanSelectResponsible,
                                        }: VndRevisionNeededPanelProps) {
    const {t} = useTranslation();
    const [docState, setDocState] = useState<Record<DocLang, DocSlotState>>({
        ru: EMPTY_DOC_STATE,
        kg: EMPTY_DOC_STATE,
        en: EMPTY_DOC_STATE,
    });
    const [tid, setTid] = useState<File | null>(null);
    // Окно "Сформировать или загрузить ТИД" (то же, что при загрузке новой редакции на вкладке
    // "Редакции") - с автосравнением исправленной редакции с действующей.
    const [tidModalOpen, setTidModalOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [remarksAgreement, setRemarksAgreement] = useState<RemarksAgreement | null>(null);

    // Матрица разногласий - способ заполнения (сформировать построчно в системе / загрузить
    // готовый DOCX) и файл, если выбран режим загрузки. См. VndDisagreementMatrixSection.
    const [matrixMode, setMatrixMode] = useState<DisagreementMatrixMode>("generate");
    const [matrixFile, setMatrixFile] = useState<File | null>(null);
    const [matrixFileError, setMatrixFileError] = useState<string | null>(null);

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
    const [previewAttachment, setPreviewAttachment] = useState<{fileId: number; fileName: string} | null>(null);

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
    const activePhaseLabel = getActiveRevisionPhase(process);
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
                lang: "ru", label: t("vndEditLastRevisionModal.langRu"), fileId: redaction.docFileRuId, exists: true, deletable: false,
                title: resolveVndDocTitle(vnd, "ru"),
            },
            {
                lang: "kg", label: t("vndEditLastRevisionModal.langKg"), fileId: redaction.docFileKgId,
                exists: redaction.docFileKgId !== null, deletable: true,
                title: resolveVndDocTitle(vnd, "kg"),
            },
            {
                lang: "en", label: t("vndEditLastRevisionModal.langEn"), fileId: redaction.docFileEnId,
                exists: redaction.docFileEnId !== null, deletable: true,
                title: resolveVndDocTitle(vnd, "en"),
            },
        ]
        : [];

    const hasAnyDocChange = Object.values(docState).some((s) => s.file !== null || s.remove);

    // attachments, а не устаревший attachmentFileIds: бэкенд заполняет оба поля из одного и того же
    // списка вложений редакции (VndService, маппинг VndRedactionResponse), так что набор id тот же.
    const existingAttachmentIds = (redaction?.attachments ?? [])
        .map((a) => a.fileId)
        .filter((id) => !removedAttachmentIds.has(id));
    const totalAttachmentCount = existingAttachmentIds.length + newAttachments.length;
    const attachmentSlotsLeft = VND_REDACTION_MAX_ATTACHMENTS - totalAttachmentCount;
    const attachmentLimitReached = attachmentSlotsLeft <= 0;
    const hasAnyAttachmentChange = newAttachments.length > 0 || removedAttachmentIds.size > 0;

    const tidMissing = requiresTid && !tid;

    // Причина, по которой отправка сейчас заблокирована - показываем тултипом на кнопке
    let disabledReason: string | null = null;
    if (remarksAgreement === null) {
        disabledReason = t("coordinationUi.revision.reasonAnswerFirst");
    } else if (
        remarksAgreement === RemarksAgreement.FullyAgree
        && !hasAnyDocChange && !hasAnyAttachmentChange
    ) {
        disabledReason = t("coordinationUi.revision.reasonChangeDoc");
    } else if (
        remarksAgreement !== RemarksAgreement.FullyAgree && matrixMode === "generate" && rows.length === 0
    ) {
        disabledReason = t("coordinationUi.revision.reasonAddMatrixRow");
    } else if (
        remarksAgreement !== RemarksAgreement.FullyAgree && matrixMode === "upload" && !matrixFile
    ) {
        disabledReason = t("coordinationUi.revision.reasonUploadMatrix");
    } else if (tidMissing) {
        disabledReason = t("coordinationUi.revision.reasonTid");
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

    const handleUpdateRow = async (rowId: number, row: {
        developerPosition: string;
        opponentPosition: string;
        developerJustification?: string;
    }) => {
        await coordinationService.updateDisagreementRow(vndId, rowId, row);
        await onChanged();
    };

    const handleDeleteRow = async (rowId: number) => {
        await coordinationService.deleteDisagreementRow(vndId, rowId);
        await onChanged();
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
            setError(t("coordinationUi.revision.fileTooLarge", {name: file.name, size: formatFileSize(MAX_FILE_SIZE)}));
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
            setError(t("coordinationUi.revision.fileTooLarge", {name: oversized.name, size: formatFileSize(MAX_FILE_SIZE)}));
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
        if (!canSubmit || remarksAgreement === null) return;
        setSubmitting(true);
        setError(null);
        try {
            // Матрица разногласий - если инициатор не согласен со всеми замечаниями (частично
            // или полностью), к отправке прикладывается итоговый файл: либо уже загруженный
            // готовый DOCX, либо сформированный прямо сейчас по строкам, набранным в таблице.
            let disagreementMatrix: File | undefined;
            if (remarksAgreement !== RemarksAgreement.FullyAgree) {
                if (matrixMode === "upload") {
                    disagreementMatrix = matrixFile ?? undefined;
                } else {
                    const blob = await generateDisagreementMatrixDocx(
                        rows.map((row, index) => ({
                            number: index + 1,
                            developerPositionHtml: row.developerPosition,
                            opponentPositionHtml: row.opponentPosition,
                            developerJustificationHtml: row.developerJustification ?? "",
                        })),
                        vnd.titleRu,
                    );
                    disagreementMatrix = new File(
                        [blob], `Матрица разногласий_${redaction?.code ?? vndId}.docx`, {type: blob.type},
                    );
                }
            }

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
                remarksAgreement,
                disagreementMatrix,
            });
            await onResubmitted();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("coordinationUi.revision.submitFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-6 space-y-5">
            <RevisionRemarksGroups
                remarks={remarks}
                resolvedRemarks={resolvedRemarks}
                approvalComments={approvalComments}
                onOpenRemark={setOpenRemark}
                onOpenAttachment={setPreviewAttachment}
            />

            {openRemark && (
                <CommentViewModal
                    isComment={!openRemark.isRemark}
                    title={openRemark.isRemark ? t("coordinationUi.revision.viewFullRemarks") : t("coordinationUi.revision.viewFullComment")}
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
                    quotes={openRemark.item.quotes}
                    onShowInText={onShowQuoteInText}
                />
            )}

            {/* Единый блок: вопрос "согласны ли" + (при "Нет") матрица разногласий сразу внутри него */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="border-b border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                    {t("coordinationUi.revision.agreeQuestion")}
                </div>
                <div className="px-5 py-4">
                    <RevisionAgreementChoice
                        remarksAgreement={remarksAgreement}
                        onChange={setRemarksAgreement}
                    />
                </div>

                {/* Раньше это была отдельная карточка ниже - визуально "отваливалась" от блока
                    с вопросом "Согласны ли вы...", тогда как матрица разногласий (ветка "Нет"
                    выше) остаётся внутри той же карточки. Встраиваем сюда же для единообразия -
                    один блок продолжается заголовком с border-t вместо новой карточки. */}
                {(remarksAgreement === RemarksAgreement.FullyAgree
                    || remarksAgreement === RemarksAgreement.PartiallyAgree) && (
                    <>
                    <div className="border-t border-[#eef2f7] px-5 py-[13px] text-[13.5px] font-bold text-[#1c2740]">
                        {t("coordinationUi.revision.uploadTitle")}
                    </div>

                    <div className="flex flex-col gap-2 px-5 py-4">
                        <div className="mb-1 rounded-[10px] border border-[#e5e9f0] bg-[#f9fafc] px-3 py-[10px] text-[11.5px] leading-[1.5] text-[#8b97ab]">
                            {t("coordinationUi.revision.formatNote", {size: formatFileSize(MAX_FILE_SIZE)})}
                        </div>
                        {docSlots.length === 0 && (
                            <div className="text-[12.5px] text-[#8b97ab]">
                                {t("coordinationUi.revision.docsLoadFailed")}
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
                        <RevisionRedactionAttachments
                            redaction={redaction}
                            totalAttachmentCount={totalAttachmentCount}
                            removedAttachmentIds={removedAttachmentIds}
                            newAttachments={newAttachments}
                            attachmentLimitReached={attachmentLimitReached}
                            attachmentCountLimitHit={attachmentCountLimitHit}
                            onToggleRemoveExisting={toggleRemoveExistingAttachment}
                            onRequestRemoval={setPendingRemoval}
                            onAddFiles={handleAddNewAttachments}
                            onRemoveNew={removeNewAttachment}
                        />

                        <RevisionComment
                            comment={comment}
                            onCommentChange={setComment}
                            commentAttachments={commentAttachments}
                            commentAttachmentLimitReached={commentAttachmentLimitReached}
                            commentAttachmentCountLimitHit={commentAttachmentCountLimitHit}
                            oversizedCommentFileNames={oversizedCommentFileNames}
                            onAddFiles={handleAddCommentAttachments}
                            onRemoveFile={removeCommentAttachment}
                        />
                    </div>
                    </>
                )}

                {remarksAgreement !== null && remarksAgreement !== RemarksAgreement.FullyAgree && (
                    <VndDisagreementMatrixSection
                        mode={matrixMode}
                        onModeChange={setMatrixMode}
                        rows={rows}
                        onAddRow={handleAddRow}
                        onUpdateRow={handleUpdateRow}
                        onDeleteRow={handleDeleteRow}
                        uploadedFile={matrixFile}
                        onUploadedFileChange={setMatrixFile}
                        fileError={matrixFileError}
                        onFileError={setMatrixFileError}
                        vndTitle={vnd.titleRu}
                        exportFileName={`Матрица разногласий_${redaction?.code ?? vndId}.docx`}
                    />
                )}
            </div>

            {requiresTid && (
                <RevisionTidSection
                    tid={tid}
                    tidMissing={tidMissing}
                    onTidChange={setTid}
                    onOpenTidModal={setTidModalOpen}
                />
            )}

            {error && (
                <div
                    className="rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[12.5px] text-[#c0392b]">
                    {error}
                </div>
            )}

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
                            ? t("coordinationUi.revision.sending")
                            : remarksAgreement === RemarksAgreement.FullyAgree
                                ? t("coordinationUi.revision.sendRepeat")
                                : t("coordinationUi.revision.sendFinalHold")}
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
                title={t("coordinationUi.revision.removeDocTitle")}
                message={
                    pendingRemoval?.kind === "doc"
                        ? t("coordinationUi.revision.removeDocMessage", {label: pendingRemoval.label})
                        : t("coordinationUi.revision.removeAttachmentMessage", {label: pendingRemoval?.label ?? ""})
                }
                confirmLabel={t("coordinationUi.revision.delete")}
            />

            {/* Сформировать или загрузить ТИД */}
            {tidModalOpen && (
                <VndUploadTidModal
                    vndId={vndId}
                    redactionCode={redaction?.code ?? String(vndId)}
                    vndTitle={vnd.titleRu}
                    previousFileId={tidPreviousFileId}
                    draftFileId={redaction?.docFileRuId ?? null}
                    draftFile={docState.ru.file}
                    defaultResponsibleUserId={tidDefaultResponsibleUserId}
                    defaultResponsibleUserName={tidDefaultResponsibleUserName}
                    canSelectResponsible={tidCanSelectResponsible}
                    canUploadWithoutApproval={false}
                    initialFile={tid}
                    onClose={() => setTidModalOpen(false)}
                    onAttach={(file) => {
                        setTid(file);
                        setTidModalOpen(false);
                    }}
                />
            )}

            {previewAttachment && (
                <AttachmentDocxPreviewModal
                    fileId={previewAttachment.fileId}
                    fileName={previewAttachment.fileName}
                    downloadingId={null}
                    onDownload={downloadWithToast}
                    onClose={() => setPreviewAttachment(null)}
                />
            )}
        </div>
    );
}

