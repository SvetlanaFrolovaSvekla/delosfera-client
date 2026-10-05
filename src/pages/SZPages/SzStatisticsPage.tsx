/**
 * Аналитика служебных записок.
 *
 * Сводка отвечает на три вопроса делопроизводства: сколько записок в работе,
 * сколько просрочено и кто именно не укладывается в срок. Поэтому разрезы —
 * по подразделениям, видам и месяцам, а просрочка вынесена отдельной колонкой:
 * она и есть повод для разговора.
 */
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {
    szStatisticsService,
    type SzStatistics,
    type SzStatisticsCell,
} from "@/service/szService/szStatisticsService.ts";
import {szService, type SzKind} from "@/service/szService/szService.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {Download, RotateCcw} from "lucide-react";

const EMPTY_CELL: SzStatisticsCell = {total: 0, inWork: 0, overdue: 0, executed: 0, other: 0};

const NUMBER_LOCALE: Record<string, string> = {ru: "ru-RU", en: "en-US", ky: "ky-KG"};

const FOCUS = "outline-none focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff]";
const DATE_FIELD = `h-9 w-[160px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#0f1b2d] ${FOCUS}`;

/** Сервер отдаёт эти подписи русскими строками — по ним находим ключ перевода. */
const NO_UNIT = "Без подразделения";
const NO_KIND = "Без вида";

interface BreakdownRow {
    key: string;
    label: string;
    cell: SzStatisticsCell;
}

