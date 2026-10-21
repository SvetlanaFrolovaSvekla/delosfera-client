/**
 * Поиск по документам (GEN-02, GEN-04).
 *
 * Строка ищет по текстовым полям карточек, фильтры — по реквизитам. Содержимое
 * вложений пока не индексируется, и страница об этом честно предупреждает: искать
 * «внутри файлов» и не находить хуже, чем знать границы поиска.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {
    scopeOptions,
    searchService,
    type SearchRequest,
    type SearchResult,
    type SearchScope,
} from "@/service/searchService/searchService.ts";
import {
    organizationUnitService
} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {
    OrganizationUnitResponse
} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {HighlightTerms} from "@/utils/highlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SavedFiltersBar, type SavedFiltersApi} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {ChevronDown, RotateCcw, Search, SlidersHorizontal, X} from "lucide-react";

const ACCENT = "#4e57d6";
const FOCUS = "outline-none focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff]";
const FIELD = `h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#0f1b2d] placeholder:text-[#a3adbd] ${FOCUS}`;

/** Цвет плашки контура в выдаче. */
const SCOPE_TONE: Record<SearchScope, { fg: string; bg: string }> = {
    Sz: {fg: "#2f68f5", bg: "#e9f0ff"},
    Procurement: {fg: "#b3730a", bg: "#fbeecf"},
    Contract: {fg: "#1c7a4d", bg: "#e2f4ea"},
    Meeting: {fg: "#7a5ce0", bg: "#efeafe"},
    Vnd: {fg: "#4e57d6", bg: "#eef0fd"},
};

/** Статусы приходят с сервера русскими строками; по ним находим ключ перевода. */
const STATUS_KEY: Record<string, string> = {
    "Черновик": "draft", "Ждёт регистрации": "pendingRegistration", "Зарегистрирована": "registered",
    "На согласовании": "onApproval", "На доработке": "onRevision", "На решении адресата": "onAddresseeDecision",
    "На исполнении": "onExecution", "Согласовано": "approved", "В процедуре закупки": "inProcurement",
    "Исполнена": "executed", "Завершён": "completed", "Подписан": "signed", "Расторгнут": "terminated",
    "Отклонено": "rejected", "Отозвана": "withdrawn", "Отменено": "cancelled", "В архиве": "archived",
    "Действует": "active", "На актуализации": "onActualization", "На утверждении": "onConsolidation",
};

const NUMBER_LOCALE: Record<string, string> = {ru: "ru-RU", en: "en-US", ky: "ky-KG"};

