// Модалка со списком вложений выбранной редакции
import {useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {isPreviewableFile} from "@/utils/downloadFiles/fileNaming.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {TruncatedTooltip} from "@/components/componentsGeneral/TruncatedTooltip.tsx";
import {
    AttachmentDocxPreviewModal
} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {Download, Eye, FileText, Loader2, Paperclip, X} from "lucide-react";
import {useCanExportVnd, NO_EXPORT_VND_HINT} from "@/hooks/vndHooks/useCanExportVnd.ts";
import {approvalSheetCaption, getRedactionApprovalSheets} from "@/utils/vndProcess/approvalSheets.ts";
import {
    TitlePageRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionDocumentsPanel.tsx";

/** Специальные вложения открываются просмотрщиком (RedactionTidModal/RedactionApprovalSheetModal
 * из VndEditionsTab), а не просто скачиваются. Обычные вложения произвольного формата
 * в общем случае тоже не имеют предпросмотра — кроме .docx/.xlsx/.pptx,
 * для которых он доступен через AttachmentDocxPreviewModal. */
export type SpecialAttachmentTarget = "tid" | "approvalSheet" | "disagreementMatrix";

interface RedactionAttachmentsModalProps {
    vndId: number;
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    /** Открыть просмотр указанного специального вложения (ТИД/Лист согласования). */
    onView?: (target: SpecialAttachmentTarget) => void;
    onClose: () => void;
    /** Титульный лист сформирован/загружен/убран - перечитать редакции. */
    onTitlePageChanged?: (updated: VndRedactionResponse) => void;
}

interface SpecialAttachment {
    key: string;
    target: SpecialAttachmentTarget;
    fileId: number;
    label: string;
    fileName: string;
    /** Открывать просмотр прямо здесь (AttachmentDocxPreviewModal), а не через onView(target) -
     * для прежних листов согласования редакции: просмотрщик "approvalSheet" показывает
     * последний лист (approvalSheetFileId). */
    previewInline?: boolean;
}

export function RedactionAttachmentsModal({
                                              vndId,
                                              redaction,
                                              downloadingId,
                                              onDownload,
                                              onView,
                                              onClose,
                                              onTitlePageChanged,
                                          }: RedactionAttachmentsModalProps) {
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();
    const [previewAttachment, setPreviewAttachment] = useState<{ fileId: number; fileName: string } | null>(null);

    // "Специальные вложения" - служебные документы редакции, которые формируются автоматически
    // (или отдельно загружаются) в рамках процесса согласования/актуализации, а не добавляются
    // пользователем вручную, как обычные вложения ниже.
    const specialAttachments: SpecialAttachment[] = [
        ...(redaction.tidFileId !== null
            ? [{
                key: "tid",
                target: "tid" as const,
                fileId: redaction.tidFileId,
                label: t("redactionAttachmentsModal.tidLabel"),
                fileName: `${redaction.code}_ТИД.docx`,
            }]
            : []),
        // Все листы согласования редакции, от
        // нового к старому, с подписью "Актуализация без изменений · дата" и т.п.
        ...(() => {
            const sheets = [...getRedactionApprovalSheets(redaction)].reverse();
            return sheets.map((sheet) => ({
                key: `approvalSheet-${sheet.id}-${sheet.fileId}`,
                target: "approvalSheet" as const,
                fileId: sheet.fileId,
                label: sheets.length > 1
                    ? `${t("redactionAttachmentsModal.approvalSheetLabel")} — ${approvalSheetCaption(t, sheet)}`
                    : t("redactionAttachmentsModal.approvalSheetLabel"),
                fileName: sheet.fileName,
                previewInline: sheet.fileId !== redaction.approvalSheetFileId,
            }));
        })(),
        ...(redaction.disagreementMatrixFileId !== null
            ? [{
                key: "disagreementMatrix",
                target: "disagreementMatrix" as const,
                fileId: redaction.disagreementMatrixFileId,
                label: t("redactionAttachmentsModal.disagreementMatrixLabel"),
                fileName: `${redaction.code}_Матрица_разногласий.docx`,
            }]
            : []),
    ];

    if (previewAttachment) {
        return (
            <AttachmentDocxPreviewModal
                fileId={previewAttachment.fileId}
                fileName={previewAttachment.fileName}
                downloadingId={downloadingId}
                onDownload={onDownload}
                downloadDisabled={!canExportVnd}
                downloadDisabledHint={NO_EXPORT_VND_HINT}
                onClose={() => setPreviewAttachment(null)}
            />
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex max-h-[85vh] w-full max-w-[460px] flex-col rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none items-start justify-between gap-3 p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Paperclip size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            {/* Вложения редакции */}
                            {t("redactionAttachmentsModal.title", {code: redaction.code})}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-2">

                    {/* Специальные вложения показываются всегда: в них всегда есть строка "Титульный
                        лист" (даже несформированный - с кнопками "Сформировать"/"Загрузить"). */}
                    <div className="mb-4">
                            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {/* Специальные вложения */}
                                {t("redactionAttachmentsModal.specialAttachments")}
                            </div>
                            <div className="flex flex-col gap-2">
                                <TitlePageRow
                                    vndId={vndId}
                                    redaction={redaction}
                                    downloadingId={downloadingId}
                                    onDownload={onDownload}
                                    onPreview={(fileId, fileName) => setPreviewAttachment({fileId, fileName})}
                                    onChanged={onTitlePageChanged}
                                />
                                {specialAttachments.map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] pr-2 hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]"
                                    >
                                        <button
                                            type="button"
                                            disabled={!canExportVnd || downloadingId === item.fileId}
                                            title={canExportVnd ? undefined : NO_EXPORT_VND_HINT}
                                            onClick={() => onDownload(item.fileId, item.fileName)}
                                            className="cursor-pointer flex min-w-0 flex-1 items-center gap-2 px-3 py-[10px] text-left text-[13px] text-[#3a4560] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <FileText size={16} className="flex-none text-[#4e57d6]"/>
                                            <TruncatedTooltip text={item.label} className="flex-1"/>
                                            {downloadingId === item.fileId ? (
                                                <Loader2 size={14} className="flex-none animate-spin text-[#8b97ab]"/>
                                            ) : (
                                                <Download size={14} className="flex-none text-[#8b97ab]"/>
                                            )}
                                        </button>

                                        {(onView || item.previewInline) && (
                                            /* Просмотреть документ */
                                            <Tooltip content={t("redactionAttachmentsModal.viewDocumentTooltip")} side="top">
                                                <button
                                                    type="button"
                                                    onClick={() => item.previewInline
                                                        ? setPreviewAttachment({fileId: item.fileId, fileName: item.fileName})
                                                        : onView?.(item.target)}
                                                    className="cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white p-[6px] text-[#4e57d6] hover:bg-[#ececfc]"
                                                >
                                                    <Eye size={14}/>
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                ))}
                            </div>
                    </div>

                    {redaction.attachments.length > 0 && (
                        <div>
                            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {/* Вложения */}
                                {t("redactionAttachmentsModal.attachmentsCount", {count: redaction.attachments.length})}
                            </div>
                            <div className="flex flex-col gap-2">
                                {redaction.attachments.map((attachment) => (
                                    <div
                                        key={attachment.fileId}
                                        className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] pr-2 hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]"
                                    >
                                        <button
                                            type="button"
                                            disabled={!canExportVnd || downloadingId === attachment.fileId}
                                            title={canExportVnd ? undefined : NO_EXPORT_VND_HINT}
                                            onClick={() => onDownload(attachment.fileId, attachment.fileName)}
                                            className="cursor-pointer flex min-w-0 flex-1 items-center gap-2 px-3 py-[10px] text-left text-[13px] text-[#3a4560] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <Paperclip size={16} className="flex-none text-[#8b97ab]"/>
                                            <TruncatedTooltip text={attachment.fileName} className="flex-1"/>
                                            {downloadingId === attachment.fileId ? (
                                                <Loader2 size={14} className="flex-none animate-spin text-[#8b97ab]"/>
                                            ) : (
                                                <Download size={14} className="flex-none text-[#8b97ab]"/>
                                            )}
                                        </button>

                                        {isPreviewableFile(attachment.fileName) && (
                                            /* Просмотреть вложение */
                                            <Tooltip content={t("redactionAttachmentsModal.previewAttachment")} side="top">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewAttachment({fileId: attachment.fileId, fileName: attachment.fileName})}
                                                    className="cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white p-[6px] text-[#4e57d6] hover:bg-[#ececfc]"
                                                >
                                                    <Eye size={14}/>
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                <div className="flex flex-none justify-end p-6 pt-4">
                    <button
                        onClick={onClose}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                    >
                        {/* Закрыть */}
                        {t("redactionAttachmentsModal.close")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}