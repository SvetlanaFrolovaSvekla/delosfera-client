// Модалка со списком вложений выбранной редакции
import {createPortal} from "react-dom";
import {Download, FileText, Loader2, Paperclip, X} from "lucide-react";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

/** Специальные вложения открываются просмотрщиком (RedactionTidModal/RedactionApprovalSheetModal
 * из VndEditionsTab), а не просто скачиваются - в отличие от обычных вложений произвольного
 * формата (см. ниже), для которых предпросмотра нет и не планируется. */
export type SpecialAttachmentTarget = "tid" | "approvalSheet" | "disagreementMatrix";

interface RedactionAttachmentsModalProps {
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    /** Открыть просмотр указанного специального вложения (ТИД/Лист согласования). Кнопка
     * "Просмотр" показывается только у специальных вложений - у обычных вложений произвольного
     * формата (см. redaction.attachments ниже) её нет и не будет: непонятно, чем и как их
     * показывать в браузере, поэтому там доступно только скачивание. */
    onView?: (target: SpecialAttachmentTarget) => void;
    onClose: () => void;
}

interface SpecialAttachment {
    key: string;
    target: SpecialAttachmentTarget;
    fileId: number;
    label: string;
    fileName: string;
}

export function RedactionAttachmentsModal({
                                              redaction,
                                              downloadingId,
                                              onDownload,
                                              onView,
                                              onClose,
                                          }: RedactionAttachmentsModalProps) {
    // "Специальные вложения" - служебные документы редакции, которые формируются автоматически
    // (или отдельно загружаются) в рамках процесса согласования/актуализации, а не добавляются
    // пользователем вручную, как обычные вложения ниже. Остаются частью редакции и после того,
    // как ВНД проходит консолидацию (см. VndActualizationService.PublishAsync на бэке - поля
    // TidFileId/ApprovalSheetFileId консолидацией не затрагиваются), поэтому должны быть видны
    // здесь и для уже действующих ВНД, а не только со страницы согласования.
    const specialAttachments: SpecialAttachment[] = [
        ...(redaction.tidFileId !== null
            ? [{
                key: "tid",
                target: "tid" as const,
                fileId: redaction.tidFileId,
                label: "ТИД (таблица изменений и дополнений)",
                fileName: `${redaction.code}_ТИД.docx`,
            }]
            : []),
        ...(redaction.approvalSheetFileId !== null
            ? [{
                key: "approvalSheet",
                target: "approvalSheet" as const,
                fileId: redaction.approvalSheetFileId,
                label: "Лист согласования",
                fileName: `${redaction.code}_Лист_согласования.docx`,
            }]
            : []),
        ...(redaction.disagreementMatrixFileId !== null
            ? [{
                key: "disagreementMatrix",
                target: "disagreementMatrix" as const,
                fileId: redaction.disagreementMatrixFileId,
                label: "Матрица разногласий",
                fileName: `${redaction.code}_Матрица_разногласий.docx`,
            }]
            : []),
    ];

    const hasAnyAttachments = specialAttachments.length > 0 || redaction.attachments.length > 0;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Paperclip size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Вложения редакции {redaction.code}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {specialAttachments.length > 0 && (
                    <div className="mb-4">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                            Специальные вложения
                        </div>
                        <div className="flex flex-col gap-2">
                            {specialAttachments.map((item) => (
                                <div
                                    key={item.key}
                                    className="flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] pr-2 hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]"
                                >
                                    <button
                                        type="button"
                                        disabled={downloadingId === item.fileId}
                                        onClick={() => onDownload(item.fileId, item.fileName)}
                                        className="cursor-pointer flex min-w-0 flex-1 items-center gap-2 px-3 py-[10px] text-left text-[13px] text-[#3a4560] disabled:opacity-60"
                                    >
                                        <FileText size={16} className="flex-none text-[#4e57d6]"/>
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {downloadingId === item.fileId ? (
                                            <Loader2 size={14} className="flex-none animate-spin text-[#8b97ab]"/>
                                        ) : (
                                            <Download size={14} className="flex-none text-[#8b97ab]"/>
                                        )}
                                    </button>

                                    {onView && (
                                        <button
                                            type="button"
                                            onClick={() => onView(item.target)}
                                            className="cursor-pointer flex-none rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                                        >
                                            Просмотр
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {redaction.attachments.length > 0 && (
                    <div>
                        {specialAttachments.length > 0 && (
                            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                Вложения ({redaction.attachments.length})
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            {redaction.attachments.map((attachment) => (
                                <button
                                    key={attachment.fileId}
                                    type="button"
                                    disabled={downloadingId === attachment.fileId}
                                    onClick={() => onDownload(attachment.fileId, attachment.fileName)}
                                    className="cursor-pointer flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-left text-[13px] text-[#3a4560] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb] disabled:opacity-60"
                                >
                                    <Paperclip size={16} className="flex-none text-[#8b97ab]"/>
                                    <span className="flex-1 truncate">{attachment.fileName}</span>
                                    {downloadingId === attachment.fileId ? (
                                        <Loader2 size={14} className="flex-none animate-spin text-[#8b97ab]"/>
                                    ) : (
                                        <Download size={14} className="flex-none text-[#8b97ab]"/>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!hasAnyAttachments && (
                    <div className="rounded-[10px] border border-dashed border-[#e5e9f0] px-3 py-[18px] text-center text-[12.5px] text-[#a3adbd]">
                        У этой редакции пока нет вложений
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}