function formatDate(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

/** Набор уточняющих условий; строка запроса и контуры живут отдельно. */
const ADVANCED_KEYS = ["from", "to", "orgUnitId", "amountFrom", "amountTo"] as const;

export const SearchPage = () => {
    const {t, i18n} = useTranslation();
    const [params, setParams] = useSearchParams();

    const [form, setForm] = useState<SearchRequest>({
        query: params.get("q") ?? "",
        scopes: [],
        page: 1,
        pageSize: 20,
    });
    const formRef = useRef(form);
    // Эффект объявлен раньше эффекта с адресом, поэтому к его запуску ref уже свежий.
    useEffect(() => {
        formRef.current = form;
    });

    const [result, setResult] = useState<SearchResult | null>(null);
    /** Запрос, по которому получена выдача: подсвечиваем его, а не то, что набрано прямо сейчас. */
    const [appliedQuery, setAppliedQuery] = useState("");
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const run = useCallback(async (request: SearchRequest) => {
        try {
            setBusy(true);
            setError(null);
            const data = await searchService.search(request);
            setResult(data);
            setAppliedQuery(request.query ?? "");
        } catch {
            setError(t("searchPage.error"));
        } finally {
            setBusy(false);
        }
    }, [t]);

    // Запрос из шапки приходит адресом — страница должна открываться уже с выдачей.
    useEffect(() => {
        const q = params.get("q") ?? "";
        const next = {...formRef.current, query: q, page: 1};
        setForm(next);
        void run(next);
    }, [params, run]);

    useEffect(() => {
        organizationUnitService.getAll().then(setUnits).catch(() => undefined);
    }, []);

    const unitLabel = useCallback((u: OrganizationUnitResponse): string =>
        (i18n.language === "ky" ? u.titleKg : i18n.language === "en" ? u.titleEn : null) || u.titleRu, [i18n.language]);

    const submit = (page = 1, base: SearchRequest = form) => {
        const next = {...base, page};
        setForm(next);

        // Держим строку в адресе: выдачей делятся ссылкой. Смена адреса сама запускает поиск.
        if ((next.query ?? "") !== (params.get("q") ?? "")) {
            setParams(next.query ? {q: next.query} : {});
            return;
        }

        void run(next);
    };

    /** Изменить условие и сразу обновить выдачу. */
    const apply = (patch: Partial<SearchRequest>) => {
        const updated = {...form, ...patch, page: 1};
        setForm(updated);
        void run(updated);
    };

    const toggleScope = (scope: SearchScope) => {
        const current = form.scopes ?? [];
        apply({scopes: current.includes(scope) ? current.filter(s => s !== scope) : [...current, scope]});
    };

    const advancedCount = ADVANCED_KEYS.filter(k => form[k] !== undefined && form[k] !== null).length;

    const resetAdvanced = () => apply({
        from: undefined, to: undefined, orgUnitId: undefined, amountFrom: undefined, amountTo: undefined,
    });

    const money = (n: number) => n.toLocaleString(NUMBER_LOCALE[i18n.language] ?? "ru-RU");

    // Сохранённые поиски лежат на сервере в searchService; панель сохранения — общая с реестрами.
    const savedApi = useMemo<SavedFiltersApi>(() => ({
        list: async () => (await searchService.saved()).map(s => ({
            id: s.id, name: s.name, payload: s.criteria as Record<string, unknown>,
        })),
        create: (name, payload) => searchService.save(name, payload as SearchRequest),
        remove: (id) => searchService.removeSaved(id),
    }), []);

    const currentCriteria: Record<string, unknown> = {
        query: form.query, scopes: form.scopes, from: form.from, to: form.to,
        orgUnitId: form.orgUnitId, amountFrom: form.amountFrom, amountTo: form.amountTo,
    };

    const applySaved = (payload: Record<string, unknown>) => {
        const criteria: SearchRequest = {...(payload as SearchRequest), page: 1, pageSize: form.pageSize};
        if (ADVANCED_KEYS.some(k => criteria[k] !== undefined && criteria[k] !== null)) setAdvancedOpen(true);
        submit(1, criteria);
    };

    // Плашки включённых условий — видны, когда панель свёрнута.
    const chips: { key: string; label: string; clear: Partial<SearchRequest> }[] = [];
    if (form.from) chips.push({
        key: "from",
        label: t("searchPage.chips.from", {date: formatDate(form.from)}),
        clear: {from: undefined}
    });
    if (form.to) chips.push({
        key: "to",
        label: t("searchPage.chips.to", {date: formatDate(form.to)}),
        clear: {to: undefined}
    });
    if (form.orgUnitId) {
        const u = units.find(x => x.id === form.orgUnitId);
        chips.push({
            key: "unit",
            label: u ? unitLabel(u) : t("searchPage.filters.unit"),
            clear: {orgUnitId: undefined}
        });
    }
    if (form.amountFrom !== undefined) chips.push({
        key: "af",
        label: t("searchPage.chips.amountFrom", {amount: money(form.amountFrom)}),
        clear: {amountFrom: undefined}
    });
    if (form.amountTo !== undefined) chips.push({
        key: "at",
        label: t("searchPage.chips.amountTo", {amount: money(form.amountTo)}),
        clear: {amountTo: undefined}
    });

    const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

    return (
        <div className="px-7 py-6">
            <div>
                <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">{t("searchPage.title")}</h1>
                <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">{t("searchPage.subtitle")}</p>
            </div>

            <section className="mt-5 rounded-[14px] border border-[#e5e9f0] bg-white p-4">
                {/* Enter в строке поиска запускает поиск, в том числе с пустой строкой. */}
                <div
                    className="flex flex-wrap items-center gap-2.5"
                    onKeyDown={e => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && submit()}
                >
                    <SearchBar
                        variant="white"
                        value={form.query ?? ""}
                        onChange={v => setForm({...form, query: v})}
                        placeholder={t("searchPage.queryPlaceholder")}
                        className="min-w-[280px] flex-1"
                    />
                    <button
                        type="button"
                        onClick={() => submit()}
                        disabled={busy}
                        style={{background: ACCENT, boxShadow: `0 6px 16px -8px ${ACCENT}`}}
                        className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border-none px-5 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:cursor-default disabled:opacity-60"
                    >
                        <Search className="h-4 w-4" strokeWidth={2.25}/>
                        {busy ? t("searchPage.searching") : t("searchPage.find")}
                    </button>
                    <button
                        type="button"
                        aria-expanded={advancedOpen}
                        onClick={() => setAdvancedOpen(o => !o)}
                        className={`inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold hover:bg-[#f6f8fb] ${
                            advancedOpen || advancedCount > 0
                                ? "border-[#cbddff] bg-[#f6f9ff] text-[#2f68f5]"
                                : "border-[#e5e9f0] bg-white text-[#3a4560]"}`}
                    >
                        <SlidersHorizontal className="h-4 w-4"/>
                        {t("searchPage.advanced")}
                        {advancedCount > 0 && (
                            <span
                                className="rounded-full bg-[#2f68f5] px-[7px] py-[1px] font-mono text-[11px] font-bold text-white">
                                {advancedCount}
                            </span>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}/>
                    </button>
                </div>

                {/* Контуры поиска: «Все» или любое сочетание; в скобках — сколько нашлось. */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <ScopeChip
                        active={(form.scopes ?? []).length === 0}
                        onClick={() => apply({scopes: []})}
                        count={result?.total}
                    >
                        {t("searchPage.scopeAll")}
                    </ScopeChip>
                    {scopeOptions.map(o => (
                        <ScopeChip
                            key={o.value}
                            active={(form.scopes ?? []).includes(o.value)}
                            onClick={() => toggleScope(o.value)}
                            count={result?.countByScope?.[o.title]}
                        >
                            {t(`searchPage.scopes.${o.value}`)}
                        </ScopeChip>
                    ))}
                </div>

                {advancedOpen && (
                    <div className="mt-4 rounded-[12px] border border-[#eef2f7] bg-[#fafbfd] p-4">
                        <div
                            className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4"
                            onKeyDown={e => {
                                // Enter в полях дат и сумм применяет условия; поле поиска подразделения не трогаем.
                                const el = e.target as HTMLInputElement;
                                if (e.key === "Enter" && el.tagName === "INPUT" && (el.type === "date" || el.type === "number")) submit();
                            }}
                        >
                            <LabeledField label={t("searchPage.filters.from")}>
                                <input type="date" className={FIELD} value={form.from ?? ""}
                                       onChange={e => setForm({...form, from: e.target.value || undefined})}/>
                            </LabeledField>
                            <LabeledField label={t("searchPage.filters.to")}>
                                <input type="date" className={FIELD} value={form.to ?? ""}
                                       onChange={e => setForm({...form, to: e.target.value || undefined})}/>
                            </LabeledField>
                            <LabeledField label={t("searchPage.filters.unit")} wide>
                                <SelectDropdown
                                    className="w-full"
                                    minWidth="100%"
                                    searchable
                                    searchPlaceholder={t("searchPage.filters.unitSearch")}
                                    options={[
                                        {value: "", label: t("searchPage.filters.allUnits")},
                                        ...units.map(u => ({value: String(u.id), label: unitLabel(u)})),
                                    ]}
                                    value={form.orgUnitId ? String(form.orgUnitId) : ""}
                                    onChange={v => apply({orgUnitId: v ? Number(v) : undefined})}
                                />
                            </LabeledField>
                            <LabeledField label={t("searchPage.filters.amountFrom")}>
                                <input type="number" min={0} className={FIELD} value={form.amountFrom ?? ""}
                                       onChange={e => setForm({
                                           ...form,
                                           amountFrom: e.target.value ? Number(e.target.value) : undefined
                                       })}/>
                            </LabeledField>
                            <LabeledField label={t("searchPage.filters.amountTo")}>
                                <input type="number" min={0} className={FIELD} value={form.amountTo ?? ""}
                                       onChange={e => setForm({
                                           ...form,
                                           amountTo: e.target.value ? Number(e.target.value) : undefined
                                       })}/>
                            </LabeledField>
                        </div>
                        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                            <span
                                className="text-[12px] leading-[1.5] text-[#8b97ab]">{t("searchPage.advancedHint")}</span>
                            <button
                                type="button"
                                onClick={resetAdvanced}
                                disabled={advancedCount === 0}
                                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-default disabled:opacity-50"
                            >
                                <RotateCcw className="h-3.5 w-3.5"/>
                                {t("searchPage.reset")}
                            </button>
                        </div>
                    </div>
                )}

                {!advancedOpen && chips.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {chips.map(c => (
                            <span key={c.key}
                                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#cbddff] bg-[#f6f9ff] pl-3 pr-1.5 text-[12px] font-semibold text-[#2f68f5]">
                                {c.label}
                                <button type="button" onClick={() => apply(c.clear)}
                                        aria-label={t("searchPage.removeFilter")} title={t("searchPage.removeFilter")}
                                        className="grid h-4 w-4 cursor-pointer place-items-center rounded-full border-none bg-transparent p-0 text-[#2f68f5] hover:bg-[#dbe7ff]">
                                    <X className="h-3 w-3" strokeWidth={2.5}/>
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-3.5 border-t border-[#eef2f7] pt-3">
                    <SavedFiltersBar scope="search" api={savedApi} current={currentCriteria} onApply={applySaved}/>
                </div>
            </section>

            {error && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 text-[12.5px] text-[#8b97ab]">
                    {t("searchPage.found")}: <b className="font-mono text-[#3a4560]">{result.total}</b>
                </div>
            )}

            <section className={`mt-2.5 flex flex-col gap-2 transition-opacity ${busy ? "opacity-60" : ""}`}>
                {(result?.items ?? []).map(hit => {
                    const tone = SCOPE_TONE[hit.scope] ?? {fg: "#5b6472", bg: "#eef0f3"};
                    const statusKey = hit.statusTitle ? STATUS_KEY[hit.statusTitle] : undefined;
                    const meta = [
                        hit.authorName,
                        hit.orgUnitTitle,
                        hit.amount ? `${money(hit.amount)} ${t("searchPage.currency")}` : null,
                        formatDate(hit.createdAt),
                    ].filter(Boolean);

                    return (
                        <Link
                            key={`${hit.scope}-${hit.id}`}
                            to={hit.url}
                            className="block rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-3 no-underline transition-colors hover:border-[#cbddff] hover:bg-[#fbfcff]"
                        >
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                      style={{color: tone.fg, background: tone.bg}}>
                                    {t(`searchPage.scopes.${hit.scope}`, {defaultValue: hit.scopeTitle})}
                                </span>
                                {hit.regNumber && (
                                    <span className="font-mono text-[12.5px] font-semibold text-[#2f68f5]">
                                        <HighlightTerms text={hit.regNumber} query={appliedQuery}/>
                                    </span>
                                )}
                                {hit.statusTitle && (
                                    <span className="ml-auto text-[12px] font-medium text-[#8b97ab]">
                                        {statusKey ? t(`searchPage.statusTitles.${statusKey}`) : hit.statusTitle}
                                    </span>
                                )}
                            </div>

                            <div className="mt-1.5 text-[14px] font-semibold text-[#1c2740]">
                                <HighlightTerms text={hit.title} query={appliedQuery}/>
                            </div>

                            {hit.snippet && (
                                <div className="mt-1 text-[12.5px] leading-[1.6] text-[#55617a]">
                                    <HighlightTerms text={hit.snippet} query={appliedQuery}/>
                                </div>
                            )}

                            <div className="mt-1.5 text-[11.5px] text-[#8b97ab]">{meta.join(" · ")}</div>
                        </Link>
                    );
                })}

                {result && result.items.length === 0 && (
                    <div
                        className="rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-10 text-center text-[13px] text-[#8b97ab]">
                        {t("searchPage.empty")}
                    </div>
                )}
            </section>

            {result && result.total > result.pageSize && (
                <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => submit(Math.max(1, (form.page ?? 1) - 1))}
                        disabled={busy || (form.page ?? 1) <= 1}
                        className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-default disabled:opacity-50"
                    >
                        {t("searchPage.prev")}
                    </button>
                    <span className="text-[12.5px] text-[#8b97ab]">
                        {t("searchPage.pageOf", {page: result.page, pages})}
                    </span>
                    <button
                        type="button"
                        onClick={() => submit((form.page ?? 1) + 1)}
                        disabled={busy || result.page * result.pageSize >= result.total}
                        className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-default disabled:opacity-50"
                    >
                        {t("searchPage.next")}
                    </button>
                </div>
            )}
        </div>
    );
};

function ScopeChip({active, onClick, count, children}: {
    active: boolean; onClick: () => void; count?: number; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-[9px] border px-3 text-[12.5px] font-semibold ${
                active
                    ? "border-[#2f68f5] bg-[#eef3ff] text-[#2f68f5]"
                    : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"}`}
        >
            {children}
            {count ? (
                <span className={`rounded-full px-[7px] py-[1px] font-mono text-[11px] font-bold ${
                    active ? "bg-[#dbe7ff] text-[#2f68f5]" : "bg-[#f2f5f9] text-[#8b97ab]"}`}>
                    {count}
                </span>
            ) : null}
        </button>
    );
}

function LabeledField({label, wide, children}: { label: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <div className={wide ? "sm:col-span-2 lg:col-span-2" : ""}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">{label}</div>
            {children}
        </div>
    );
}
