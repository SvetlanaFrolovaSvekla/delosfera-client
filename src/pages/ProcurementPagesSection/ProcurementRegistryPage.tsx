/**
 * Реестр «Заявки и закупки» (экран v8 isPrc). Устроен как реестр служебных записок:
 * вкладки-срезы со счётчиками, под ними строка поиска и фильтров, сохранённые фильтры,
 * расширенный поиск и чипсы включённых условий. Строка ведёт в карточку закупки.
 */
import {useCallback, useEffect, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {
    procurementService,
    type ProcurementCounters,
    type ProcurementListItem,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {Pagination} from "@/components/componentsGeneral/Pagination.tsx";
import {ActiveFilterChips, type ActiveFilterChip} from "@/components/componentsGeneral/ActiveFilterChips.tsx";
import {RegistryStateRow, RegistryTable, type RegistryColumn} from "@/components/componentsSz/componentsSzRegistry/RegistryTable.tsx";
import {SzAdvancedSearchToggle} from "@/components/componentsSz/componentsSzRegistry/SzAdvancedSearch.tsx";
import {
    ProcurementAdvancedSearchPanel,
    useProcurementMethods,
} from "@/components/componentsProcurement/ProcurementAdvancedSearch.tsx";
import {
    EMPTY_PROCUREMENT_ADVANCED,
    PROCUREMENT_FILTER_STATUSES,
    PROCUREMENT_SCOPES,
    buildProcurementRequest,
    dateFilterText,
    hasProcurementAdvanced,
    scopeHasStatuses,
    type ProcurementAdvancedFilters,
    type ProcurementScopeId,
} from "@/components/componentsProcurement/procurementRegistryModel.ts";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {Download} from "lucide-react";
import {Icon} from "@/assets/icons/Icon.tsx";
import {toast} from "@/service/toastService.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {useRowSelection} from "@/hooks/useRowSelection.ts";
import {colors} from "@/design/tokens";

const STATUS_TONE: Partial<Record<ProcurementStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    Approved: colors.status.active,
    InProcurement: colors.status.consol,
    Completed: colors.status.active,
    OnRevision: colors.status.onact,
    Rejected: colors.status.arch,
    Cancelled: colors.status.draft,
};

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_KEY = "delosfera.procurement.registry.pageSize";

function readPageSize(): number {
    try {
        const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
        return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
    } catch {
        return DEFAULT_PAGE_SIZE;
    }
}

function money(value: number, t: TFunction): string {
    return `${value.toLocaleString("ru-RU")} ${t("procurementRegistry.som")}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ru-RU");
}

function scopeCount(counters: ProcurementCounters | null, id: ProcurementScopeId): number | undefined {
    if (!counters) return undefined;
    if (id === "all") return counters.all;
    if (id === "mine") return counters.mine;
    if (id === "drafts") return counters.drafts;
    if (id === "approval") return counters.onApproval;
    // Вкладка «В закупке» показывает и согласованные (ещё не начатые) заявки.
    if (id === "inprocurement") return counters.inProcurement + (counters.byStatus["Approved"] ?? 0);
    if (id === "completed") return counters.completed;
    return undefined;
}

/** Что хранится в сохранённом фильтре (scope "procurement"); старые фильтры — только scope и query. */
interface ProcurementSavedPayload {
    scope?: ProcurementScopeId;
    query?: string;
    status?: ProcurementStatusCode | null;
    advanced?: Partial<ProcurementAdvancedFilters> | null;
}

export const ProcurementRegistryPage = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {users} = useUserLookup();
    const methods = useProcurementMethods();
    const userName = (id: number) => users.find((u) => u.id === id)?.fullName ?? `#${id}`;

    const [scope, setScope] = useState<ProcurementScopeId>("all");
    const [query, setQuery] = useState("");
    /** Запрос, по которому получены строки (после паузы ввода): его и подсвечиваем. */
    const [appliedQuery, setAppliedQuery] = useState("");
    const [status, setStatus] = useState<ProcurementStatusCode | "">("");
    const [advanced, setAdvanced] = useState<ProcurementAdvancedFilters>(EMPTY_PROCUREMENT_ADVANCED);
    const [advOpen, setAdvOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(readPageSize);

    const [items, setItems] = useState<ProcurementListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [counters, setCounters] = useState<ProcurementCounters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {selected, toggleRow, toggleAll, allOnPageSelected, clear} = useRowSelection(items);
    const [exporting, setExporting] = useState(false);
    const requestRef = useRef(0);

    const showStatusFilter = !scopeHasStatuses(scope);

    // Поиск по мере ввода, с паузой; Enter применяет сразу.
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed === appliedQuery) return;
        const timer = setTimeout(() => setAppliedQuery(trimmed), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query, appliedQuery]);

    // Любое изменение условий — снова с первой страницы и без отмеченных строк.
    const filterKey = JSON.stringify([scope, appliedQuery, status, advanced, pageSize]);
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPage(1);
    }
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        clear();
    }, [filterKey, clear]);

    const buildRequest = useCallback(
        () => buildProcurementRequest(scope, appliedQuery, status, advanced),
        [scope, appliedQuery, status, advanced],
    );

    const load = useCallback(async () => {
        const request = ++requestRef.current;
        try {
            setLoading(true);
            setError(null);
            const result = await procurementService.search({...buildRequest(), page, pageSize});
            if (request !== requestRef.current) return;
            setItems(result.items);
            setTotal(result.total);
        } catch {
            if (request === requestRef.current) setError(t("procurementRegistry.loadError"));
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [buildRequest, page, pageSize, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // Счётчики вкладок от фильтров не зависят — один раз при открытии.
    useEffect(() => {
        procurementService.counters().then(setCounters).catch(() => undefined);
    }, []);

    const doExport = useCallback(async (ids?: number[]) => {
        setExporting(true);
        try {
            await procurementService.exportRegistry({...buildRequest(), ids});
            toast.success(
                ids ? t("procurementRegistry.exportSelectedDone", {count: ids.length}) : t("procurementRegistry.exportDone"),
                t("procurementRegistry.exportDoneHint"),
            );
        } catch {
            toast.error(t("procurementRegistry.exportError"), t("procurementRegistry.exportErrorHint"));
        } finally {
            setExporting(false);
        }
    }, [buildRequest, t]);

    const changePageSize = (size: number) => {
        setPageSize(size);
        try {
            localStorage.setItem(PAGE_SIZE_KEY, String(size));
        } catch {
            // Размер страницы просто не запомнится.
        }
    };

    const terms = splitSearchTerms(appliedQuery);
    const advancedActive = hasProcurementAdvanced(advanced);

    // ── Чипсы включённых условий ──
    const chips: ActiveFilterChip[] = [];
    const setAdv = (patch: Partial<ProcurementAdvancedFilters>) => setAdvanced((a) => ({...a, ...patch}));
    if (appliedQuery) {
        chips.push({
            key: "query",
            label: `${t("procurementRegistry.chips.query") /* Поиск */}: «${appliedQuery}»`,
            onRemove: () => {
                setQuery("");
                setAppliedQuery("");
            },
        });
    }
    if (status && showStatusFilter) {
        chips.push({
            key: "status",
            label: t(`procurementRegistry.statuses.${status}`, {defaultValue: status}),
            onRemove: () => setStatus(""),
        });
    }
    const textChips: [keyof Pick<ProcurementAdvancedFilters, "regNumber" | "subject">, string][] = [
        ["regNumber", t("procurementRegistry.advanced.regNumber")],
        ["subject", t("procurementRegistry.advanced.subject")],
    ];
    for (const [field, title] of textChips) {
        const value = advanced[field].trim();
        if (value) chips.push({key: field, label: `${title}: ${value}`, onRemove: () => setAdv({[field]: ""})});
    }
    const peopleChips: [keyof Pick<ProcurementAdvancedFilters, "initiatorIds" | "curatorIds">, string][] = [
        ["initiatorIds", t("procurementRegistry.advanced.initiator")],
        ["curatorIds", t("procurementRegistry.advanced.curator")],
    ];
    for (const [field, title] of peopleChips) {
        const ids = advanced[field];
        if (ids.length > 0) {
            chips.push({
                key: field,
                label: `${title}: ${ids.length === 1 ? userName(ids[0]) : ids.length}`,
                onRemove: () => setAdv({[field]: []}),
            });
        }
    }
    if (advanced.methodId) {
        const method = methods.find((m) => String(m.id) === advanced.methodId);
        chips.push({
            key: "method",
            label: `${t("procurementRegistry.advanced.method")}: ${method?.shortTitle ?? `#${advanced.methodId}`}`,
            onRemove: () => setAdv({methodId: ""}),
        });
    }
    if (advanced.subjectKind) {
        chips.push({
            key: "subjectKind",
            label: t(`procurementNew.subjectKinds.${advanced.subjectKind}`),
            onRemove: () => setAdv({subjectKind: ""}),
        });
    }
    if (advanced.amountFrom.trim() || advanced.amountTo.trim()) {
        chips.push({
            key: "amount",
            label: `${t("procurementRegistry.advanced.amount")}: ${advanced.amountFrom.trim() || "…"} – ${advanced.amountTo.trim() || "…"}`,
            onRemove: () => setAdv({amountFrom: "", amountTo: ""}),
        });
    }
    const created = dateFilterText(advanced.createdDate);
    if (created) {
        chips.push({
            key: "created",
            label: `${t("procurementRegistry.advanced.createdDate")}: ${created}`,
            onRemove: () => setAdv({createdDate: EMPTY_DATE_FILTER}),
        });
    }
    if (advanced.affiliatedOnly) {
        chips.push({
            key: "affiliated",
            label: t("procurementRegistry.advanced.affiliatedOnly"),
            onRemove: () => setAdv({affiliatedOnly: false}),
        });
    }
    if (advanced.offBudgetOnly) {
        chips.push({
            key: "offBudget",
            label: t("procurementRegistry.advanced.offBudgetOnly"),
            onRemove: () => setAdv({offBudgetOnly: false}),
        });
    }

    /** «Снять фильтры»: все условия разом; вкладка остаётся той же. */
    const resetFilters = () => {
        setQuery("");
        setAppliedQuery("");
        setStatus("");
        setAdvanced(EMPTY_PROCUREMENT_ADVANCED);
    };

    const columns: RegistryColumn[] = [
        {
            className: "px-3 py-2.5 text-left w-[40px]",
            content: <PlainCheckbox tone="brand" checked={allOnPageSelected} onChange={toggleAll}
                                    ariaLabel={t("procurementRegistry.selectAll")}/>,
        },
        {className: "px-4 py-2.5 text-left w-[150px]", content: t("procurementRegistry.cols.number")},
        {className: "px-4 py-2.5 text-left", content: t("procurementRegistry.cols.subject")},
        {className: "px-4 py-2.5 text-left w-[140px]", content: t("procurementRegistry.cols.method")},
        {className: "px-4 py-2.5 text-right w-[150px]", content: t("procurementRegistry.cols.amount")},
        {className: "px-4 py-2.5 text-left w-[230px]", content: t("procurementRegistry.cols.initiator")},
        {className: "px-4 py-2.5 text-left w-[110px]", content: t("procurementRegistry.cols.created")},
        {className: "px-4 py-2.5 text-left w-[160px]", content: t("procurementRegistry.cols.status")},
    ];

    return (
        <div className="px-7 py-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    {/* Заявки и закупки */}
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">{t("procurementRegistry.title")}</h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        {counters
                            ? t("procurementRegistry.summary", {
                                all: counters.all,
                                onApproval: counters.onApproval,
                                inProcurement: counters.inProcurement,
                            })
                            : t("procurementRegistry.subtitle")}
                    </p>
                </div>
                {/* Стиль кнопки — как у "Создать СЗ" в реестре служебных записок */}
                <button
                    onClick={() => navigate("/prc/new")}
                    className="cursor-pointer inline-flex h-[42px] flex-none items-center gap-2 rounded-[11px] border-none bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]"
                >
                    <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                    {/* Новая заявка */}
                    {t("procurementRegistry.create")}
                </button>
            </div>

            {/* Вкладки-срезы, как в реестре СЗ */}
            <Tabs
                accent="blue"
                className="mt-5"
                value={scope}
                onChange={setScope}
                tabs={PROCUREMENT_SCOPES.map((s) => ({
                    id: s.id,
                    label: t(`procurementRegistry.scopes.${s.id}`),
                    n: scopeCount(counters, s.id),
                }))}
            />

            {/* Строка поиска и фильтров */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <SearchBar
                    variant="white"
                    accent="blue"
                    value={query}
                    onChange={setQuery}
                    onSubmit={() => setAppliedQuery(query.trim())}
                    /* Поиск по предмету, номеру, инициатору… */
                    placeholder={t("procurementRegistry.searchPlaceholder")}
                    className="min-w-[280px] flex-1"
                />
                {showStatusFilter && (
                    <SelectDropdown
                        options={[
                            {value: "", label: t("procurementRegistry.allStatuses") /* Все статусы */},
                            ...PROCUREMENT_FILTER_STATUSES.map((code) => ({
                                value: code,
                                label: t(`procurementRegistry.statuses.${code}`, {defaultValue: code}),
                            })),
                        ]}
                        value={status}
                        onChange={(v) => setStatus(v as ProcurementStatusCode | "")}
                        minWidth="180px"
                        accent="blue"
                    />
                )}
                <div className="text-[12.5px] text-[#8b97ab]">
                    {t("procurementRegistry.found") /* Найдено */}: <b className="font-mono text-[#3a4560]">{total}</b>
                </div>
                <button
                    onClick={() => void doExport()}
                    disabled={exporting || total === 0}
                    className="inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="w-4 h-4"/>
                    {exporting ? t("procurementRegistry.exporting") : t("procurementRegistry.exportExcel")}
                </button>
            </div>

            {/* Сохранённые фильтры (БП-16) и расширенный поиск */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <SavedFiltersBar
                    scope="procurement"
                    onReset={resetFilters}
                    current={{
                        scope,
                        query: appliedQuery,
                        status: status || null,
                        advanced: advancedActive ? advanced : null,
                    }}
                    onApply={(p) => {
                        const f = p as ProcurementSavedPayload;
                        if (f.scope) setScope(f.scope);
                        const q = f.query ?? "";
                        setQuery(q);
                        setAppliedQuery(q.trim());
                        setStatus(f.status ?? "");
                        setAdvanced({...EMPTY_PROCUREMENT_ADVANCED, ...(f.advanced ?? {})});
                    }}
                />
                <SzAdvancedSearchToggle
                    open={advOpen}
                    active={advancedActive}
                    onToggle={() => setAdvOpen((v) => !v)}
                />
            </div>

            {/* Включённые фильтры: что отфильтровано сейчас, каждое условие можно снять */}
            <ActiveFilterChips
                chips={chips}
                label={t("procurementRegistry.chips.label") /* Активные фильтры */}
                removeLabel={t("procurementRegistry.chips.remove") /* Снять фильтр */}
            />

            <ProcurementAdvancedSearchPanel
                open={advOpen}
                value={advanced}
                onApply={setAdvanced}
                onClose={() => setAdvOpen(false)}
                methods={methods}
            />

            {selected.size > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[12px] border border-[#dbe4fb] bg-[#eef3ff] px-3.5 py-2">
                    <span className="text-[12.5px] font-semibold text-[#2f68f5]">
                        {/* Выбрано: {selected.size} */}
                        {t("procurementRegistry.selected", {count: selected.size})}
                    </span>
                    <button
                        onClick={() => void doExport([...selected])}
                        disabled={exporting}
                        className="h-8 cursor-pointer rounded-[8px] border border-[#c9d6f5] bg-white px-3 text-[12.5px] font-semibold text-[#2f68f5] disabled:opacity-50"
                    >
                        {/* Экспорт выбранных */}
                        {t("procurementRegistry.exportSelected")}
                    </button>
                    <button
                        onClick={clear}
                        className="cursor-pointer border-none bg-transparent text-[12px] text-[#8b97ab] hover:text-[#55617a]"
                    >
                        {/* Снять выбор */}
                        {t("procurementRegistry.clearSelection")}
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <RegistryTable columns={columns}>
                {loading && items.length === 0 ? (
                    <RegistryStateRow colSpan={8}>{t("general.loading")}</RegistryStateRow>
                ) : items.length === 0 ? (
                    <RegistryStateRow colSpan={8}>
                        {/* Заявок в этом срезе нет / По заданным условиям ничего не нашлось */}
                        {chips.length > 0 ? t("procurementRegistry.emptyForFilters") : t("procurementRegistry.empty")}
                    </RegistryStateRow>
                ) : items.map((item) => {
                    const tone = STATUS_TONE[item.statusCode] ?? colors.status.draft;
                    return (
                        <tr key={item.id}
                            className={`border-t border-[#eef2f7] hover:bg-[#fafbfd] align-top ${loading ? "opacity-60" : ""}`}>
                            <td className="px-3 py-2.5">
                                <PlainCheckbox
                                    tone="brand"
                                    checked={selected.has(item.id)}
                                    onChange={() => toggleRow(item.id)}
                                    ariaLabel={t("procurementRegistry.selectRow")}
                                />
                            </td>
                            <td className="px-4 py-2.5">
                                <Link to={`/prc/${item.id}`}
                                      className="font-mono text-[12.5px] font-semibold text-[#2f68f5] no-underline hover:underline">
                                    {item.regNumber
                                        ? <HighlightSubstrings text={item.regNumber} terms={terms}/>
                                        : t("procurementRegistry.noNumber")}
                                </Link>
                                {item.sourceSzRegNumber && (
                                    <div className="text-[11px] text-[#8b97ab]">
                                        {/* по записке … */}
                                        {t("procurementRegistry.fromMemo")} {item.sourceSzRegNumber}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-2.5">
                                <Link to={`/prc/${item.id}`} className="text-[#1c2740] no-underline hover:underline">
                                    <HighlightSubstrings text={item.subject} terms={terms}/>
                                </Link>
                                {item.isAffiliated && (
                                    <span className="ml-1.5 text-[11px] text-[#c77700]">
                                        {/* аффилированное лицо */}
                                        {t("procurementRegistry.affiliated")}
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-2.5 text-[#55617a]">{item.methodShortTitle}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap text-[#26324a]">
                                {money(item.amount, t)}
                                {!item.hasBudget && (
                                    <div className="text-[11px] text-[#c77700]">
                                        {/* вне бюджета */}
                                        {t("procurementRegistry.offBudget")}
                                    </div>
                                )}
                            </td>
                            {/* Инициатор — с аватаркой-инициалами, как в реестре СЗ и доверенностях */}
                            <td className="px-4 py-2.5">
                                {item.initiatorName ? (
                                    <span className="flex min-w-0 items-start gap-2">
                                        <Avatar name={item.initiatorName} size={24}/>
                                        <span className="min-w-0 leading-[1.3]">
                                            <span className="block truncate text-[#26324a]">
                                                <HighlightSubstrings text={item.initiatorName} terms={terms}/>
                                            </span>
                                            {item.initiatorUnit && (
                                                <span className="block truncate text-[11px] text-[#8b97ab]" title={item.initiatorUnit}>
                                                    <HighlightSubstrings text={item.initiatorUnit} terms={terms}/>
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                ) : <span className="text-[#a3adbd]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[#55617a]">{formatDate(item.createdAt)}</td>
                            <td className="px-4 py-2.5">
                                <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                      style={{color: tone.fg, background: tone.bg}}>
                                    {t(`procurementRegistry.statuses.${item.statusCode}`, {defaultValue: item.statusCode})}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </RegistryTable>

            <div className="mt-3">
                <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={changePageSize}
                    pageSizeOptions={PAGE_SIZES}
                    disabled={loading}
                />
            </div>
        </div>
    );
};
