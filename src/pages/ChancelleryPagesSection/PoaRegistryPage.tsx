/**
 * Секция "Канцелярия"
 * Реестр доверенностей, страница "Доверенности"
 *
 * Сверху - истекающие. Доверенность, о которой вспомнили в день окончания, уже
 * стоила кому-то сорванной сделки: продлевают заранее, и список должен об этом
 * напоминать сам, а не ждать, пока в него заглянут.
 */
import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {
    poaService,
    POA_STATUS_ORDER,
    type Poa,
    type PoaFilter,
    type PoaStatus,
} from "@/service/poaService/poaService.ts";
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {PoaEditModal} from "@/components/componentsPoa/PoaEditModal.tsx";
import {PoaCardModal} from "@/components/componentsPoa/PoaCardModal.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";
import {Pagination} from "@/components/componentsGeneral/Pagination.tsx";
import {SavedFiltersBar} from "@/components/componentsGeneral/SavedFiltersBar.tsx";
import {ActiveFilterChips, type ActiveFilterChip} from "@/components/componentsGeneral/ActiveFilterChips.tsx";
import {PoaAdvancedSearchPanel, PoaAdvancedSearchToggle} from "@/components/componentsPoa/PoaAdvancedSearch.tsx";
import {
    EMPTY_POA_ADVANCED,
    dateFilterText,
    hasPoaAdvancedFilters,
    poaAdvancedToFilter,
    poaFilterConflicts,
    type PoaAdvancedFilters,
} from "@/components/componentsPoa/poaRegistryModel.ts";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {useUserLookup} from "@/hooks/useUserLookup.ts";
import {
    Badge, Cell, DataTable, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {AlertTriangle, Download, Info, Plus} from "lucide-react";

const STATUS_TONE: Record<PoaStatus, BadgeTone> = {
    Active: "good",
    Draft: "neutral",
    OnApproval: "info",
    Expired: "neutral",
    Revoked: "bad",
};

/** За сколько дней доверенность считается истекающей. Столько же берёт фоновая служба. */
const EXPIRING_DAYS = 30;

/** Пауза после ввода в строке поиска - как в реестре служебных записок. */
const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_KEY = "delosfera.poa.registry.pageSize";

function readPageSize(): number {
    try {
        const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
        return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
    } catch {
        return DEFAULT_PAGE_SIZE;
    }
}

/** Что хранится в сохранённом фильтре реестра (scope "poa"). */
interface PoaSavedPayload {
    query?: string;
    status?: PoaStatus | null;
    advanced?: Partial<PoaAdvancedFilters> | null;
}

export function PoaRegistryPage() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManagePowersOfAttorney);

    const {users} = useUserLookup();
    const userName = (id: number) => users.find((u) => u.id === id)?.fullName ?? `#${id}`;

    const [rows, setRows] = useState<Poa[]>([]);
    const [total, setTotal] = useState(0);
    const [expiring, setExpiring] = useState<Poa[]>([]);
    const [status, setStatus] = useState<PoaStatus | "">("");
    const [text, setText] = useState("");
    /** Текст, по которому список реально отобран - его и подсвечиваем */
    const [appliedText, setAppliedText] = useState("");
    const [advanced, setAdvanced] = useState<PoaAdvancedFilters>(EMPTY_POA_ADVANCED);
    const [advOpen, setAdvOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(readPageSize);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    /** Номер последнего запроса: ответ устаревшего запроса не должен перетереть свежий. */
    const requestRef = useRef(0);

    const [editing, setEditing] = useState<Poa | null | "new">(null);
    const [opened, setOpened] = useState<number | null>(null);

    // Поиск по мере ввода, с паузой; Enter применяет сразу.
    useEffect(() => {
        const trimmed = text.trim();
        if (trimmed === appliedText) return;
        const timer = setTimeout(() => setAppliedText(trimmed), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [text, appliedText]);

    // Любое изменение условий - снова с первой страницы.
    const filterKey = JSON.stringify([status, appliedText, advanced, pageSize]);
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPage(1);
    }

    /** Условия реестра в виде запроса - общие для страницы и выгрузки в Excel. */
    const buildFilter = useCallback((): PoaFilter => ({
        ...poaAdvancedToFilter(advanced),
        statuses: status ? [status] : undefined,
        text: appliedText || undefined,
    }), [advanced, status, appliedText]);

    const load = useCallback(async () => {
        const request = ++requestRef.current;
        setLoading(true);
        try {
            const list = await poaService.search({...buildFilter(), page, pageSize});
            if (request !== requestRef.current) return;
            setRows(list.items);
            setTotal(list.total);
        } catch {
            if (request === requestRef.current) toast.error(t("poaRegistryPage.loadFailed") /* Не удалось загрузить реестр */);
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [buildFilter, page, pageSize, t]);

    /** Истекающие - вне фильтров: это напоминание, а не выборка. Перечитываем только после изменений. */
    const loadExpiring = useCallback(async () => {
        try {
            setExpiring(await poaService.expiring(EXPIRING_DAYS));
        } catch {
            // Блок напоминания просто не покажется; реестр об ошибке скажет сам.
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        void loadExpiring();
    }, [loadExpiring]);

    const reloadAll = () => {
        void load();
        void loadExpiring();
    };

    const changePageSize = (size: number) => {
        setPageSize(size);
        try {
            localStorage.setItem(PAGE_SIZE_KEY, String(size));
        } catch {
            // Размер страницы просто не запомнится.
        }
    };

    const runExport = async () => {
        setExporting(true);
        try {
            await poaService.exportRegistry(buildFilter());
            toast.success(t("poaRegistryPage.exportDone") /* Реестр выгружен */);
        } catch {
            toast.error(t("poaRegistryPage.exportFailed") /* Не удалось выгрузить реестр */);
        } finally {
            setExporting(false);
        }
    };

    const daysUntil = (validTo: string) =>
        // eslint-disable-next-line react-hooks/purity
        Math.round((new Date(validTo).getTime() - Date.now()) / 86_400_000);

    const noNumber = t("poaRegistryPage.noNumber"); /* б/н */
    // Слова запроса подсвечиваем каждое отдельно - так ищет и сервер.
    const terms = splitSearchTerms(appliedText);

    const advancedActive = hasPoaAdvancedFilters(advanced);
    const anyFilter = !!status || !!appliedText || advancedActive;
    const conflicts = poaFilterConflicts(status, advanced);

    // Включённые условия чипсами: видно, что отфильтровано, и каждое можно снять.
    const chips: ActiveFilterChip[] = [];
    const setAdv = (patch: Partial<PoaAdvancedFilters>) => setAdvanced((a) => ({...a, ...patch}));
    if (appliedText) {
        chips.push({
            key: "query",
            label: `${t("poaRegistryPage.chips.query") /* Поиск */}: «${appliedText}»`,
            onRemove: () => {
                setText("");
                setAppliedText("");
            },
        });
    }
    if (status) {
        chips.push({key: "status", label: t(`poaRegistryPage.statuses.${status}`), onRemove: () => setStatus("")});
    }
    if (advanced.regNumber.trim()) {
        chips.push({
            key: "regNumber",
            label: `${t("poaRegistryPage.advanced.regNumber")}: ${advanced.regNumber.trim()}`,
            onRemove: () => setAdv({regNumber: ""}),
        });
    }
    if (advanced.powers.trim()) {
        chips.push({
            key: "powers",
            label: `${t("poaRegistryPage.advanced.powers")}: ${advanced.powers.trim()}`,
            onRemove: () => setAdv({powers: ""}),
        });
    }
    if (advanced.grantorIds.length > 0) {
        chips.push({
            key: "grantors",
            label: `${t("poaRegistryPage.advanced.grantor")}: ${advanced.grantorIds.length === 1
                ? userName(advanced.grantorIds[0]) : advanced.grantorIds.length}`,
            onRemove: () => setAdv({grantorIds: []}),
        });
    }
    if (advanced.holderIds.length > 0) {
        chips.push({
            key: "holders",
            label: `${t("poaRegistryPage.advanced.holder")}: ${advanced.holderIds.length === 1
                ? userName(advanced.holderIds[0]) : advanced.holderIds.length}`,
            onRemove: () => setAdv({holderIds: []}),
        });
    }
    if (advanced.holderName.trim()) {
        chips.push({
            key: "holderName",
            label: `${t("poaRegistryPage.advanced.holderName")}: ${advanced.holderName.trim()}`,
            onRemove: () => setAdv({holderName: ""}),
        });
    }
    if (advanced.holderKind) {
        chips.push({
            key: "holderKind",
            label: t(`poaCard.holderKinds.${advanced.holderKind}`),
            onRemove: () => setAdv({holderKind: ""}),
        });
    }
    if (advanced.validOn) {
        chips.push({
            key: "validOn",
            label: `${t("poaRegistryPage.advanced.validOn")}: ${advanced.validOn}`,
            onRemove: () => setAdv({validOn: ""}),
        });
    }
    if (advanced.allowsDelegation) {
        chips.push({
            key: "delegation",
            label: t("poaRegistryPage.advanced.allowsDelegation"),
            onRemove: () => setAdv({allowsDelegation: false}),
        });
    }
    for (const [field, title] of [
        ["issuedDate", t("poaRegistryPage.advanced.issuedDate")],
        ["validToDate", t("poaRegistryPage.advanced.validToDate")],
    ] as const) {
        const value = dateFilterText(advanced[field]);
        if (value) chips.push({key: field, label: `${title}: ${value}`, onRemove: () => setAdv({[field]: EMPTY_DATE_FILTER})});
    }

    const resetFilters = () => {
        setText("");
        setAppliedText("");
        setStatus("");
        setAdvanced(EMPTY_POA_ADVANCED);
    };

    const applySaved = (payload: Record<string, unknown>) => {
        const f = payload as PoaSavedPayload;
        const query = f.query ?? "";
        setText(query);
        setAppliedText(query.trim());
        setStatus(f.status ?? "");
        setAdvanced({...EMPTY_POA_ADVANCED, ...(f.advanced ?? {})});
    };

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px] flex flex-col gap-4">
            <PageHeader
                title={t("poaRegistryPage.title") /* Доверенности */}
                description={t("poaRegistryPage.description") /* Кто, кому, на что и на какой срок */}
                actions={canManage ? (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {t("poaRegistryPage.grant") /* Выдать доверенность */}
                    </button>
                ) : undefined}
            />
            {/* Истекающие наверху: продлевают заранее, а не в день окончания. */}
            {expiring.length > 0 && (
                <section className="rounded-[14px] border border-[#f0dcc0] bg-[#fdf8ee] p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                        <AlertTriangle size={17} className="text-[#b3730a]"/>
                        <h2 className="m-0 text-[14px] font-semibold text-[#7a5407]">
                            {t("poaRegistryPage.expiringTitle", {days: EXPIRING_DAYS, total: expiring.length})
                                /* Истекают в ближайшие N дней — M */}
                        </h2>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {expiring.slice(0, 8).map((poa) => (
                            <button
                                key={poa.id}
                                type="button"
                                onClick={() => setOpened(poa.id)}
                                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[9px]
                                           border border-[#e7dcc4] bg-white px-3 py-2 text-left cursor-pointer
                                           transition hover:border-[#b3730a]"
                            >
                                <span className="font-mono text-[12px] text-[#8b97ab]">
                                    {poa.regNumber ?? noNumber}
                                </span>
                                <span className="inline-flex items-center gap-2 self-center text-[13.5px] font-medium text-[#1c2740]">
                                    <Avatar name={poa.holderName} size={22}/>
                                    {poa.holderName}
                                </span>
                                <span className="text-[12.5px] text-[#8b97ab]">
                                    {poa.holderUnit ?? poa.holderPosition ?? ""}
                                </span>
                                <span className="ml-auto text-[12.5px] font-medium text-[#b3730a]">
                                    {t("poaRegistryPage.until", {date: formatDate(poa.validTo)}) /* до … */}
                                    {" · "}{formatDaysLeft(daysUntil(poa.validTo), t)}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Строка фильтров: поиск, состояние, выгрузка */}
            <div className="flex flex-wrap items-center gap-2.5">
                <SearchBar
                    variant="white"
                    accent="violet"
                    value={text}
                    onChange={setText}
                    onSubmit={() => setAppliedText(text.trim())}
                    placeholder={t("poaRegistryPage.searchPlaceholder") /* ФИО, номер или фраза из полномочий */}
                    className="min-w-[280px] flex-1"
                />
                <SelectDropdown
                    options={[
                        {value: "", label: t("poaRegistryPage.allStatuses") /* Все состояния */},
                        ...POA_STATUS_ORDER.map((value) => ({
                            value,
                            label: t(`poaRegistryPage.statuses.${value}`),
                        })),
                    ]}
                    value={status}
                    onChange={(v) => setStatus(v as PoaStatus | "")}
                    minWidth="190px"
                    accent="violet"
                />
                <div className="text-[12.5px] text-[#8b97ab]">
                    {t("poaRegistryPage.found") /* Найдено */}: <b className="font-mono text-[#3a4560]">{total}</b>
                </div>
                <button
                    type="button"
                    onClick={() => void runExport()}
                    disabled={exporting || total === 0}
                    className="inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="w-4 h-4"/>
                    {exporting
                        ? t("poaRegistryPage.exporting") /* Выгружаем… */
                        : t("poaRegistryPage.exportExcel") /* Выгрузить в Excel */}
                </button>
            </div>

            {/* Сохранённые фильтры и расширенный поиск - как в реестре служебных записок */}
            <div className="-mt-1.5 flex flex-wrap items-center gap-2">
                <SavedFiltersBar
                    scope="poa"
                    onReset={resetFilters}
                    current={{
                        query: appliedText,
                        status: status || null,
                        advanced: advancedActive ? advanced : null,
                    }}
                    onApply={applySaved}
                />
                <PoaAdvancedSearchToggle
                    open={advOpen}
                    active={advancedActive}
                    onToggle={() => setAdvOpen((v) => !v)}
                />
            </div>

            <PoaAdvancedSearchPanel
                open={advOpen}
                value={advanced}
                onApply={setAdvanced}
                onClose={() => setAdvOpen(false)}
            />

            {chips.length > 0 && (
                <div className="-mt-2.5 flex flex-wrap items-center gap-2">
                    <ActiveFilterChips
                        chips={chips}
                        label={t("poaRegistryPage.chips.label") /* Активные фильтры */}
                        removeLabel={t("poaRegistryPage.removeFilter") /* Снять фильтр */}
                    />
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-2.5 h-7 cursor-pointer rounded-full border-none bg-transparent px-2 text-[12.5px] font-semibold text-[#8b97ab] hover:text-[#4e57d6]"
                    >
                        {t("poaRegistryPage.chips.resetAll") /* Сбросить все */}
                    </button>
                </div>
            )}

            {/* Сочетания условий, которые заведомо ничего не находят, - говорим заранее, почему пусто. */}
            {conflicts.length > 0 && (
                <div className="flex flex-col gap-1 rounded-[10px] border border-[#f0dcc0] bg-[#fdf8ee] px-4 py-2.5">
                    {conflicts.map((code) => (
                        <div key={code} className="flex items-start gap-2 text-[13px] text-[#7a5407]">
                            <Info size={15} className="mt-[2px] flex-none text-[#b3730a]"/>
                            {t(`poaRegistryPage.conflicts.${code}`)}
                        </div>
                    ))}
                </div>
            )}

            {loading && rows.length === 0 ? (
                <Loader label={t("poaRegistryPage.loading") /* Загружаем реестр… */}/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title={t("poaRegistryPage.emptyTitle") /* Доверенностей нет */}
                    description={anyFilter
                        ? t("poaRegistryPage.emptyForFilters") /* По заданным условиям ничего не нашлось. */
                        : t("poaRegistryPage.emptyRegistry") /* Реестр пуст. */}
                />
            ) : (
                <div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <DataTable
                        headers={[
                            t("poaRegistryPage.columns.number"), /* Номер */
                            t("poaRegistryPage.columns.grantor"), /* Доверитель */
                            t("poaRegistryPage.columns.holder"), /* Кому */
                            t("poaRegistryPage.columns.unit"), /* Подразделение */
                            t("poaRegistryPage.columns.powers"), /* Полномочия */
                            t("poaRegistryPage.columns.period"), /* Срок */
                            t("poaRegistryPage.columns.status"), /* Состояние */
                        ]}
                    >
                        {rows.map((poa) => {
                            const days = daysUntil(poa.validTo);
                            const soon = poa.status === "Active" && days <= EXPIRING_DAYS;

                            return (
                                <Row key={poa.id} onClick={() => setOpened(poa.id)} alert={soon && days < 0}>
                                    <Cell mono>
                                        {poa.regNumber
                                            ? <HighlightSubstrings text={poa.regNumber} terms={terms}/>
                                            : noNumber}
                                    </Cell>
                                    {/* Доверитель и Кому — с аватаркой-инициалами, как в реестре служебных записок */}
                                    <Cell>
                                        {poa.grantorName ? (
                                            <span className="flex min-w-[160px] items-center gap-2">
                                                <Avatar name={poa.grantorName} size={24}/>
                                                <span className="min-w-0">
                                                    <HighlightSubstrings text={poa.grantorName} terms={terms}/>
                                                </span>
                                            </span>
                                        ) : <span className="text-[#a3adbd]">—</span>}
                                    </Cell>
                                    <Cell strong>
                                        <span className="flex min-w-[160px] items-start gap-2">
                                            <Avatar name={poa.holderName} size={24}/>
                                            <span className="min-w-0 pt-[2px]">
                                                <HighlightSubstrings text={poa.holderName} terms={terms}/>
                                                {poa.parentRegNumber && (
                                                    <span className="block font-mono text-[11px] font-normal text-[#8b97ab]">
                                                        {t("poaRegistryPage.subDelegation", {number: poa.parentRegNumber})
                                                            /* передоверие по … */}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </Cell>
                                    <Cell>{poa.holderUnit ?? poa.holderPosition ?? "—"}</Cell>
                                    <Cell className="max-w-[380px]">
                                        <span className="line-clamp-2">
                                            <HighlightSubstrings text={poa.powers} terms={terms}/>
                                        </span>
                                        {poa.amountLimit !== null && (
                                            <span className="mt-0.5 block font-mono text-[11.5px] text-[#8b97ab]">
                                                {t("poaRegistryPage.amountLimit", {
                                                    amount: poa.amountLimit.toLocaleString("ru-RU"),
                                                    currency: poa.amountCurrency,
                                                }) /* до … */}
                                            </span>
                                        )}
                                    </Cell>
                                    <Cell mono>
                                        {formatDate(poa.validFrom)} — {formatDate(poa.validTo)}
                                        {soon && (
                                            <span className="mt-0.5 block text-[11.5px] font-semibold text-[#b3730a]">
                                                {formatDaysLeft(days, t)}
                                            </span>
                                        )}
                                    </Cell>
                                    <Cell nowrap>
                                        <Badge tone={STATUS_TONE[poa.status]}>
                                            {t(`poaRegistryPage.statuses.${poa.status}`)}
                                        </Badge>
                                    </Cell>
                                </Row>
                            );
                        })}
                    </DataTable>

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
            )}

            {editing !== null && (
                <PoaEditModal
                    poa={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    // Модалка остаётся открытой и сама показывает «Сохранено» - закрывает пользователь.
                    onSaved={reloadAll}
                />
            )}

            {opened !== null && (
                <PoaCardModal
                    id={opened}
                    canManage={canManage}
                    onClose={() => setOpened(null)}
                    onChanged={reloadAll}
                    onEdit={(poa) => {
                        setOpened(null);
                        setEditing(poa);
                    }}
                />
            )}
        </div>
    );
}
