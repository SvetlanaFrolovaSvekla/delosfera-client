// Лента истории процесса согласования (вертикальная линия с точками) - список HistoryItem.
import {useTranslation} from "react-i18next";
import type {VndAuthenticityHistoryEntry} from "@/service/vndService/vndAuthenticityService.ts";
import {HistoryItem} from "./HistoryItem.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {CARD_TITLE} from "./styles/authenticityStyles.ts";
import {History} from "lucide-react";

export function HistoryTimeline({vndId, entries, locale}: {
    vndId: number; entries: VndAuthenticityHistoryEntry[]; locale: string;
}) {
    const {t} = useTranslation();
    if (entries.length === 0) return null;

    return (
        <div className="mt-5">
            <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#2d354a]" strokeWidth={2}/>
                <span className={CARD_TITLE}>{t("vndAuthenticity.historyTitle")}</span>
                <HelpTooltip side="right" content={t("vndAuthenticity.historyHelp")}/>
            </div>
            <ol className="m-0 mt-2.5 flex list-none flex-col gap-3 border-l-2 border-[#eef1f5] p-0 pl-5">
                {entries.map((entry, index) => (
                    <HistoryItem key={index} vndId={vndId} entry={entry} locale={locale}/>
                ))}
            </ol>
        </div>
    );
}
