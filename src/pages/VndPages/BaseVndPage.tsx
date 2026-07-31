// Страница "База ВНД"
import {useState} from "react";
import {useNavigate} from "react-router-dom";

import {
    type OrganizationUnit,
    type Keyword,
    KEYWORDS, ORG_UNITS, type SecurityLevel, SECURITY_LEVELS, USER_GROUPS, type UserGroup, type Rubric, RUBRICS
} from '@/service/mockData/DictionaryData.tsx'; // TODO: заглушка, надо настроить загрузку данных из справочников

import {daysUntil} from "@/utils/dateUtils.ts";
import {useVndFilters} from "@/hooks/vndHooks/useVndFilters.tsx";
import {useRubricsFromUrl} from "@/hooks/vndHooks/useRubricsFromUrl.ts";
import {useVndColumnVisibility} from "@/hooks/vndHooks/useVndColumnVisibility.tsx";
import {useVndScopeCounts} from "@/hooks/vndHooks/useVndScopeCounts.tsx";
import {useVndFilteredRows} from "@/hooks/vndHooks/useVndFilteredRows.tsx";

import {type VndScope, type VndStatusKey} from '@/service/mockData/BaseVndData.tsx';
import {STATUS_META} from "@/constants/vndStatus.ts";

import {VndPageHeader} from "@/components/componentsVND/componentsBaseVndPage/VndPageHeader.tsx";
import {VndFilters} from "@/components/componentsVND/componentsBaseVndPage/VndFilters.tsx";
import {VndTable} from "@/components/componentsVND/componentsBaseVndPage/VndTable.tsx";

import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

// TODO: заглушка, надо настроить загрузку данных из справочников
const orgUnitMap = new Map<string, OrganizationUnit>(ORG_UNITS.map((o) => [o.id, o]));
const orgUnitName = (id: number) => orgUnitMap.get(String(id))?.name ?? "—";

const keywordMap = new Map<string, Keyword>(KEYWORDS.map((k) => [k.id, k]));
const securityLevelMap = new Map<string, SecurityLevel>(SECURITY_LEVELS.map((s) => [s.id, s]));
const userGroupMap = new Map<string, UserGroup>(USER_GROUPS.map((g) => [g.id, g]));
const rubricMap = new Map<string, Rubric>(RUBRICS.map((r) => [r.id, r]));

