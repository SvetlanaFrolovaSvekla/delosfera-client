import {useMemo, useState} from "react";

import type {VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {
    DateFilterGroup,
    EMPTY_DATE_FILTER,
    type DateFilterValue,
} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";

import {
    ActualizationFilterPills,
    type ActualizationFilterValue,
} from "@/components/componentsVND/componentsActualizationPage/ActualizationFilterPills.tsx";
import {ActualizationSummaryCards} from "@/components/componentsVND/componentsActualizationPage/ActualizationSummaryCards.tsx";
import {ActualizationTable} from "@/components/componentsVND/componentsActualizationPage/ActualizationTable.tsx";

import {useVndActualizationSummary} from "@/hooks/vndHooks/useVndActualizationSummary.tsx";
import {useVndActualizationFilteredRows} from "@/hooks/vndHooks/useVndActualizationFilteredRows.tsx";
import {useVndActualizationColumnVisibility} from "@/hooks/vndHooks/useVndActualizationColumnVisibility.tsx";

import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {MultiSelectDropdown} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectDropdown.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {ChevronDown, ChevronUp, Filter, SlidersHorizontal} from "lucide-react";
import {
    ActualizationPageHeader
} from "@/components/componentsVND/componentsActualizationPage/ActualizationPageHeader.tsx";
import {
    ActualizationRequestsPanel
} from "@/components/componentsVND/componentsActualizationPage/ActualizationRequestsPanel.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";

function toDateRangeFilter(v: DateFilterValue): VndSearchRequest["dueActualizationDate"] {
    if (v.mode === "exact") {
        return v.exact ? {exact: v.exact} : undefined;
    }
    return v.from || v.to
        ? {from: v.from || undefined, to: v.to || undefined}
        : undefined;
}

export function ActualizationPage() {
    const {hasPermission} = useAuth();
    const isChiefEditor =
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);

    const {
        types, organs, orgUnits, keywords, rubrics, secrecyLevels, userGroups,
        typeOptions, organOptions, orgUnitOptions,
        loading: dictLoading,
    } = useDictionaries();

    // Мапы для расшифровки id → имя в таблице (id из бэка приходят как number)
    const orgUnitMap = useMemo(() => new Map(orgUnits.map((o) => [o.id, o])), [orgUnits]);
    const keywordMap = useMemo(() => new Map(keywords.map((k) => [k.id, k])), [keywords]);
    const securityLevelMap = useMemo(() => new Map(secrecyLevels.map((s) => [s.id, s])), [secrecyLevels]);
    const userGroupMap = useMemo(() => new Map(userGroups.map((g) => [g.id, g])), [userGroups]);
    const rubricMap = useMemo(() => new Map(rubrics.map((r) => [r.id, r])), [rubrics]);
    // types/organs пока используются только через *Options ниже, но оставила деструктуризацию
    // на случай если понадобится расшифровка вида документа / органа утверждения в таблице
    void types;
    void organs;

    const orgUnitName = (id: number) => orgUnitMap.get(id)?.name ?? "—";
    const keywordNames = (ids: number[]) =>
        ids.map((id) => keywordMap.get(id)?.name).filter(Boolean).join(", ") || "—";
    const secrecyLevelName = (id?: number) => (id != null ? securityLevelMap.get(id)?.name ?? "—" : "—");
    const userGroupNames = (ids: number[]) =>
        ids.map((id) => userGroupMap.get(id)?.name).filter(Boolean).join(", ") || "—";
    const responsibleExecutorNames = (ids: number[]) =>
        ids.map((id) => orgUnitName(id)).filter((n) => n !== "—").join(", ") || "—";
    const rubricNames = (ids: number[]) =>
        ids.map((id) => rubricMap.get(id)?.name).filter(Boolean).join(", ") || "—";

    const [search, setSearch] = useState("");
    const [bucketFilter, setBucketFilter] = useState<ActualizationFilterValue>("all");

    const [advOpen, setAdvOpen] = useState(false);
    const [typeFilters, setTypeFilters] = useState<string[]>([]);
    const [developerFilters, setDeveloperFilters] = useState<string[]>([]);
    const [organFilters, setOrganFilters] = useState<string[]>([]);
    const [dueDateFilter, setDueDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);

    const {summary, loading: summaryLoading} = useVndActualizationSummary();
    const {
        visibleCols, toggleColumn, selectAllColumns, deselectAllColumns,
        columns, gridTemplate, toggleableColumns,
    } = useVndActualizationColumnVisibility();

    const dueActualizationDate = toDateRangeFilter(dueDateFilter);

    const hasAdvancedFilters =
        typeFilters.length > 0 || developerFilters.length > 0 || organFilters.length > 0 ||
        Boolean(dueActualizationDate);

    const searchRequest = useMemo<VndSearchRequest>(() => ({
        name: search || undefined,
        actualizationBuckets: bucketFilter === "all" ? [] : [bucketFilter],
        typeIds: typeFilters.length ? typeFilters.map(Number) : undefined,
        developerIds: developerFilters.length ? developerFilters.map(Number) : undefined,
        organIds: organFilters.length ? organFilters.map(Number) : undefined,
        dueActualizationDate,
    }), [search, bucketFilter, typeFilters, developerFilters, organFilters, dueActualizationDate]);

    const {rows, loading, error} = useVndActualizationFilteredRows(searchRequest);

    const resetFilters = () => {
        setSearch("");
        setBucketFilter("all");
        setTypeFilters([]);
        setDeveloperFilters([]);
        setOrganFilters([]);
        setDueDateFilter(EMPTY_DATE_FILTER);
    };

    const selectedColumnKeys = toggleableColumns
        .filter((c) => visibleCols[c.key] !== false)
        .map((c) => c.key);

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <ActualizationPageHeader/>

            {isChiefEditor && <ActualizationRequestsPanel/>}

            <ActualizationSummaryCards
                summary={summary}
                loading={summaryLoading}
                activeBucket={bucketFilter}
                onSelectBucket={(key) => setBucketFilter((prev) => (prev === key ? "all" : key))}
            />

            <ActualizationFilterPills value={bucketFilter} onChange={setBucketFilter} summary={summary}/>

            <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
                <SearchBar
                    variant="white"
                    value={search}
                    onChange={setSearch}
                    placeholder="Поиск по коду или наименованию…"
                    className="min-w-[280px]"
                />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap mb-[15px]">
                <button
                    onClick={() => setAdvOpen((v) => !v)}
                    className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                        advOpen
                            ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                            : "border-[#e5e9f0] bg-white"
                    }`}
                >
                    <SlidersHorizontal className="w-[15px] h-[15px]" strokeWidth={1.8}/>
                    Расширенный поиск
                    <ChevronDown
                        className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${advOpen ? "rotate-180" : ""}`}
                        strokeWidth={2}
                    />
                </button>

                <MultiSelectDropdown
                    icon={<Filter className="w-[15px] h-[15px]" strokeWidth={1.8}/>}
                    triggerLabel="Колонки"
                    label="Отображение колонок"
                    options={toggleableColumns.map((c) => ({key: c.key, label: c.label}))}
                    selectedKeys={selectedColumnKeys}
                    onToggle={toggleColumn}
                    onSelectAll={selectAllColumns}
                    onDeselectAll={deselectAllColumns}
                    searchThreshold={8}
                    searchPlaceholder="Поиск колонки…"
                />

                <div className="flex-1"/>

                {(hasAdvancedFilters || search || bucketFilter !== "all") && (
                    <button
                        onClick={resetFilters}
                        className="inline-flex items-center h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        Сбросить фильтры
                    </button>
                )}

                <div className="text-[12.5px] text-[#8b97ab]">
                    Найдено: <b className="text-[#3a4560] font-mono">{rows.length}</b>
                </div>
            </div>

            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-in-out ${
                    advOpen ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0 mb-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl px-[22px] py-5">
                        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-x-[18px] gap-y-3.5 mb-[18px]">
                            <MultiSelectField
                                label="Вид документа"
                                modalTitle="Вид документа"
                                options={typeOptions}
                                selectedKeys={typeFilters}
                                onChange={setTypeFilters}
                                searchPlaceholder="Поиск вида документа…"
                            />
                            <MultiSelectField
                                label="Разработчик"
                                modalTitle="Разработчик (СП)"
                                options={orgUnitOptions}
                                selectedKeys={developerFilters}
                                onChange={setDeveloperFilters}
                                searchPlaceholder="Поиск подразделения…"
                                hierarchical
                            />
                            <MultiSelectField
                                label="Орган утверждения"
                                modalTitle="Орган утверждения"
                                options={organOptions}
                                selectedKeys={organFilters}
                                onChange={setOrganFilters}
                                searchPlaceholder="Поиск органа утверждения…"
                                hierarchical
                            />
                        </div>

                        <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-[18px] max-w-[380px]">
                            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                Срок актуализации
                            </div>
                            <DateFilterGroup
                                rows={[
                                    {
                                        key: "dueActualization",
                                        label: "Срок актуализации",
                                        value: dueDateFilter,
                                        onChange: setDueDateFilter,
                                    },
                                ]}
                            />
                        </div>

                        <div className="flex justify-end gap-2.5">
                            <button
                                onClick={() => setAdvOpen(false)}
                                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                <ChevronUp className="w-[15px] h-[15px]" strokeWidth={2}/>
                                Свернуть
                            </button>
                            <button
                                onClick={() => {
                                    setTypeFilters([]);
                                    setDeveloperFilters([]);
                                    setOrganFilters([]);
                                    setDueDateFilter(EMPTY_DATE_FILTER);
                                }}
                                className="h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                Сбросить
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {(loading || dictLoading) ? (
                <Loader label="Загрузка данных…"/>
            ) : error ? (
                <EmptyState variant="error" title="Не удалось загрузить данные" description={error}/>
            ) : (
                <ActualizationTable
                    columns={columns}
                    rows={rows}
                    gridTemplate={gridTemplate}
                    responsibleExecutorNames={responsibleExecutorNames}
                    keywordNames={keywordNames}
                    secrecyLevelName={secrecyLevelName}
                    userGroupNames={userGroupNames}
                    rubricNames={rubricNames}
                    onResetFilters={resetFilters}
                />
            )}
        </div>
    );
}