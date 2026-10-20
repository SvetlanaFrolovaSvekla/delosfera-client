// Панель "Журнал аудита" на вкладке «История» ВНД: поиск по тексту записей с подсветкой
// совпадений, фильтры по периоду (с/по) и по типу события. Цвет точки у записи - тип события
// (см. auditEventKinds), расшифровка - белая подсказка у "?" рядом с заголовком.
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {CircleHelp, Search, Shield, X} from "lucide-react";

import type {ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";
import {formatDateTime, parseDDMMYYYY} from "@/utils/dateUtils.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {LightTooltip} from "@/components/componentsGeneral/tooltips/LightTooltip.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {
    AUDIT_KINDS, getAuditKind, type AuditKindKey, type AuditKindMeta,
} from "@/components/componentsVND/componentsOpenVndPage/componentsHistoryTab/auditEventKinds.ts";

interface AuditLogPanelProps {
    entries: ActivityLogEntryResponse[];
    /** Классы размера панели (общие с соседней панелью «Редакции и юридическая значимость») */
    className: string;
}

function KindDot({kind, size = 7}: { kind: AuditKindMeta; size?: number }) {
    return <span className="block flex-none rounded-full" style={{width: size, height: size, background: kind.color}}/>;
}

/** Белая подсказка у "?": что означает каждый цвет точки - и сразу фильтр. Клик по типу
 * включает/выключает его (как чипсы ниже), рядом - сколько таких записей в журнале. */
function KindLegend({counts, selected, onToggle, onReset}: {
    counts: Map<AuditKindKey, number>;
    selected: AuditKindKey[];
    onToggle: (key: AuditKindKey) => void;
    onReset: () => void;
}) {
    const {t} = useTranslation();
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-[13px] font-bold text-[#1c2740]">{t("openVndPage.historyTab.auditLegendTitle")}</span>
                {selected.length > 0 && (
                    <button type="button" onClick={onReset}
                            className="cursor-pointer text-[11.5px] font-semibold text-[#4e57d6] hover:underline">
                        {t("openVndPage.historyTab.auditLegendShowAll")}
                    </button>
                )}
            </div>
            <div className="mb-2.5 text-[11.5px] text-[#8b97ab]">{t("openVndPage.historyTab.auditLegendHint")}</div>
            <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2">
                {AUDIT_KINDS.map((kind) => {
                    const count = counts.get(kind.key) ?? 0;
                    const active = selected.includes(kind.key);
                    return (
                        <li key={kind.key}>
                            <button type="button" disabled={count === 0} aria-pressed={active}
                                    onClick={() => onToggle(kind.key)}
                                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-[9px] border px-2.5 py-2 text-left transition-colors disabled:cursor-default disabled:opacity-45 ${
                                        active
                                            ? "border-[#4e57d6]/50 bg-[#f1f1fd]"
                                            : "border-transparent hover:border-[#e5e9f0] hover:bg-[#f6f8fb] disabled:hover:border-transparent disabled:hover:bg-transparent"
                                    }`}>
                                <span className="mt-[5px]"><KindDot kind={kind} size={9}/></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 font-semibold text-[#26324a]">
                                        <span className="min-w-0">{t(`openVndPage.historyTab.auditKinds.${kind.key}.label`)}</span>
                                        <span className={`ml-auto flex-none rounded-full px-1.5 text-[10.5px] font-bold ${
                                            active ? "bg-[#4e57d6] text-white" : "bg-[#eef1f5] text-[#6b7891]"
                                        }`}>{count}</span>
                                    </span>
                                    <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-[#6b7891]">
                                        {t(`openVndPage.historyTab.auditKinds.${kind.key}.description`)}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function AuditLogPanel({entries, className}: AuditLogPanelProps) {
    const {t} = useTranslation();

    const [query, setQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [types, setTypes] = useState<AuditKindKey[]>([]);
    const listRef = useRef<HTMLDivElement>(null);

    const terms = useMemo(() => splitSearchTerms(query), [query]);
    const fromDate = useMemo(() => parseDDMMYYYY(dateFrom), [dateFrom]);
    const toDate = useMemo(() => {
        const d = parseDDMMYYYY(dateTo);
        // "По" включительно: до конца выбранного дня
        return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) : null;
    }, [dateTo]);

    // В фильтре показываем только те типы, которые реально есть в журнале этого ВНД
    const availableTypes = useMemo(() => {
        const present = new Set(entries.map((e) => getAuditKind(e).key));
        return AUDIT_KINDS.filter((kind) => present.has(kind.key));
    }, [entries]);

    // Сколько записей каждого типа - для легенды-фильтра
    const kindCounts = useMemo(() => {
        const counts = new Map<AuditKindKey, number>();
        for (const e of entries) {
            const key = getAuditKind(e).key;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return counts;
    }, [entries]);

    const filtered = useMemo(() => entries.filter((e) => {
        const created = new Date(e.createdAt);
        if (fromDate && created < fromDate) return false;
        if (toDate && created > toDate) return false;
        if (types.length > 0 && !types.includes(getAuditKind(e).key)) return false;
        if (terms.length > 0) {
            // Ищем и по тексту, и по дате в том виде, в каком она показана ("07.10.2026, 17:40")
            const haystack = `${e.text}\n${formatDateTime(e.createdAt)}`.toLowerCase();
            if (!terms.every((term) => haystack.includes(term))) return false;
        }
        return true;
    }), [entries, fromDate, toDate, types, terms]);

    const hasFilters = query.trim() !== "" || dateFrom !== "" || dateTo !== "" || types.length > 0;

    // Фильтр поменяли - возвращаемся к началу списка
    useEffect(() => {
        listRef.current?.scrollTo({top: 0});
    }, [query, dateFrom, dateTo, types]);

    const toggleType = (type: AuditKindKey) =>
        setTypes((prev) => prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]);

    const reset = () => {
        setQuery("");
        setDateFrom("");
        setDateTo("");
        setTypes([]);
    };

    return (
        <div className={`${className} bg-white border border-[#e9edf3] rounded-2xl overflow-hidden flex flex-col`}>
            <div className="flex-none px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                <Shield size={17} strokeWidth={1.8} className="text-[#8b97ab]"/>
                <h2 className="m-0 text-sm font-semibold">{t("openVndPage.historyTab.auditLogTitle")}</h2>
                {/* Что означают цвета точек - белая подсказка-легенда */}
                <LightTooltip width={Math.min(600, window.innerWidth - 16)} content={
                    <KindLegend counts={kindCounts} selected={types}
                                onToggle={toggleType} onReset={() => setTypes([])}/>
                }>
                    <button type="button" aria-label={t("openVndPage.historyTab.auditLegendTitle")}
                            className="cursor-help grid h-5 w-5 place-items-center rounded-full text-[#a3adbd] hover:bg-[#ececfc] hover:text-[#4e57d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cbddff]">
                        <CircleHelp size={15} strokeWidth={2}/>
                    </button>
                </LightTooltip>
                <span className="ml-auto text-[11px] text-[#a3adbd]">{t("openVndPage.historyTab.auditLogSubtitle")}</span>
            </div>

            {/* Поиск и фильтры - не прокручиваются вместе со списком */}
            {entries.length > 0 && (
                <div className="flex-none flex flex-col gap-2.5 border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-3">
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a3adbd]"/>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("openVndPage.historyTab.auditSearchPlaceholder")}
                            aria-label={t("openVndPage.historyTab.auditSearchPlaceholder")}
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

                    {availableTypes.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {availableTypes.map((kind) => {
                                const active = types.includes(kind.key);
                                return (
                                    <button key={kind.key} type="button" onClick={() => toggleType(kind.key)} aria-pressed={active}
                                            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold transition-colors ${
                                                active
                                                    ? "border-[#4e57d6] bg-[#ececfc] text-[#4e57d6]"
                                                    : "border-[#e5e9f0] bg-white text-[#55617a] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]"
                                            }`}>
                                        <KindDot kind={kind}/>
                                        {t(`openVndPage.historyTab.auditKinds.${kind.key}.label`)}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 text-[11.5px] text-[#8b97ab]">
                        <span>{t("openVndPage.historyTab.auditShown", {shown: filtered.length, total: entries.length})}</span>
                        {hasFilters && (
                            <button type="button" onClick={reset}
                                    className="cursor-pointer font-semibold text-[#4e57d6] hover:underline">
                                {t("openVndPage.historyTab.auditReset")}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div ref={listRef} className={`min-h-0 flex-1 overflow-y-auto px-5 pt-1.5 pb-3.5 ${entries.length === 0 ? "flex flex-col justify-center" : ""}`}>
                {entries.length === 0 ? (
                    <EmptyState
                        embedded
                        icon={Shield}
                        title={t("openVndPage.historyTab.auditLogEmpty")}
                        description={t("openVndPage.historyTab.auditLogEmptyDescription")}
                    />
                ) : filtered.length === 0 ? (
                    <div className="py-6 text-center text-[12.5px] text-[#a3adbd]">{t("openVndPage.historyTab.auditNoResults")}</div>
                ) : (
                    filtered.map((a) => {
                        const kind = getAuditKind(a);
                        return (
                            <div key={a.id} className="flex gap-[11px] py-2.5 border-t border-[#f3f6f9] first:border-t-0">
                                {/* Точка = тип события; при наведении - белая подсказка с расшифровкой */}
                                <span className="flex-none mt-1.5">
                                    <LightTooltip side="top" align="start" width={260} content={
                                        <span className="flex items-start gap-2">
                                            <span className="mt-[5px]"><KindDot kind={kind} size={8}/></span>
                                            <span>
                                                <span className="block font-semibold text-[#26324a]">
                                                    {t(`openVndPage.historyTab.auditKinds.${kind.key}.label`)}
                                                </span>
                                                <span className="block text-[11.5px] text-[#6b7891]">
                                                    {t(`openVndPage.historyTab.auditKinds.${kind.key}.description`)}
                                                </span>
                                            </span>
                                        </span>
                                    }>
                                        <span className="block cursor-help p-[2px] -m-[2px]"><KindDot kind={kind}/></span>
                                    </LightTooltip>
                                </span>
                                <div className="min-w-0">
                                    <div className="whitespace-pre-line text-[12.5px] text-[#26324a] leading-[1.4]">
                                        <HighlightSubstrings text={a.text} terms={terms}/>
                                    </div>
                                    <div className="text-[11px] text-[#8b97ab] mt-0.5">
                                        <HighlightSubstrings text={formatDateTime(a.createdAt)} terms={terms}/>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
