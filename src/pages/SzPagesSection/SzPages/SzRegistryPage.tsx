import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {
    szService,
    type SzCounters,
    type SzKind,
    type SzListItem,
    type SzStatusCode,
} from "@/service/szService/szService.ts";
import {szExecutionService, type SzAssignment} from "@/service/szService/szExecutionService.ts";
import {szPaperService, type SzOriginal} from "@/service/szService/szPaperService.ts";
import {toast} from "@/service/toastService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useRowSelection} from "@/hooks/useRowSelection.ts";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {
    buildSearchParams,
    EMPTY_SZ_ADVANCED,
    hasAdvancedFilters,
    isFilterlessScope,
    scopeHasStatuses,
    type ScopeId,
    type SzAdvancedFilters,
} from "@/components/componentsSz/componentsSzRegistry/registryModel.ts";
import {
    SzAdvancedSearchPanel,
    SzAdvancedSearchToggle,
} from "@/components/componentsSz/componentsSzRegistry/SzAdvancedSearch.tsx";
import {RegistryTabs} from "../../../components/componentsSz/componentsSzRegistry/RegistryTabs.tsx";
import {RegistryFilterBar} from "../../../components/componentsSz/componentsSzRegistry/RegistryFilterBar.tsx";
import {BulkActionsBar} from "../../../components/componentsSz/componentsSzRegistry/BulkActionsBar.tsx";
import {MemosTable} from "../../../components/componentsSz/componentsSzRegistry/MemosTable.tsx";
import {AssignmentsTable} from "../../../components/componentsSz/componentsSzRegistry/AssignmentsTable.tsx";
import {OriginalsTable} from "../../../components/componentsSz/componentsSzRegistry/OriginalsTable.tsx";
import {SzBulkArchiveModal} from "@/components/componentsSz/componentsModal/SzBulkArchiveModal.tsx";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {Pagination} from "@/components/componentsGeneral/Pagination.tsx";
import {ActiveFilterChips, type ActiveFilterChip} from "@/components/componentsGeneral/ActiveFilterChips.tsx";
import {Icon} from "@/assets/icons/Icon.tsx";
import {ChartLine} from "lucide-react";

/** Дата-фильтр одной строкой для чипса: «15.10.2026» или «01.10.2026 – 15.10.2026» (значения уже в дд.мм.гггг). */
function dateFilterText(v: DateFilterValue): string {
    if (v.mode === "exact" && v.exact) return v.exact;
    if (v.from || v.to) return `${v.from || "…"} – ${v.to || "…"}`;
    return v.exact || "";
}

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_KEY = "delosfera.sz.registry.pageSize";

function readPageSize(): number {
    try {
        const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
        return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
    } catch {
        return DEFAULT_PAGE_SIZE;
    }
}

