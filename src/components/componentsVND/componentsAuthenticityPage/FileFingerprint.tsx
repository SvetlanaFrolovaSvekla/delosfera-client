// Отпечаток проверяемого файла: имя, размер и SHA-256 с кнопкой «Скопировать».
import {useTranslation} from "react-i18next";
import type {VndAuthenticityCheckResponse} from "@/service/vndService/vndAuthenticityService.ts";
import {copyToClipboard, formatSize} from "@/utils/vndProcess/authenticityUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {BTN_SECONDARY, CARD} from "./styles/authenticityStyles.ts";
import {Copy, FileText} from "lucide-react";

/** Имя, размер и SHA-256 проверяемого файла. */
export function FileFingerprint({result}: { result: VndAuthenticityCheckResponse }) {
    const {t} = useTranslation();

    return (
        <div className={`${CARD} flex flex-wrap items-center gap-3 px-4 py-3`}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#f2f5f9] text-[#8b97ab]">
                <FileText className="h-4 w-4" strokeWidth={2}/>
            </span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-[#1c2740]">
                    {result.fileName} <span className="font-normal text-[#8b97ab]">· {formatSize(result.fileSize)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 break-all font-mono text-[11px] text-[#8b97ab]">
                    SHA-256: {result.fileSha256}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <HelpTooltip side="left" content={t("vndAuthenticity.fingerprintHelp")}/>
                <Tooltip content={t("vndAuthenticity.copy")}>
                    <button type="button" className={BTN_SECONDARY}
                            onClick={() => void copyToClipboard(result.fileSha256, t("vndAuthenticity.copied"))}>
                        <Copy className="h-3.5 w-3.5" strokeWidth={2}/>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
