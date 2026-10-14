// История актуализаций: кто когда брал, кто выдавал доступ
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type { VndActualizationRecordResponse } from "@/service/vndService/vndServiceType";
import type {VndActualizationRequestResponse} from "@/service/actualizationService/actualizationServiceTypes.ts";
import {formatDateTime, parseDDMMYYYY} from "@/utils/dateUtils.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {CheckCircle2, Send, Undo2, XCircle, History, Search, X} from "lucide-react";

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

    // Поиск и фильтр по периоду для «Истории актуализаций» (как в «Журнале аудита» на вкладке «История»)
    const [query, setQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const terms = useMemo(() => splitSearchTerms(query), [query]);
    const fromDate = useMemo(() => parseDDMMYYYY(dateFrom), [dateFrom]);
    const toDate = useMemo(() => {
        const d = parseDDMMYYYY(dateTo);
        // "По" включительно: до конца выбранного дня
        return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) : null;
    }, [dateTo]);

    const filteredHistory = useMemo(() => history.filter((r) => {
        // Период: цикл попадает, если в него входит хоть одна из его дат (взят / выполнен / опубликован)
        if (fromDate || toDate) {
            const dates = [r.startedAt, r.performedAt, r.publishedAt]
                .filter((d): d is string => !!d)
                .map((d) => new Date(d));
            const inRange = dates.some((d) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate));
            if (!inRange) return false;
        }
        if (terms.length > 0) {
            // Ищем по сотруднику и по датам в том виде, в каком они показаны ("06.10.2026, 10:39")
            const haystack = [
                r.responsibleUserName,
                formatDateTime(r.startedAt),
                r.performedAt ? formatDateTime(r.performedAt) : "",
                r.publishedAt ? formatDateTime(r.publishedAt) : "",
            ].join("\n").toLowerCase();
            if (!terms.every((term) => haystack.includes(term))) return false;
        }
        return true;
    }), [history, fromDate, toDate, terms]);

    const hasFilters = query.trim() !== "" || dateFrom !== "" || dateTo !== "";
    const resetFilters = () => {
        setQuery("");
        setDateFrom("");
        setDateTo("");
    };

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
                    <>
                    {/* Поиск по сотруднику/дате и период */}
                    <div className="flex flex-col gap-2.5 border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3">
                        <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a3adbd]"/>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t("openVndPage.actualizationTab.historySearchPlaceholder")}
                                aria-label={t("openVndPage.actualizationTab.historySearchPlaceholder")}
                                className="h-[36px] w-full box-border rounded-[8px] border border-[#e5e9f0] bg-white pl-8 pr-8 text-[12.5px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                            />
                            {query !== "" && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <Tooltip content={t("openVndPage.historyTab.auditSearchClear")} side="top">
                                        <button type="button" onClick={() => setQuery("")}
                                                aria-label={t("openVndPage.historyTab.auditSearchClear")}
                                                className="cursor-pointer grid h-5 w-5 place-items-center rounded-full text-[#a3adbd] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                                            <X size={13}/>
                                        </button>
                                    </Tooltip>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <label className="flex min-w-0 flex-col gap-1">
                                <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                    {t("openVndPage.historyTab.auditDateFrom")}
                                </span>
                                <DatePickerInput value={dateFrom} onChange={setDateFrom} modal/>
                            </label>
                            <label className="flex min-w-0 flex-col gap-1">
                                <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                    {t("openVndPage.historyTab.auditDateTo")}
                                </span>
                                <DatePickerInput value={dateTo} onChange={setDateTo} modal/>
                            </label>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-[11.5px] text-[#8b97ab]">
                            <span>{t("openVndPage.historyTab.auditShown", {shown: filteredHistory.length, total: history.length})}</span>
                            {hasFilters && (
                                <button type="button" onClick={resetFilters}
                                        className="cursor-pointer font-semibold text-[#4e57d6] hover:underline">
                                    {t("openVndPage.historyTab.auditReset")}
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                        <div className="px-5 py-6 text-center text-[12.5px] text-[#a3adbd]">
                            {t("openVndPage.historyTab.auditNoResults")}
                        </div>
                    ) : (
                    <div className="px-5 py-1.5">
                        {filteredHistory.map((r) => (
                            <div key={r.id} className="flex gap-[11px] py-3 border-t border-[#f3f6f9] first:border-t-0">
                                <span
                                    className={`mt-1.5 h-[7px] w-[7px] flex-none rounded-full ${
                                        r.isCompleted ? "bg-[#1c7a4d]" : "bg-[#9a6408]"
                                    }`}
                                />
                                <div className="min-w-0 text-[12.5px] leading-[1.5] text-[#26324a]">
                                    <div>
                                        <span className="font-semibold"><HighlightSubstrings text={r.responsibleUserName} terms={terms}/></span> {t("openVndPage.actualizationTab.tookIntoActualizationLabel")} <HighlightSubstrings text={formatDateTime(r.startedAt)} terms={terms}/>
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
                    </>
                )}
            </div>

            {/* Заявки на доступ к актуализации */}
            <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                <div className="flex items-center gap-2.5 border-b border-[#eef2f7] px-5 py-[13px]">
                    <Send size={15} strokeWidth={1.8} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[13.5px] font-bold text-[#1c2740]">{t("openVndPage.actualizationTab.requestsTitle")}</span>
                </div>
                {decidedRequests.length === 0 ? (
                    <EmptyState
                        embedded
                        icon={Send}
                        title={t("openVndPage.actualizationTab.requestsEmpty")}
                        description={t("openVndPage.actualizationTab.requestsEmptyDescription")}
                    />
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
