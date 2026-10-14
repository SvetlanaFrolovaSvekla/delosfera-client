// Строка с хэшем (подпись: значение) и кнопкой "Скопировать" - используется в SignatureCard
import {useTranslation} from "react-i18next";
import {copyToClipboard} from "@/utils/vndProcess/authenticityUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {Copy} from "lucide-react";

export function HashLine({label, value}: { label: string; value: string }) {
    const {t} = useTranslation();
    return (
        <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex-none text-[10.5px] text-[#a3adbd]">{label}:</span>
            <span className="min-w-0 truncate font-mono text-[10.5px] text-[#8b97ab]" title={value}>{value}</span>
            <Tooltip content={t("vndAuthenticity.copy")}>
                <button type="button" onClick={() => void copyToClipboard(value, t("vndAuthenticity.copied"))}
                        className="grid h-5 w-5 flex-none cursor-pointer place-items-center rounded border-none bg-transparent text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a]">
                    <Copy className="h-3 w-3" strokeWidth={2}/>
                </button>
            </Tooltip>
        </div>
    );
}
