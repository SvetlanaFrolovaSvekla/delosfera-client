// История актуализаций: кто когда брал, кто выдавал доступ

import type { VndActualizationRecordResponse } from "@/service/vndService/vndServiceType";
import {useTranslation} from "react-i18next";
import type {VndActualizationRequestResponse} from "@/service/actualizationService/actualizationServiceTypes.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {CheckCircle2, Send, Undo2, XCircle, History} from "lucide-react";
import {formatDateTime} from "@/utils/dateUtils.ts";

export function ActualizationHistorySection({
                                         history, historyLoading, requests,
                                     }: {
    history: VndActualizationRecordResponse[];
    historyLoading: boolean;
    requests: VndActualizationRequestResponse[];
}) {
    const {t} = useTranslation();
    // Заявки, которые дошли до решения - интересны только они (Pending уже виден выше как плашка)
    const decidedRequests = requests.filter((r) => r.status !== "pending");

    if (historyLoading) {
        return (
            <div className="mt-5">
                <Loader label={t("openVndPage.actualizationTab.historyLoading")} fullHeight={false}/>
            </div>
        );
    }

    if (history.length === 0 && decidedRequests.length === 0) return null;

    return (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
            {/* Циклы актуализации */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <History size={15} strokeWidth={1.8} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.actualizationTab.historyTitle")}</span>
                </div>
                {history.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[12.5px] text-[#a3adbd]">
                        {t("openVndPage.actualizationTab.historyEmpty")}
                    </div>
                ) : (
                    <div className="px-5 py-1.5">
                        {history.map((r) => (
                            <div key={r.id} className="flex gap-[11px] py-3 border-t border-[#f3f6f9] first:border-t-0">
                                <span
                                    className={`mt-1.5 h-[7px] w-[7px] flex-none rounded-full ${
                                        r.isCompleted ? "bg-[#1c7a4d]" : "bg-[#9a6408]"
                                    }`}
                                />
                                <div className="min-w-0 text-[12.5px] leading-[1.5] text-[#26324a]">
                                    <div>
                                        <span className="font-semibold">{r.responsibleUserName}</span> {t("openVndPage.actualizationTab.tookIntoActualizationLabel")} {formatDateTime(r.startedAt)}
                                        {" "}({r.requiresApproval
                                        ? t("openVndPage.actualizationTab.withApprovalTag")
                                        : t("openVndPage.actualizationTab.withoutApprovalTag")})
                                    </div>
                                    {!r.performedAt ? (
                                        <div className="mt-0.5 text-[#9a6408]">
                                            {t("openVndPage.actualizationTab.performStepNotDoneHint")}
                                        </div>
                                    ) : (
                                        <div className="mt-0.5 text-[#8b97ab]">
                                            {t("openVndPage.actualizationTab.performedAtLabel", {date: formatDateTime(r.performedAt)})}
                                            {r.plannedNoChanges ? t("openVndPage.actualizationTab.plannedNoChangesSuffix") : ""}
                                        </div>
                                    )}
                                    {r.isCompleted ? (
                                        <div className="mt-0.5 text-[#8b97ab]">
                                            {t("openVndPage.actualizationTab.publishedAtLabel", {date: formatDateTime(r.publishedAt!)})}
                                            {r.hadChanges !== null && (r.hadChanges
                                                ? ` — ${t("openVndPage.actualizationTab.withChangesSuffix")}`
                                                : ` — ${t("openVndPage.actualizationTab.withoutChangesSuffix")}`)}
                                        </div>
                                    ) : (
                                        <div className="mt-0.5 text-[#9a6408]">{t("openVndPage.actualizationTab.cycleNotCompletedHint")}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Заявки на доступ к актуализации */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <Send size={15} strokeWidth={1.8} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.actualizationTab.requestsTitle")}</span>
                </div>
                {decidedRequests.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[12.5px] text-[#a3adbd]">
                        {t("openVndPage.actualizationTab.requestsEmpty")}
                    </div>
                ) : (
                    <div className="px-5 py-1.5">
                        {decidedRequests.map((r) => (
                            <div key={r.id} className="flex gap-[11px] py-3 border-t border-[#f3f6f9] first:border-t-0">
                                {r.status === "approved" ? (
                                    <CheckCircle2 size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-[#1c7a4d]"/>
                                ) : r.status === "revoked" ? (
                                    <Undo2 size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-[#8b97ab]"/>
                                ) : (
                                    <XCircle size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-[#c0392b]"/>
                                )}
                                <div className="min-w-0 text-[12.5px] leading-[1.5] text-[#26324a]">
                                    <div>
                                        <span className="font-semibold">{r.requestedByName}</span> {t("openVndPage.actualizationTab.requestedAccessLabel", {date: formatDateTime(r.createdAt)})}
                                    </div>
                                    <div className={`mt-0.5 ${
                                        r.status === "approved" ? "text-[#1c7a4d]"
                                            : r.status === "revoked" ? "text-[#8b97ab]"
                                                : "text-[#c0392b]"
                                    }`}>
                                        {r.status === "approved"
                                            ? t("openVndPage.actualizationTab.approvedLabel")
                                            : r.status === "revoked"
                                                ? t("openVndPage.actualizationTab.revokedLabel")
                                                : t("openVndPage.actualizationTab.rejectedLabel")}
                                        {r.status !== "revoked" && r.decidedByName ? ` — ${r.decidedByName}` : ""}
                                        {r.decidedAt ? `, ${formatDateTime(r.decidedAt)}` : ""}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
