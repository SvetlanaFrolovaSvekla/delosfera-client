// Блок вложений панели резолюции: "Прикрепить файл", лимиты по количеству/размеру, список файлов.
// Состояние (файлы, ошибки лимитов, key у input) живёт в VndApproverResolutionPanel - здесь разметка.
import {useTranslation} from "react-i18next";
import {AlertCircle, Paperclip, X} from "lucide-react";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {
    MAX_RESOLUTION_ATTACHMENTS,
    MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES,
} from "@/constants/validation/coordinationValidatuon.ts";

interface ResolutionAttachmentsProps {
    files: File[];
    attachmentLimitReached: boolean;
    attachmentCountLimitHit: boolean;
    oversizedFileNames: string[];
    /** key для <input type="file"> - пересоздаём его после каждого выбора (см. родителя). */
    fileInputKey: number;
    onFilesPicked: (picked: FileList | null) => void;
    onRemoveFile: (index: number) => void;
}

export function ResolutionAttachments({
    files, attachmentLimitReached, attachmentCountLimitHit, oversizedFileNames, fileInputKey,
    onFilesPicked, onRemoveFile,
}: ResolutionAttachmentsProps) {
    const {t} = useTranslation();
    return (
            <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-0.5 text-[11.5px] text-[#8b97ab]">
                        {t("resolutionPanel.filesAdded", {count: files.length, max: MAX_RESOLUTION_ATTACHMENTS})}
                        <HelpTooltip
                            content={t("resolutionPanel.filesHelp", {max: MAX_RESOLUTION_ATTACHMENTS, size: formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES)})}
                            side="bottom"
                            className="h-5 w-5"
                        />
                    </span>

                    {/* Label вместо button+ref.click(): активация файлового диалога через нативную
                        связку <label>/<input> надёжнее программного .click() — не зависит от того,
                        сохраняется ли между кликами "доверенность" пользовательского жеста, и не
                        ломается на повторных открытиях диалога подряд. key у input пересобирает
                        его после каждого выбора (см. fileInputKey выше). */}
                    {attachmentLimitReached ? (
                        <Tooltip
                            content={t("resolutionPanel.filesLimitReached", {max: MAX_RESOLUTION_ATTACHMENTS})}
                            side="top"
                        >
                            <span
                                className="cursor-not-allowed inline-flex items-center gap-1.5 rounded-[8px] border border-[#e9edf3] bg-[#f6f8fb] px-3 py-[7px] text-[12.5px] font-semibold text-[#b7bfcc]"
                            >
                                <Paperclip size={14}/>
                                {t("resolutionPanel.attachFile")}
                            </span>
                        </Tooltip>
                    ) : (
                        <label
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] border border-[#d7dee8] bg-white px-3 py-[7px] text-[12.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                        >
                            <input
                                key={fileInputKey}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => onFilesPicked(e.target.files)}
                            />
                            <Paperclip size={14}/>
                            {t("resolutionPanel.attachFile")}
                        </label>
                    )}
                </div>

                {attachmentCountLimitHit && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>
                            {t("resolutionPanel.filesNotAdded", {max: MAX_RESOLUTION_ATTACHMENTS})}
                        </span>
                    </div>
                )}

                {oversizedFileNames.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#d62815]">
                        <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0"/>
                        <span>
                            {t(oversizedFileNames.length > 1 ? "resolutionPanel.oversizedMany" : "resolutionPanel.oversizedOne", {
                                names: oversizedFileNames.join("», «"),
                                size: formatFileSize(MAX_RESOLUTION_ATTACHMENT_SIZE_BYTES),
                            })}
                        </span>
                    </div>
                )}

                {files.length > 0 && (
                    <div className="mt-3 rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-3">
                        <div className="mb-2 text-[11.5px] font-semibold text-[#8b97ab]">
                            {t("resolutionPanel.yourFiles")}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-2 rounded-[8px] border border-[#e9edf3] bg-white px-3 py-[7px] text-[12px] text-[#3a4560]"
                                >
                                    <Paperclip size={13} className="flex-none text-[#8b97ab]"/>
                                    <Tooltip content={file.name} side="top" className="min-w-0 flex-1">
                                        <span className="block truncate">{file.name}</span>
                                    </Tooltip>
                                    <span className="flex-none text-[#8b97ab]">{formatFileSize(file.size)}</span>
                                    <Tooltip content={t("resolutionPanel.deleteFile")} side="top">
                                        <button
                                            type="button"
                                            onClick={() => onRemoveFile(index)}
                                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#c0392b]"
                                        >
                                            <X size={13}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
    );
}
