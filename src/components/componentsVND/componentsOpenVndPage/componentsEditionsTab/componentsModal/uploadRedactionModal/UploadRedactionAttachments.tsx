// Блок "Вложения" окна загрузки новой редакции: перенесённые из предыдущей редакции
// (можно убрать/вернуть) + новые файлы, с ограничением на общее количество
import {useTranslation} from "react-i18next";
import {Download, Paperclip, Trash2} from "lucide-react";
import type {VndRedactionAttachmentResponse} from "@/service/vndService/vndServiceType.ts";
import {VND_REDACTION_MAX_ATTACHMENTS} from "@/constants/validation/vndValidation.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {formatBytes, REDACTION_FILE_ACCEPT} from "@/utils/vndProcess/uploadRedactionFiles.ts";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

interface UploadRedactionAttachmentsProps {
    previousAttachments?: VndRedactionAttachmentResponse[];
    removedExistingIds: Set<number>;
    onToggleRemoveExisting: (fileId: number) => void;
    attachments: File[];
    onAdd: (files: FileList | null) => void;
    onRemove: (index: number) => void;
    totalCount: number;
    limitReached: boolean;
    /** Часть только что выбранных файлов не поместилась в лимит */
    countLimitHit: boolean;
}

/** Зона "Добавить файлы" - неактивна, когда лимит вложений исчерпан */
function AddFilesZone({limitReached, onAdd}: { limitReached: boolean; onAdd: (files: FileList | null) => void }) {
    const {t} = useTranslation();
    const content = (
        <span className="flex items-center gap-2 text-[11.5px]">
            <Paperclip size={15}/>
            {t("vndUploadRedactionModal.addFiles")}
        </span>
    );

    if (limitReached) {
        return (
            <Tooltip
                content={t("vndUploadRedactionModal.attachmentsMaxReachedTooltip", {max: VND_REDACTION_MAX_ATTACHMENTS})}
                side="top"
                className="w-full"
            >
                <span
                    className="flex h-[56px] w-full cursor-not-allowed flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#e5e9f0] bg-[#f6f8fb] text-[#b7bfcc]">
                    {content}
                </span>
            </Tooltip>
        );
    }

    return (
        <label
            htmlFor="redaction-attachments"
            className="flex h-[56px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
        >
            {content}
            <input
                id="redaction-attachments"
                type="file"
                multiple
                accept={REDACTION_FILE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                    onAdd(e.target.files);
                    e.target.value = ""; // сброс, чтобы можно было выбрать тот же файл повторно
                }}
            />
        </label>
    );
}

/** Вложение предыдущей редакции - перенесено по умолчанию, можно убрать/вернуть */
function PreviousAttachmentRow({attachment, willBeRemoved, onToggle}: {
    attachment: VndRedactionAttachmentResponse;
    willBeRemoved: boolean;
    onToggle: () => void;
}) {
    const {t} = useTranslation();
    return (
        <div
            className={`flex items-center gap-2 rounded-[9px] border px-3 py-[8px] ${
                willBeRemoved ? "border-[#f0c4c4] bg-[#fdf5f5]" : "border-[#e5e9f0] bg-white"
            }`}
        >
            <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
            <Tooltip content={attachment.fileName} side="top" className="min-w-0 flex-1">
                <span
                    className={`block truncate text-[12px] ${
                        willBeRemoved ? "text-[#c0392b] line-through" : "text-[#26324a]"
                    }`}
                >
                    {attachment.fileName}
                </span>
            </Tooltip>
            {!willBeRemoved && (
                <>
                    <span className="flex-none text-[10.5px] font-semibold text-[#8b97ab]">
                        {t("vndUploadRedactionModal.fromPreviousRedaction")}
                    </span>
                    <Tooltip content={t("vndUploadRedactionModal.download")} side="top">
                        <button
                            type="button"
                            onClick={() => downloadWithToast(attachment.fileId, attachment.fileName)}
                            className="cursor-pointer flex-none rounded-[7px] border border-[#e5e9f0] bg-white p-[6px] text-[#8b97ab] hover:border-[#4e57d6]/40 hover:text-[#4e57d6]"
                        >
                            <Download size={14}/>
                        </button>
                    </Tooltip>
                </>
            )}
            <button
                type="button"
                onClick={onToggle}
                className={`cursor-pointer flex-none rounded-[7px] border px-2.5 py-[5px] text-[11px] font-semibold transition-colors ${
                    willBeRemoved
                        ? "border-[#e0473e] bg-[#fdecec] text-[#c0392b]"
                        : "border-[#e5e9f0] bg-white text-[#8b97ab] hover:border-[#e0473e]/50 hover:text-[#c0392b]"
                }`}
            >
                {willBeRemoved ? t("vndUploadRedactionModal.cancelRemove") : t("vndUploadRedactionModal.remove")}
            </button>
        </div>
    );
}

export function UploadRedactionAttachments({
                                               previousAttachments, removedExistingIds, onToggleRemoveExisting,
                                               attachments, onAdd, onRemove,
                                               totalCount, limitReached, countLimitHit,
                                           }: UploadRedactionAttachmentsProps) {
    const {t} = useTranslation();
    const hasPrevious = !!previousAttachments && previousAttachments.length > 0;

    return (
        <div>
            <div className="mb-[6px] flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#26324a]">
                    {t("vndUploadRedactionModal.attachmentsLabel")}{" "}
                    <span className="text-[#8b97ab] font-normal">
                        {t("vndUploadRedactionModal.attachmentsOptionalHint")}
                    </span>
                </span>
                <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                    {t("vndUploadRedactionModal.attachmentsAddedCount", {
                        count: totalCount,
                        max: VND_REDACTION_MAX_ATTACHMENTS,
                    })}
                    <HelpTooltip
                        content={t("vndUploadRedactionModal.attachmentsLimitTooltip", {max: VND_REDACTION_MAX_ATTACHMENTS})}
                        side="top"
                        className="h-5 w-5"
                    />
                </span>
            </div>

            {/* Вложения предыдущей редакции. Передача существующих id (без повторной загрузки
                файла) исключает дублирование в БД и хранилище. */}
            {hasPrevious && (
                <>
                    <Clue className="mb-[6px]">{t("vndUploadRedactionModal.previousAttachmentsClue")}</Clue>
                    <div className="mb-[6px] flex flex-col gap-[6px]">
                        {previousAttachments.map((attachment) => (
                            <PreviousAttachmentRow
                                key={attachment.fileId}
                                attachment={attachment}
                                willBeRemoved={removedExistingIds.has(attachment.fileId)}
                                onToggle={() => onToggleRemoveExisting(attachment.fileId)}
                            />
                        ))}
                    </div>
                </>
            )}

            <AddFilesZone limitReached={limitReached} onAdd={onAdd}/>

            {countLimitHit && (
                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <span>
                        {t("vndUploadRedactionModal.attachmentsPartiallyAdded", {max: VND_REDACTION_MAX_ATTACHMENTS})}
                    </span>
                </div>
            )}

            {attachments.length > 0 && (
                <div className="mt-2 flex flex-col gap-[6px]">
                    {attachments.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-[8px]"
                        >
                            <Paperclip size={14} className="flex-none text-[#8b97ab]"/>
                            <Tooltip content={file.name} side="top" className="min-w-0 flex-1">
                                <span className="block truncate text-[12px] text-[#26324a]">{file.name}</span>
                            </Tooltip>
                            <span className="flex-none text-[11px] text-[#a3adbd]">{formatBytes(file.size, t)}</span>
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