const keywordNames = (ids: number[]) =>
    ids.map((id) => keywordMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

const secrecyLevelName = (id?: number) => (id != null ? securityLevelMap.get(String(id))?.name ?? "—" : "—");

const userGroupNames = (ids: number[]) =>
    ids.map((id) => userGroupMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

const responsibleExecutorNames = (ids: number[]) =>
    ids.map((id) => orgUnitName(id)).filter((n) => n !== "—").join(", ") || "—";

const rubricNames = (ids: number[]) => ids.map((id) => rubricMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";
// TODO: заглушка, надо настроить загрузку данных из справочников

const ALL_STATUS_OPTIONS: { key: VndStatusKey; label: string }[] = (
    Object.keys(STATUS_META) as VndStatusKey[]
).map((key) => ({key, label: STATUS_META[key].label}));

export function BaseVndPage() {
    const navigate = useNavigate();
    const [scope, setScope] = useState<VndScope>("all");
    const [advOpen, setAdvOpen] = useState(false);

    const filters = useVndFilters(scope);
    useRubricsFromUrl(filters.setRubricFilters, setAdvOpen);

    const {visibleCols, toggleColumn, selectAllColumns, deselectAllColumns, columns, gridTemplate, toggleableColumns} =
        useVndColumnVisibility(scope);

    const counts = useVndScopeCounts();
    const {filteredRows, loading, error} = useVndFilteredRows(filters.searchRequest, filters.search);

    const isArchScope = scope === "arch";

    const selectAllStatuses = () => filters.setStatusFilters(ALL_STATUS_OPTIONS.map((o) => o.key));
    const deselectAllStatuses = () => filters.setStatusFilters([]);

    const scopeTabs = [
        {id: "all" as VndScope, label: "Все", n: counts.all},
        {id: "active" as VndScope, label: "Действующие", n: counts.active},
        {id: "arch" as VndScope, label: "Архивированные", n: counts.arch},
        {id: "draft" as VndScope, label: "Черновики", n: counts.draft},
    ];

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <VndPageHeader onCreateClick={() => navigate("/basevnd/new")}/>

            <Tabs<VndScope> tabs={scopeTabs} value={scope} onChange={setScope}/>

            <VndFilters
                organFilters={filters.organFilters}
                onOrganFiltersChange={filters.setOrganFilters}
                docTypeFilters={filters.docTypeFilters}
                onDocTypeFiltersChange={filters.setDocTypeFilters}
                scope={scope}
                isArchScope={isArchScope}
                search={filters.search}
                onSearchChange={filters.setSearch}
                statusOptions={ALL_STATUS_OPTIONS}
                statusFilters={filters.statusFilters}
                onToggleStatus={filters.toggleStatusFilter}
                onSelectAllStatuses={selectAllStatuses}
                onDeselectAllStatuses={deselectAllStatuses}
                advOpen={advOpen}
                onToggleAdv={() => setAdvOpen((v) => !v)}
                onCloseAdv={() => setAdvOpen(false)}
                rubricFilters={filters.rubricFilters}
                onRubricFiltersChange={filters.setRubricFilters}
                resultCount={filteredRows.length}
                totalCount={
                    scope === "active" ? counts.active :
                        scope === "draft" ? counts.draft :
                            scope === "arch" ? counts.arch :
                                counts.all
                }
                toggleableColumns={toggleableColumns}
                visibleCols={visibleCols}
                onToggleColumn={toggleColumn}
                onSelectAllColumns={selectAllColumns}
                onDeselectAllColumns={deselectAllColumns}
                developerFilters={filters.developerFilters}
                onDeveloperFiltersChange={filters.setDeveloperFilters}
                keywordFilters={filters.keywordFilters}
                onKeywordFiltersChange={filters.setKeywordFilters}
                responsibleExecutorFilters={filters.responsibleExecutorFilters}
                onResponsibleExecutorFiltersChange={filters.setResponsibleExecutorFilters}
                advSearchName={filters.advSearchName}
                onAdvSearchNameChange={filters.setAdvSearchName}
                advSearchCode={filters.advSearchCode}
                onAdvSearchCodeChange={filters.setAdvSearchCode}
                advSearchRevisionText={filters.advSearchRevisionText}
                onAdvSearchRevisionTextChange={filters.setAdvSearchRevisionText}
                adoptionDateFilter={filters.adoptionDateFilter}
                onAdoptionDateFilterChange={filters.setAdoptionDateFilter}
                adoptionCodeFilter={filters.adoptionCodeFilter}
                onAdoptionCodeFilterChange={filters.setAdoptionCodeFilter}
                effectiveDateFilter={filters.effectiveDateFilter}
                onEffectiveDateFilterChange={filters.setEffectiveDateFilter}
                requisitesChangedDateFilter={filters.requisitesChangedDateFilter}
                onRequisitesChangedDateFilterChange={filters.setRequisitesChangedDateFilter}
                revisionChangedDateFilter={filters.revisionChangedDateFilter}
                onRevisionChangedDateFilterChange={filters.setRevisionChangedDateFilter}
                cancelDateFilter={filters.cancelDateFilter}
                onCancelDateFilterChange={filters.setCancelDateFilter}
                cancelCodeFilter={filters.cancelCodeFilter}
                onCancelCodeFilterChange={filters.setCancelCodeFilter}
                dueActualizationDateFilter={filters.dueActualizationDateFilter}
                onDueActualizationDateFilterChange={filters.setDueActualizationDateFilter}
                lastActualizationDateFilter={filters.lastActualizationDateFilter}
                onLastActualizationDateFilterChange={filters.setLastActualizationDateFilter}
                archivedDateFilter={filters.archivedDateFilter}
                onArchivedDateFilterChange={filters.setArchivedDateFilter}
                secrecyLevelFilters={filters.secrecyLevelFilters}
                onSecrecyLevelFiltersChange={filters.setSecrecyLevelFilters}
                userGroupFilters={filters.userGroupFilters}
                onUserGroupFiltersChange={filters.setUserGroupFilters}
                onResetFilters={filters.resetFilters}
            />

            {loading ? (
                <Loader label="Загрузка данных…"/>
            ) : error ? (
                <EmptyState
                    variant="error"
                    title="Не удалось загрузить данные"
                    description={error}
                />
            ) : (
                <VndTable
                    columns={columns}
                    rows={filteredRows}
                    gridTemplate={gridTemplate}
                    daysUntil={daysUntil}
                    responsibleExecutorNames={responsibleExecutorNames}
                    keywordNames={keywordNames}
                    secrecyLevelName={secrecyLevelName}
                    userGroupNames={userGroupNames}
                    rubricNames={rubricNames}
                    onResetFilters={filters.resetFilters}
                />
            )}
        </div>
    );
}