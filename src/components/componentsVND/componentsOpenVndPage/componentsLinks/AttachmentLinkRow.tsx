import type {VndAttachmentLinkItem} from "@/service/vndService/vndServiceType.ts";
import {useTranslation} from "react-i18next";
import {NO_EXPORT_VND_HINT, useCanExportVnd} from "@/hooks/vndHooks/useCanExportVnd.ts";
import {isPreviewableFile} from "@/utils/downloadFiles/fileNaming.ts";
import {Download, Eye, FileText, FileX, Loader2, Search} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {RedactionPill} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/RedactionPill.tsx";

export function AttachmentLinkRow({item, downloading, onPreview, onDownload, onShowInText}: {
    item: VndAttachmentLinkItem;
    downloading: boolean;
    onPreview: () => void;
    onDownload: () => void;
    onShowInText?: () => void;
}) {
    const {t} = useTranslation();
    const canExportVnd = useCanExportVnd();
    const previewable = item.resolved && isPreviewableFile(item.fileName);
    // Клик по строке - самое полезное действие: просмотр, если формат поддерживается, иначе скачать
    // (скачать - только с правом «Экспорт ВНД»).
    const handleRowClick = () => {
        if (!item.resolved) return;
        if (previewable) onPreview();
        else if (canExportVnd) onDownload();
    };

    return (
        <div
            className={`group/att w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                item.resolved ? "hover:bg-slate-50" : "opacity-70"
            }`}
        >
            <button
                type="button"
                onClick={handleRowClick}
                disabled={!item.resolved}
                className={`flex min-w-0 flex-1 items-center gap-3 text-left ${item.resolved ? "cursor-pointer" : "cursor-not-allowed"}`}
                title={item.resolved ? undefined : t("openVndPage.linksTab.attachmentNotFoundTooltip")}
            >
                <span className={`w-9 h-9 flex-none rounded-[9px] grid place-items-center ${
                    item.resolved ? "bg-[#f2f5f9] text-[#55617a]" : "bg-[#fdf1f1] text-[#e3a5a5]"
                }`}>
                    {item.resolved ? <FileText size={16} strokeWidth={1.8}/> : <FileX size={16} strokeWidth={1.8}/>}
                </span>
                <span className="flex-1 min-w-0">
                    <span className={`block text-[12.5px] font-medium truncate ${item.resolved ? "text-[#2c3446]" : "text-[#8b97ab]"}`}>
                        {item.fileName}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8b97ab]">
                        {item.redactionNumber !== undefined && (
                            <RedactionPill number={item.redactionNumber} lang={item.languages}
                                           current={!!item.isCurrentRedaction} code={item.redactionCode ?? ""}/>
                        )}
                        <span>
                            {t("openVndPage.linksTab.attachmentRefLabel", {index: item.legacyIndex})}
                            {!item.resolved && t("openVndPage.linksTab.attachmentRefNotFoundSuffix")}
                        </span>
                    </span>
                </span>
            </button>

            <div className="flex flex-none items-center gap-0.5">
                {onShowInText && (
                    <Tooltip content={t("openVndPage.linksTab.showAttachmentInTextTooltip")} side="top">
                        <button type="button" onClick={onShowInText}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                            <Search size={14} strokeWidth={2.2}/>
                        </button>
                    </Tooltip>
                )}
                {previewable && (
                    <Tooltip content={t("openVndPage.linksTab.previewAttachmentTooltip")} side="top">
                        <button type="button" onClick={onPreview}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                            <Eye size={15} strokeWidth={2}/>
                        </button>
                    </Tooltip>
                )}
                {item.resolved && (
                    <Tooltip content={canExportVnd ? t("openVndPage.linksTab.downloadAttachmentTooltip") : NO_EXPORT_VND_HINT} side="top">
                        <button type="button" onClick={onDownload} disabled={downloading || !canExportVnd}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6] disabled:opacity-50">
                            {downloading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} strokeWidth={2}/>}
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
