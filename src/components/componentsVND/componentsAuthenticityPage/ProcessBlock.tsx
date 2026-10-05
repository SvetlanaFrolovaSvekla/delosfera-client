import {useTranslation} from "react-i18next";
import type {VndAuthenticityProcess} from "@/service/vndService/vndAuthenticityService.ts";
import {formatDateTime} from "@/utils/vndProcess/authenticityUtils.ts";
import {Pill} from "./Pill.tsx";
import {ApproverRow} from "./ApproverRow.tsx";
import {HistoryTimeline} from "./HistoryTimeline.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {CheckCircle2, Users} from "lucide-react";
import {CARD_TITLE} from "./styles/authenticityStyles.ts";

function useLocale() {
    const {i18n} = useTranslation();
    return i18n.language === "ky" ? "ky-KG" : i18n.language === "en" ? "en-GB" : "ru-RU";
}

export function ProcessBlock({vndId, process}: { vndId: number; process: VndAuthenticityProcess }) {
    const {t} = useTranslation();
    const locale = useLocale();
    const allSigned = process.approversTotal > 0 && process.signedUnderThisText === process.approversTotal;
    const percent = process.approversTotal > 0
        ? Math.round(process.signedUnderThisText / process.approversTotal * 100)
        : 0;

    return (
        <div className="rounded-[14px] border border-[#eef2f7] bg-[#fcfdfe] p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-[13.5px] font-semibold text-[#1c2740]">
                    {t("vndAuthenticity.process", {id: process.approvalProcessId})}
                </span>
                <Pill
                    tone={process.status === "approved" ? "good" : process.status === "rejected" || process.status === "cancelled" ? "warn" : "neutral"}>
                    {t(`vndAuthenticity.status.${process.status}`)}
                </Pill>
                <span className="text-[11.5px] text-[#8b97ab]">
                    {formatDateTime(process.startedAt, locale)}
                    {process.completedAt && ` — ${formatDateTime(process.completedAt, locale)}`}
                    {process.isNoChangesActualization && ` · ${t("vndAuthenticity.noChangesActualization")}`}
                </span>
            </div>

            {/* Сколько подписей под этим текстом */}
            <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
                    <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${allSigned ? "text-[#1c7a4d]" : "text-[#55617a]"}`}>
                        {allSigned && <CheckCircle2 className="h-4 w-4" strokeWidth={2}/>}
                        {t("vndAuthenticity.signedSummary", {
                            signed: process.signedUnderThisText,
                            total: process.approversTotal,
                        })}
                    </span>
                    <span className="font-mono text-[11px] text-[#a3adbd]">{percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
                    <div className={`h-full rounded-full ${allSigned ? "bg-[#1c9c5c]" : "bg-[#e0a43a]"}`}
                         style={{width: `${percent}%`}}/>
                </div>
            </div>

            {/* Согласующие */}
            <div className="mt-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2d354a]" strokeWidth={2}/>
                <span className={CARD_TITLE}>{t("vndAuthenticity.approversTitle")}</span>
                <HelpTooltip side="right" content={t("vndAuthenticity.signatureColumnHelp")}/>
            </div>
            <div className="mt-1.5 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
                    <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-[#8b97ab]">
                        <th className="py-2 pr-3 font-semibold">{t("vndAuthenticity.columns.approver")}</th>
                        <th className="py-2 pr-3 font-semibold">{t("vndAuthenticity.columns.decision")}</th>
                        <th className="py-2 pr-3 font-semibold">{t("vndAuthenticity.columns.date")}</th>
                        <th className="py-2 font-semibold">{t("vndAuthenticity.columns.signature")}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {process.approvers.map((approver, index) => (
                        <ApproverRow key={index} approver={approver} locale={locale}/>
                    ))}
                    </tbody>
                </table>
            </div>

            <HistoryTimeline vndId={vndId} entries={process.history} locale={locale}/>
        </div>
    );
}
