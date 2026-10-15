// Комментарий о внесённых исправлениях и вложения к нему
// (лимиты по количеству и размеру файла).
import {useTranslation} from "react-i18next";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {MAX_RESOLUTION_ATTACHMENTS, MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES, MAX_RESOLUTION_COMMENT_LENGTH} from "@/constants/validation/coordinationValidatuon.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {CharCounter} from "@/components/componentsGeneral/CharCounter.tsx";
import {AlertCircle, Paperclip, Trash2} from "lucide-react";

interface RevisionCommentProps {
    comment: string;
    onCommentChange: (value: string) => void;
    commentAttachments: File[];
    commentAttachmentLimitReached: boolean;
    commentAttachmentCountLimitHit: boolean;
    oversizedCommentFileNames: string[];
    onAddFiles: (files: FileList | null) => void;
    onRemoveFile: (index: number) => void;
}

export function RevisionComment({
    comment, onCommentChange: setComment, commentAttachments, commentAttachmentLimitReached,
    commentAttachmentCountLimitHit, oversizedCommentFileNames,
    onAddFiles: handleAddCommentAttachments, onRemoveFile: removeCommentAttachment,
}: RevisionCommentProps) {
    const {t} = useTranslation();
    return (
        <>
            <div className="mt-3 mb-[6px] flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[#26324a]">
                    {t("coordinationUi.revision.commentTitle")}
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
                    {t("coordinationUi.revision.attachmentsCount", {count: commentAttachments.length, max: MAX_RESOLUTION_ATTACHMENTS})}
                    <HelpTooltip
                        content={t("coordinationUi.revision.commentFilesTip", {max: MAX_RESOLUTION_ATTACHMENTS, size: formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)})}
                        side="top"
                        className="h-5 w-5"
                    />
                </span>

                {commentAttachmentLimitReached ? (
                    <Tooltip
                        content={t("coordinationUi.revision.commentFilesMaxTip", {max: MAX_RESOLUTION_ATTACHMENTS})}
                        side="top"
                    >
                        <span className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] bg-[#f6f8fb] px-3 py-[6px] text-[11.5px] font-semibold text-[#b7bfcc]">
                            <Paperclip size={13}/>
                            {t("coordinationUi.revision.attachFile")}
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
                        {t("coordinationUi.revision.attachFile")}
                    </label>
                )}
            </div>

            {commentAttachmentCountLimitHit && (
                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                    <span>
                        {t("coordinationUi.revision.commentFilesPartial", {max: MAX_RESOLUTION_ATTACHMENTS})}
                    </span>
                </div>
            )}

            {oversizedCommentFileNames.length > 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                    <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                    <span>
                        {t("coordinationUi.revision.oversizedFiles", {
                            count: oversizedCommentFileNames.length,
                            names: oversizedCommentFileNames.join("», «"),
                            size: formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES),
                        })}
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
        </>
    );
}
