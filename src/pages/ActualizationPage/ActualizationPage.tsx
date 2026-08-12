import {useMemo, useState} from "react";

import type {VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {EMPTY_DATE_FILTER, type DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";

import {
    ActualizationFilterPills,
    type ActualizationFilterValue,
} from "@/components/componentsVND/componentsActualizationPage/ActualizationFilterPills.tsx";
import {ActualizationSummaryCards} from "@/components/componentsVND/componentsActualizationPage/ActualizationSummaryCards.tsx";
import {ActualizationTable} from "@/components/componentsVND/componentsActualizationPage/ActualizationTable.tsx";
import {ActualizationFilters} from "@/components/componentsVND/componentsActualizationPage/ActualizationFilters.tsx";

import {useVndActualizationSummary} from "@/hooks/vndHooks/useVndActualizationSummary.tsx";
import {useVndActualizationFilteredRows} from "@/hooks/vndHooks/useVndActualizationFilteredRows.tsx";
import {useVndActualizationColumnVisibility} from "@/hooks/vndHooks/useVndActualizationColumnVisibility.tsx";

import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    ActualizationPageHeader
} from "@/components/componentsVND/componentsActualizationPage/ActualizationPageHeader.tsx";
import {
    ActualizationRequestsPanel
} from "@/components/componentsVND/componentsActualizationPage/ActualizationRequestsPanel.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
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
        loading: dictLoading,
    } = useDictionaries();

    // Мапы для расшифровки id → имя в таблице (id из бэка приходят как number)
    const orgUnitMap = useMemo(() => new Map(orgUnits.map((o) => [o.id, o])), [orgUnits]);
    const keywordMap = useMemo(() => new Map(keywords.map((k) => [k.id, k])), [keywords]);
    const securityLevelMap = useMemo(() => new Map(secrecyLevels.map((s) => [s.id, s])), [secrecyLevels]);
    const userGroupMap = useMemo(() => new Map(userGroups.map((g) => [g.id, g])), [userGroups]);
    const rubricMap = useMemo(() => new Map(rubrics.map((r) => [r.id, r])), [rubrics]);
    // types/organs пока используются только внутри ActualizationFilters через свой useDictionaries(),
    // но оставила деструктуризацию тут на случай если понадобится расшифровка в таблице
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
    // Применённые значения расширенного поиска — обновляются только по кнопке "Найти"
    // внутри ActualizationFilters (через draft-логику useVndActualizationFiltersDraft)
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

            <ActualizationFilters
                search={search}
                onSearchChange={setSearch}
                advOpen={advOpen}
                onToggleAdv={() => setAdvOpen((v) => !v)}
                onCloseAdv={() => setAdvOpen(false)}
                typeFilters={typeFilters}
                onTypeFiltersChange={setTypeFilters}
                developerFilters={developerFilters}
                onDeveloperFiltersChange={setDeveloperFilters}
                organFilters={organFilters}
                onOrganFiltersChange={setOrganFilters}
                dueDateFilter={dueDateFilter}
                onDueDateFilterChange={setDueDateFilter}
                resultCount={rows.length}
                showResetButton={hasAdvancedFilters || Boolean(search) || bucketFilter !== "all"}
                onResetFilters={resetFilters}
                toggleableColumns={toggleableColumns}
                visibleCols={visibleCols}
                onToggleColumn={toggleColumn}
                onSelectAllColumns={selectAllColumns}
                onDeselectAllColumns={deselectAllColumns}
            />

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