function Breakdown({title, rows, search, emptyText}: {
    title: string;
    rows: BreakdownRow[];
    search: string;
    emptyText: string;
}) {
    const {t} = useTranslation();
    const max = Math.max(1, ...rows.map(r => r.cell.total));

    return (
        <section className="overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
            <div className="flex items-center gap-2 border-b border-[#eef2f7] px-5 py-3">
                <h2 className="m-0 text-[15px] font-semibold text-[#1c2740]">{title}</h2>
                <span className="rounded-full bg-[#f2f5f9] px-[7px] py-[1px] font-mono text-[11px] font-bold text-[#8b97ab]">
                    {rows.length}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                    <tr className="bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        <th className="px-5 py-2.5 text-left">{t("szStatistics.cols.name")}</th>
                        <th className="w-[90px] px-3 py-2.5 text-right">{t("szStatistics.cols.total")}</th>
                        <th className="w-[170px] px-3 py-2.5 text-left">{t("szStatistics.cols.share")}</th>
                        <th className="w-[110px] px-3 py-2.5 text-right">{t("szStatistics.cols.inWork")}</th>
                        <th className="w-[120px] px-3 py-2.5 text-right">{t("szStatistics.cols.overdue")}</th>
                        <th className="w-[110px] px-5 py-2.5 text-right">{t("szStatistics.cols.executed")}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-[#8b97ab]">{emptyText}</td>
                        </tr>
                    ) : rows.map(({key, label, cell}) => (
                        <tr key={key} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                            <td className="px-5 py-2.5 text-[#26324a]">
                                <HighlightText text={label} query={search}/>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[#1c2740]">{cell.total}</td>
                            <td className="px-3 py-2.5">
                                <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#eef2f7]">
                                    <div className="h-full rounded-full bg-[#2f68f5]"
                                         style={{width: `${Math.round((cell.total / max) * 100)}%`}}/>
                                </div>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-[#55617a]">{cell.inWork}</td>
                            <td className="px-3 py-2.5 text-right">
                                {cell.overdue > 0 ? (
                                    <span className="inline-flex rounded-full bg-[#fbeae7] px-[9px] py-0.5 text-[12px] font-semibold tabular-nums text-[#c0392b]">
                                        {cell.overdue}
                                    </span>
                                ) : (
                                    <span className="tabular-nums text-[#a3adbd]">0</span>
                                )}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-[#55617a]">{cell.executed}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function LabeledField({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">{label}</div>
            {children}
        </div>
    );
}

interface Filter {
    from: string;
    to: string;
    orgUnitId: number;
    kindId: number;
}

const EMPTY_FILTER: Filter = {from: "", to: "", orgUnitId: 0, kindId: 0};

/** embedded — страница показывается вкладкой раздела «Аналитика», без своей шапки. */
export function SzStatisticsPage({embedded}: {embedded?: boolean} = {}) {
    const {t, i18n} = useTranslation();
    const {orgUnits} = useDictionaries();
    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [summary, setSummary] = useState<SzStatistics | null>(null);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
    /** Поиск и «только с просрочкой» работают по уже полученной сводке и сервер не дёргают. */
    const [search, setSearch] = useState("");
    const [overdueOnly, setOverdueOnly] = useState(false);

    const request = useCallback(() => ({
        from: filter.from || undefined,
        to: filter.to || undefined,
        orgUnitId: filter.orgUnitId || undefined,
        kindId: filter.kindId || undefined,
    }), [filter]);

    const load = useCallback(async () => {
        try {
            setBusy(true);
            setError(null);
            setSummary(await szStatisticsService.get(request()));
        } catch {
            setError(t("szStatistics.loadError"));
        } finally {
            setBusy(false);
        }
    }, [request, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        szService.kinds().then(setKinds).catch(() => undefined);
    }, []);

    const exportToExcel = async () => {
        try {
            setError(null);
            await szStatisticsService.export(request());
        } catch {
            setError(t("szStatistics.exportError"));
        }
    };

    const lang = i18n.language;

    const unitTitle = useCallback((u: { titleRu: string; titleEn: string | null; titleKg: string | null }): string =>
        (lang === "ky" ? u.titleKg : lang === "en" ? u.titleEn : null) || u.titleRu, [lang]);

    const kindTitle = useCallback((k: SzKind): string =>
        (lang === "ky" ? k.titleKg : lang === "en" ? k.titleEn : null) || k.titleRu, [lang]);

    // Ключи разрезов приходят с сервера русскими названиями — показываем на языке интерфейса.
    const unitLabel = useCallback((name: string): string => {
        if (name === NO_UNIT) return t("szStatistics.noUnit");
        const u = orgUnits.find(x => x.titleRu === name);
        return u ? unitTitle(u) : name;
    }, [orgUnits, t, unitTitle]);

    const kindLabel = useCallback((name: string): string => {
        if (name === NO_KIND) return t("szStatistics.noKind");
        const k = kinds.find(x => x.titleRu === name);
        return k ? kindTitle(k) : name;
    }, [kinds, t, kindTitle]);

    /** Ключ месяца приходит как «09.2026» — показываем «Сентябрь 2026» на языке интерфейса. */
    const monthLabel = useCallback((key: string): string => {
        const m = /^(\d{2})\.(\d{4})$/.exec(key);
        if (!m) return key;
        const text = new Date(Number(m[2]), Number(m[1]) - 1, 1)
            .toLocaleDateString(NUMBER_LOCALE[lang] ?? "ru-RU", {month: "long", year: "numeric"})
            .replace(/\s*г\.$/, "");
        return text.charAt(0).toUpperCase() + text.slice(1);
    }, [lang]);

    const total: SzStatistics = summary
        ?? {...EMPTY_CELL, from: null, to: null, byUnit: {}, byKind: {}, byMonth: {}};

    const term = search.trim().toLowerCase();

    const toRows = useCallback((
        cells: Record<string, SzStatisticsCell>,
        label: (key: string) => string,
        order: (a: BreakdownRow, b: BreakdownRow) => number,
    ): BreakdownRow[] => Object.entries(cells)
        .map(([key, cell]) => ({key, label: label(key), cell}))
        .filter(r => (!term || r.label.toLowerCase().includes(term)) && (!overdueOnly || r.cell.overdue > 0))
        .sort(order), [term, overdueOnly]);

    const byTotal = (a: BreakdownRow, b: BreakdownRow) => b.cell.total - a.cell.total;
    // Месяцы — от свежих к давним, а не по количеству: это динамика, а не рейтинг.
    const monthValue = (key: string) => {
        const m = /^(\d{2})\.(\d{4})$/.exec(key);
        return m ? Number(m[2]) * 12 + Number(m[1]) : 0;
    };
    const byMonthDesc = (a: BreakdownRow, b: BreakdownRow) => monthValue(b.key) - monthValue(a.key);

    const unitRows = useMemo(() => toRows(total.byUnit, unitLabel, byTotal), [toRows, total.byUnit, unitLabel]);
    const kindRows = useMemo(() => toRows(total.byKind, kindLabel, byTotal), [toRows, total.byKind, kindLabel]);
    const monthRows = useMemo(() => toRows(total.byMonth, monthLabel, byMonthDesc), [toRows, total.byMonth, monthLabel]);

    const emptyText = (cells: Record<string, SzStatisticsCell>) =>
        Object.keys(cells).length > 0 ? t("general.notFound") : t("szStatistics.emptyPeriod");

    const hasFilter = JSON.stringify(filter) !== JSON.stringify(EMPTY_FILTER) || search !== "" || overdueOnly;

    const reset = () => {
        setFilter(EMPTY_FILTER);
        setSearch("");
        setOverdueOnly(false);
    };

    const kpis = [
        {key: "total", value: total.total, color: "#0f1b2d"},
        {key: "inWork", value: total.inWork, color: "#2f68f5"},
        {key: "overdue", value: total.overdue, color: total.overdue > 0 ? "#c0392b" : "#8b97ab"},
        {key: "executed", value: total.executed, color: "#1c7a4d"},
        {key: "other", value: total.other, color: "#8b97ab"},
    ];

    return (
        <div className={embedded ? "flex flex-col gap-4" : "flex flex-col gap-4 px-7 py-6"}>
            {!embedded && (
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">{t("szStatistics.title")}</h1>
                        <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">{t("szStatistics.subtitle")}</p>
                    </div>
                    <Link to="/sz"
                          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#3a4560] no-underline hover:bg-[#f6f8fb]">
                        ← {t("szStatistics.back")}
                    </Link>
                </div>
            )}

            {error && (
                <div className="rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <LabeledField label={t("szStatistics.filters.from")}>
                        <input type="date" value={filter.from}
                               onChange={(e) => setFilter({...filter, from: e.target.value})}
                               className={DATE_FIELD}/>
                    </LabeledField>
                    <LabeledField label={t("szStatistics.filters.to")}>
                        <input type="date" value={filter.to} min={filter.from || undefined}
                               onChange={(e) => setFilter({...filter, to: e.target.value})}
                               className={DATE_FIELD}/>
                    </LabeledField>
                    <LabeledField label={t("szStatistics.filters.unit")}>
                        <SelectDropdown
                            searchable
                            searchPlaceholder={t("szStatistics.filters.unitSearch")}
                            minWidth="240px"
                            options={[
                                {value: "", label: t("szStatistics.filters.all")},
                                ...orgUnits.map(u => ({value: String(u.id), label: unitTitle(u)})),
                            ]}
                            value={filter.orgUnitId ? String(filter.orgUnitId) : ""}
                            onChange={(v) => setFilter({...filter, orgUnitId: v ? Number(v) : 0})}
                        />
                    </LabeledField>
                    <LabeledField label={t("szStatistics.filters.kind")}>
                        <SelectDropdown
                            searchable
                            searchPlaceholder={t("szStatistics.filters.kindSearch")}
                            minWidth="200px"
                            options={[
                                {value: "", label: t("szStatistics.filters.all")},
                                ...kinds.map(k => ({value: String(k.id), label: kindTitle(k)})),
                            ]}
                            value={filter.kindId ? String(filter.kindId) : ""}
                            onChange={(v) => setFilter({...filter, kindId: v ? Number(v) : 0})}
                        />
                    </LabeledField>

                    <div className="flex-1"/>

                    <button type="button" onClick={reset} disabled={!hasFilter}
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-default disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5"/>
                        {t("szStatistics.reset")}
                    </button>
                    <button type="button" onClick={exportToExcel} disabled={busy}
                            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50">
                        <Download className="h-4 w-4"/>
                        {t("szStatistics.exportExcel")}
                    </button>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-[#eef2f7] pt-3.5">
                    <SearchBar
                        variant="white"
                        value={search}
                        onChange={setSearch}
                        placeholder={t("szStatistics.searchPlaceholder")}
                        className="min-w-[260px] max-w-[420px] flex-1"
                    />
                    <CheckBoxOne checked={overdueOnly} onChange={setOverdueOnly} tone="brand">
                        {t("szStatistics.overdueOnly")}
                    </CheckBoxOne>
                </div>

                <div className="mt-3">
                    <SavedFiltersBar
                        scope="sz-analytics"
                        current={{...filter, search, overdueOnly}}
                        onApply={(p) => {
                            const f = p as Partial<Filter> & { search?: string; overdueOnly?: boolean };
                            setFilter({
                                from: f.from ?? "", to: f.to ?? "",
                                orgUnitId: f.orgUnitId ?? 0, kindId: f.kindId ?? 0,
                            });
                            setSearch(f.search ?? "");
                            setOverdueOnly(!!f.overdueOnly);
                        }}
                    />
                </div>
            </section>

            <section className={`grid gap-3 transition-opacity ${busy ? "opacity-60" : ""}`}
                     style={{gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"}}>
                {kpis.map((k) => (
                    <div key={k.key}
                         className={`flex flex-col gap-1.5 rounded-[12px] border bg-white px-4 py-3.5 ${
                             k.key === "overdue" && total.overdue > 0 ? "border-[#f1c9c2] bg-[#fdf6f5]" : "border-[#e5e9f0]"}`}>
                        <span className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            {t(`szStatistics.kpi.${k.key}`)}
                        </span>
                        <span className="text-[27px] font-semibold leading-none tabular-nums" style={{color: k.color}}>
                            {k.value}
                        </span>
                    </div>
                ))}
            </section>

            <div className={`flex flex-col gap-4 transition-opacity ${busy ? "opacity-60" : ""}`}>
                <Breakdown title={t("szStatistics.byUnit")} rows={unitRows} search={search} emptyText={emptyText(total.byUnit)}/>
                <Breakdown title={t("szStatistics.byKind")} rows={kindRows} search={search} emptyText={emptyText(total.byKind)}/>
                <Breakdown title={t("szStatistics.byMonth")} rows={monthRows} search={search} emptyText={emptyText(total.byMonth)}/>
            </div>

            <p className="max-w-[68ch] text-[12.5px] text-[#8b97ab]">{t("szStatistics.footnote")}</p>
        </div>
    );
}