export function SzRegistryPage() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    /**
     * Делопроизводство — те же права, что проверяет сервер (реестр оригиналов, подшивка
     * в дело). Остальным вкладка «Оригиналы на руках» отвечала ошибкой загрузки, а
     * «Сдать в архив» — отказом по каждой строке.
     */
    const isClerk = hasPermission(PermissionCode.RegisterSz) || hasPermission(PermissionCode.ViewAllSz);
    const hiddenScopes: ScopeId[] = isClerk ? [] : ["originals"];

    const [scope, setScopeState] = useState<ScopeId>("all");
    /**
     * Вкладка, по которой реально грузятся строки: «СЗ, согласую я» — подвкладка
     * «На согласовании», но данные у неё свои (ручка inbox).
     */
    const dataScope: ScopeId = scope === "approval" ? "inbox" : scope;
    /** «inbox» из старых сохранённых фильтров/ссылок открывает подвкладку внутри «На согласовании». */
    const setScope = useCallback((next: ScopeId) => {
        if (next === "inbox") {
            setScopeState("approval");
            return;
        }
        // Сохранённый фильтр мог указывать на вкладку, которой у пользователя нет.
        if (next === "originals" && !isClerk) {
            setScopeState("all");
            return;
        }
        setScopeState(next);
    }, [isClerk]);
    const [query, setQuery] = useState("");
    /** Строка поиска, по которой реально идёт запрос: печатаем - запрос уходит после паузы, а не на каждую букву. */
    const [searchQuery, setSearchQuery] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => setSearchQuery(query), query.trim() === "" ? 0 : SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [query]);
    /** Запрос, по которому получены строки в таблице: подсвечиваем его, а не то что набрано прямо сейчас. */
    const [appliedQuery, setAppliedQuery] = useState("");
    const [kindId, setKindId] = useState<number | "">("");
    const [overdueOnly, setOverdueOnly] = useState(false);
    /** Фильтр по статусу — только на вкладках без своего набора статусов («Все», «Мои»). */
    const [statusFilter, setStatusFilter] = useState<SzStatusCode | "">("");
    /** Расширенный поиск: код, тема, автор, дата регистрации, срок исполнения (применённые значения). */
    const [advanced, setAdvanced] = useState<SzAdvancedFilters>(EMPTY_SZ_ADVANCED);
    const [advOpen, setAdvOpen] = useState(false);

    const [items, setItems] = useState<SzListItem[]>([]);
    const [assignments, setAssignments] = useState<SzAssignment[]>([]);
    const [originals, setOriginals] = useState<SzOriginal[]>([]);
    const [total, setTotal] = useState(0);
    const [pageSize, setPageSizeState] = useState(readPageSize);
    // Страница хранится вместе с ключом фильтров, по которым она выбрана: сменился фильтр, вкладка
    // или размер страницы - ключ не совпал, и мы автоматически на первой странице, без лишнего
    // эффекта и второго запроса.
    const filterKey = JSON.stringify([scope, searchQuery, kindId, overdueOnly, statusFilter, advanced, pageSize]);
    const [pageState, setPageState] = useState({page: 1, key: filterKey});
    const page = pageState.key === filterKey ? pageState.page : 1;
    const setPage = useCallback((next: number) => setPageState({page: next, key: filterKey}), [filterKey]);
    const tableTopRef = useRef<HTMLDivElement>(null);
    // Номер последнего запроса: ответ устаревшего (пока листали или печатали) отбрасываем
    const requestRef = useRef(0);
    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [counters, setCounters] = useState<SzCounters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    /** Отмеченные строки реестра для массовых операций (СЗ-7). */
    const {selected, toggleRow, toggleAll, allOnPageSelected, clear} = useRowSelection(items);
    const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
    const [favoriteBusy, setFavoriteBusy] = useState(false);

    /** Название вида записки на языке интерфейса; если перевода нет — русское. */
    const kindTitle = (k: SzKind): string => {
        if (i18n.language === "ky") return k.titleKg || k.titleRu;
        if (i18n.language === "en") return k.titleEn || k.titleRu;
        return k.titleRu;
    };
    const kindName = (id: number, fallback: string): string => {
        const k = kinds.find((x) => x.id === id);
        return k ? kindTitle(k) : fallback;
    };

    useEffect(() => {
        szService.kinds().then(setKinds).catch(() => {
        });
    }, []);

    const load = useCallback(async () => {
        const requestId = ++requestRef.current;
        setLoading(true);
        setError(null);
        try {
            // "Мои поручения" - список не записок, а поручений по ним: своя выдача и своя таблица.
            if (scope === "assignments") {
                const [list, c] = await Promise.all([szExecutionService.my(), szService.counters()]);
                setAssignments(list);
                setTotal(list.length);
                setCounters(c);
                return;
            }

            // Оригиналы на руках - реестр делопроизводства: кто держит бумагу и с какого числа.
            if (scope === "originals") {
                const [list, c] = await Promise.all([szPaperService.outstanding(), szService.counters()]);
                setOriginals(list);
                setTotal(list.length);
                setCounters(c);
                return;
            }

            // "СЗ, согласую я" приходит из отдельной ручки: там фильтр не по статусу,
            // а по активным задачам согласования текущего пользователя.
            const [result, c] = await Promise.all([
                dataScope === "inbox"
                    ? szService.inbox(page, pageSize)
                    : szService.search({
                        ...buildSearchParams(scope, {query: searchQuery, kindId, overdueOnly, statusFilter, advanced}),
                        page,
                        pageSize,
                    }),
                szService.counters(),
            ]);
            if (requestId !== requestRef.current) return;
            setItems(result.items);
            setTotal(result.total);
            setCounters(c);
            setAppliedQuery(dataScope === "inbox" ? "" : searchQuery.trim());
        } catch {
            setError(t("szRegistry.loadError"));
        } finally {
            if (requestId === requestRef.current) setLoading(false);
        }
    }, [scope, dataScope, searchQuery, kindId, overdueOnly, statusFilter, advanced, page, pageSize, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // Смена вкладки, фильтра или страницы меняет набор строк
    useEffect(() => {
        clear();
    }, [dataScope, searchQuery, kindId, overdueOnly, statusFilter, advanced, page, pageSize, clear]);

    // Страница опустела (убрали последнюю строку, сдали в архив, сняли звёздочку в «Избранном») -
    // возвращаемся на последнюю непустую, а не показываем пустую таблицу.
    const isPagedScope = scope !== "assignments" && scope !== "originals";
    useEffect(() => {
        if (!isPagedScope || loading || page <= 1 || items.length > 0 || total <= 0) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(Math.max(1, Math.min(page - 1, Math.ceil(total / pageSize))));
    }, [isPagedScope, loading, page, items.length, total, pageSize, setPage]);

    const handlePageChange = useCallback((next: number) => {
        setPage(next);
        tableTopRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    }, [setPage]);

    const handlePageSizeChange = useCallback((size: number) => {
        try {
            localStorage.setItem(PAGE_SIZE_KEY, String(size));
        } catch {
            // не критично: размер просто не запомнится
        }
        setPageSizeState(size);
    }, []);

    /**
     * Выгрузка реестра в Excel по текущему фильтру. Без ids — весь набор; с ids — только отмеченные
     * (список id нужен, чтобы архивные строки из вкладки «Архив» не отсеялись фильтром по статусу).
     * Особые вкладки (поручения, оригиналы, «согласую я») — не реестр, у них кнопки нет.
     */
    const runExport = useCallback(async (ids?: number[]) => {
        const base = buildSearchParams(scope, {query: searchQuery, kindId, overdueOnly, statusFilter, advanced});
        setExporting(true);
        try {
            await szService.exportRegistry(ids ? {...base, ids} : base);
            toast.success(
                ids ? t("szRegistry.exportSelectedDone", {count: ids.length}) : t("szRegistry.exportDone"),
                t("szRegistry.exportDoneHint"),
            );
        } catch {
            if (ids) toast.error(t("szRegistry.exportSelectedError"));
            else toast.error(t("szRegistry.exportError"), t("szRegistry.exportErrorHint"));
        } finally {
            setExporting(false);
        }
    }, [scope, searchQuery, kindId, overdueOnly, statusFilter, advanced, t]);

    /**
     * Звёздочку в строке переключили. На вкладке «Избранное» снятая отметка убирает строку,
     * на остальных — просто перекрашиваем звёздочку. Счётчики вкладок обновляем отдельно,
     * без перезагрузки таблицы.
     */
    const handleFavoriteChange = useCallback((id: number, isFavorite: boolean) => {
        if (scope === "favorites" && !isFavorite) {
            setItems((prev) => prev.filter((i) => i.id !== id));
            setTotal((n) => Math.max(0, n - 1));
            if (selected.has(id)) toggleRow(id);
        } else {
            setItems((prev) => prev.map((i) => (i.id === id ? {...i, isFavorite} : i)));
        }
        szService.counters().then(setCounters).catch(() => {
        });
    }, [scope, selected, toggleRow]);

    /** Что можно сделать с избранным у отмеченных строк: кнопки панели показываем по делу. */
    const selectedItems = items.filter((i) => selected.has(i.id));
    const canAddFavorites = selectedItems.some((i) => !i.isFavorite);
    const canRemoveFavorites = selectedItems.some((i) => i.isFavorite);

    /**
     * Массово добавить/убрать отмеченные записки из «Избранного». Строки обновляем на месте,
     * без перезагрузки таблицы; на вкладке «Избранное» убранные записки исчезают из списка.
     */
    const runBulkFavorites = useCallback(async (add: boolean) => {
        const ids = [...selected];
        setFavoriteBusy(true);
        try {
            const res = add
                ? await szService.addManyToFavorites(ids)
                : await szService.removeManyFromFavorites(ids);
            const failed = new Set(res.failed.map((f) => f.szId));
            const done = new Set(ids.filter((id) => !failed.has(id)));

            if (scope === "favorites" && !add) {
                setItems((prev) => prev.filter((i) => !done.has(i.id)));
                setTotal((n) => Math.max(0, n - done.size));
            } else {
                setItems((prev) => prev.map((i) => (done.has(i.id) ? {...i, isFavorite: add} : i)));
            }
            clear();
            toast.success(
                t(add ? "szRegistry.favoritesAddedToast" : "szRegistry.favoritesRemovedToast", {count: res.succeeded}),
                failed.size > 0 ? t("szRegistry.favoritesSkipped", {count: failed.size}) : undefined,
            );
            szService.counters().then(setCounters).catch(() => {
            });
        } catch {
            toast.error(t("favorites.toggleError"));
        } finally {
            setFavoriteBusy(false);
        }
    }, [selected, scope, clear, t]);

    const filterless = isFilterlessScope(scope, dataScope);

    /** Что сейчас включено в фильтрах: по чипсу на условие, у каждого свой «снять». */
    const activeChips: ActiveFilterChip[] = [];
    if (!filterless) {
        if (searchQuery.trim()) {
            activeChips.push({
                key: "query",
                label: `${t("szRegistry.activeFilters.query")}: «${searchQuery.trim()}»`,
                onRemove: () => setQuery(""),
            });
        }
        if (kindId !== "") {
            activeChips.push({
                key: "kind",
                label: `${t("szRegistry.activeFilters.kind")}: ${kindName(kindId, `#${kindId}`)}`,
                onRemove: () => setKindId(""),
            });
        }
        if (statusFilter && !scopeHasStatuses(scope)) {
            activeChips.push({
                key: "status",
                label: t(`szRegistry.status.${statusFilter}`),
                onRemove: () => setStatusFilter(""),
            });
        }
        if (overdueOnly) {
            activeChips.push({key: "overdue", label: t("szRegistry.overdueOnly"), onRemove: () => setOverdueOnly(false)});
        }
        if (advanced.regNumber.trim()) {
            activeChips.push({
                key: "regNumber",
                label: `${t("szRegistry.advanced.code")}: ${advanced.regNumber.trim()}`,
                onRemove: () => setAdvanced((a) => ({...a, regNumber: ""})),
            });
        }
        if (advanced.title.trim()) {
            activeChips.push({
                key: "title",
                label: `${t("szRegistry.advanced.title")}: ${advanced.title.trim()}`,
                onRemove: () => setAdvanced((a) => ({...a, title: ""})),
            });
        }
        if (advanced.authorIds.length > 0) {
            activeChips.push({
                key: "authors",
                label: `${t("szRegistry.advanced.author")}: ${advanced.authorIds.length}`,
                onRemove: () => setAdvanced((a) => ({...a, authorIds: []})),
            });
        }
        if (advanced.paperOnly) {
            activeChips.push({
                key: "paperOnly",
                label: t("szRegistry.advanced.paperCarrier"),
                onRemove: () => setAdvanced((a) => ({...a, paperOnly: false})),
            });
        }
        const dateChips: [keyof Pick<SzAdvancedFilters, "registeredDate" | "dueDate">, string][] = [
            ["registeredDate", t("szRegistry.advanced.registeredDate")],
            ["dueDate", t("szRegistry.advanced.dueDate")],
        ];
        for (const [field, title] of dateChips) {
            const text = dateFilterText(advanced[field]);
            if (!text) continue;
            activeChips.push({
                key: field,
                label: `${title}: ${text}`,
                onRemove: () => setAdvanced((a) => ({...a, [field]: EMPTY_DATE_FILTER})),
            });
        }
    }

    /** «Снять фильтры»: все условия разом; вкладка остаётся той же. */
    const resetFilters = () => {
        setQuery("");
        setKindId("");
        setOverdueOnly(false);
        setStatusFilter("");
        setAdvanced(EMPTY_SZ_ADVANCED);
    };

    return (
        <div className="px-7 py-6">
            <div className="flex items-start justify-between gap-4">
                {/* Централизованный реестр служебных записок · регистрация, сроки исполнения и статусы согласования */}
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">{t("szRegistry.title")}</h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        {t("szRegistry.subtitle")}
                    </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                    <button
                        onClick={() => navigate("/sz-analytics")}
                        className="inline-flex items-center gap-2 h-[42px] px-[18px] rounded-[11px] border-none bg-[#2f68f5] text-white font-semibold text-[13.5px] cursor-pointer shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]"
                    >
                        <ChartLine className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {/* Аналитика по СЗ */}
                        {t("szRegistry.analyticsButton")}
                    </button>
                    <button
                        onClick={() => navigate("/sz/new")}
                        className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06]">
                        <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                        {/* Создать СЗ */}
                        {t("szRegistry.create")}
                    </button>
                </div>
            </div>

            <RegistryTabs scope={scope} counters={counters} onSelect={setScope} hidden={hiddenScopes}/>

            {/* В "Согласую я" фильтры не применяются - список формирует сам движок согласования. */}
            <RegistryFilterBar
                hidden={filterless}
                showStatusFilter={!scopeHasStatuses(scope)}
                query={query}
                onQueryChange={setQuery}
                kinds={kinds}
                kindTitle={kindTitle}
                kindId={kindId}
                onKindChange={setKindId}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                overdueOnly={overdueOnly}
                onOverdueChange={setOverdueOnly}
                total={total}
                exporting={exporting}
                onExport={() => void runExport()}
            />

            {/* Сохранённые фильтры (БП-16): применить/сохранить именованную выборку. */}
            {!filterless && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <SavedFiltersBar
                        scope="sz"
                        onReset={resetFilters}
                        current={{
                            scope, query, kindId: kindId === "" ? null : kindId, overdueOnly,
                            status: statusFilter || null,
                            advanced: hasAdvancedFilters(advanced) ? advanced : null,
                        }}
                        onApply={(p) => {
                            const f = p as {
                                scope?: ScopeId;
                                query?: string;
                                kindId?: number | null;
                                overdueOnly?: boolean;
                                status?: SzStatusCode | null;
                                advanced?: Partial<SzAdvancedFilters> | null;
                            };
                            if (f.scope) setScope(f.scope);
                            setQuery(f.query ?? "");
                            setKindId(f.kindId == null ? "" : f.kindId);
                            setOverdueOnly(!!f.overdueOnly);
                            setStatusFilter(f.status ?? "");
                            setAdvanced({...EMPTY_SZ_ADVANCED, ...(f.advanced ?? {})});
                        }}
                    />
                    {/* Расширенный поиск — справа от сохранённых фильтров */}
                    <SzAdvancedSearchToggle
                        open={advOpen}
                        active={hasAdvancedFilters(advanced)}
                        onToggle={() => setAdvOpen((v) => !v)}
                    />
                </div>
            )}

            {/* Включённые фильтры: что отфильтровано сейчас, каждое условие можно снять */}
            <ActiveFilterChips
                chips={activeChips}
                label={t("szRegistry.activeFilters.label")}
                removeLabel={t("szRegistry.activeFilters.remove")}
            />

            {/* Расширенный поиск: код, тема, автор, дата регистрации, срок исполнения */}
            {!filterless && (
                <SzAdvancedSearchPanel
                    open={advOpen}
                    value={advanced}
                    onApply={setAdvanced}
                    onClose={() => setAdvOpen(false)}
                />
            )}

            {error && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {scope === "originals" ? (
                /* Оригиналы на руках */
                <OriginalsTable originals={originals} loading={loading}/>
            ) : scope === "assignments" ? (
                /* Мои поручения */
                <AssignmentsTable assignments={assignments} loading={loading}/>
            ) : (
                <>
                    {/* Якорь: при смене страницы прокручиваем сюда, к началу таблицы */}
                    <div ref={tableTopRef} className="scroll-mt-4"/>
                    {selected.size > 0 && (
                        /* Панель массовых операций - сдать в архив, экспорт выбранных */
                        <BulkActionsBar
                            count={selected.size}
                            exporting={exporting}
                            onExport={() => void runExport([...selected])}
                            onArchive={() => setBulkArchiveOpen(true)}
                            canArchive={isClerk}
                            onClear={clear}
                            canAddFavorites={canAddFavorites}
                            canRemoveFavorites={canRemoveFavorites}
                            favoriteBusy={favoriteBusy}
                            onAddFavorites={() => void runBulkFavorites(true)}
                            onRemoveFavorites={() => void runBulkFavorites(false)}
                        />
                    )}
                    {/* Основная таблица реестра служебных записок с выбором строк */}
                    <MemosTable
                        items={items}
                        loading={loading}
                        appliedQuery={appliedQuery}
                        kindName={kindName}
                        selected={selected}
                        toggleRow={toggleRow}
                        toggleAll={toggleAll}
                        allOnPageSelected={allOnPageSelected}
                        onFavoriteChange={handleFavoriteChange}
                    />
                    <Pagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        pageSizeOptions={PAGE_SIZES}
                        disabled={loading}
                    />
                </>
            )}

            {bulkArchiveOpen && (
                /* Массовая сдача записок в архив */
                <SzBulkArchiveModal
                    ids={[...selected]}
                    onClose={() => setBulkArchiveOpen(false)}
                    onDone={(res) => {
                        if (res.succeeded > 0) {
                            toast.success(t("szRegistry.archivedToast", {count: res.succeeded}));
                            clear();
                            void load();
                        }
                    }}
                />
            )}
        </div>
    );
}
