// Вложения редакции в панели "На доработке": существующие (с пометкой на удаление), новые и
// кнопка добавления с лимитом. Состояние и подтверждение удаления.
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {VND_REDACTION_MAX_ATTACHMENTS} from "@/constants/validation/vndValidation.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {AlertCircle, CheckCircle2, Paperclip, Trash2} from "lucide-react";
import {DOC_ACCEPT} from "./revisionDocs.ts";

interface RevisionRedactionAttachmentsProps {
    redaction: VndRedactionResponse | undefined;
    totalAttachmentCount: number;
    removedAttachmentIds: Set<number>;
    newAttachments: File[];
    attachmentLimitReached: boolean;
    attachmentCountLimitHit: boolean;
    /** Снять пометку на удаление у существующего вложения (без подтверждения) */
    onToggleRemoveExisting: (fileId: number) => void;
    /** Запросить удаление существующего вложения (через подтверждение) */
    onRequestRemoval: (value: {kind: "attachment"; fileId: number; label: string}) => void;
    onAddFiles: (files: FileList | null) => void;
    onRemoveNew: (index: number) => void;
}

export function RevisionRedactionAttachments({
    redaction, totalAttachmentCount, removedAttachmentIds, newAttachments, attachmentLimitReached,
    attachmentCountLimitHit,
    onToggleRemoveExisting: toggleRemoveExistingAttachment, onRequestRemoval: setPendingRemoval,
    onAddFiles: handleAddNewAttachments, onRemoveNew: removeNewAttachment,
}: RevisionRedactionAttachmentsProps) {
    const {t} = useTranslation();
    return (
        <div className="mt-3">
            <div className="mb-[6px] flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-[#26324a]">
                    {t("coordinationUi.revision.attachmentsTitle")} <span className="text-[#8b97ab] font-normal">{t("coordinationUi.revision.optional")}</span>
                </span>
                <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                    {t("coordinationUi.revision.attachmentsCount", {count: totalAttachmentCount, max: VND_REDACTION_MAX_ATTACHMENTS})}
                    <HelpTooltip
                        content={t("coordinationUi.revision.attachmentsLimitTip", {max: VND_REDACTION_MAX_ATTACHMENTS})}
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
                                    {willBeRemoved ? t("coordinationUi.revision.cancelRemoval") : t("coordinationUi.revision.delete")}
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
                                {t("coordinationUi.revision.added")}
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
                    content={t("coordinationUi.revision.attachmentsMaxTip", {max: VND_REDACTION_MAX_ATTACHMENTS})}
                    side="top"
                    className="mt-[6px] w-full"
                >
                    <span
                        className="flex h-[42px] w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#e5e9f0] bg-[#f6f8fb] text-[11.5px] text-[#b7bfcc]"
                    >
                        <Paperclip size={14}/>
                        {t("coordinationUi.revision.addFiles")}
                    </span>
                </Tooltip>
            ) : (
                <label
                    className="mt-[6px] flex h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[11.5px] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                >
                    <Paperclip size={14}/>
                    {t("coordinationUi.revision.addFiles")}
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
                        {t("coordinationUi.revision.attachmentsPartial", {max: VND_REDACTION_MAX_ATTACHMENTS})}
                    </span>
                </div>
            )}
        </div>
    );
}
