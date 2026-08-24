// Страница "База ВНД"
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {daysUntil} from "@/utils/dateUtils.ts";
import {useVndFilters} from "@/hooks/vndHooks/useVndFilters.tsx";
import {useRubricsFromUrl} from "@/hooks/vndHooks/useRubricsFromUrl.ts";
import {useVndColumnVisibility} from "@/hooks/vndHooks/useVndColumnVisibility.tsx";
import {useVndScopeCounts} from "@/hooks/vndHooks/useVndScopeCounts.tsx";
import {useVndFilteredRows} from "@/hooks/vndHooks/useVndFilteredRows.tsx";
import {useVndDictionaryResolvers} from "@/hooks/vndHooks/useVndDictionaryResolvers.ts";

import {type VndScope, type VndStatusKey} from '@/constants/vndTabs.ts';
import {STATUS_META} from "@/constants/vndStatus.ts";

import {VndPageHeader} from "@/components/componentsVND/componentsBaseVndPage/VndPageHeader.tsx";
import {VndFilters} from "@/components/componentsVND/componentsBaseVndPage/VndFilters.tsx";
import {VndTable} from "@/components/componentsVND/componentsBaseVndPage/VndTable.tsx";

import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {FileEdit} from "lucide-react";


const ALL_STATUS_OPTIONS: { key: VndStatusKey; label: string }[] = (
    Object.keys(STATUS_META) as VndStatusKey[]
).map((key) => ({key, label: STATUS_META[key].label}));

type DraftOwnerScope = "mine" | "others" | "allDraft";

export function BaseVndPage() {
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canViewOtherUsersDrafts = hasPermission(PermissionCode.ViewOtherUsersDrafts);
    // Право создавать ВНД — от него зависит видимость вкладки "Черновики" и состав таба "Все"
    const canCreateVnd =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval);
    // Право "Просмотр реестра ВНД в расширенном режиме" — колонки/фильтры
    // "Статус последней редакции" и "Актуализация"
    const canViewVndRegistryExtended = hasPermission(PermissionCode.ViewVndRegistryExtended);
    // Чекбокс "Только связанные со мной" — только для "редакторов ВНД": тех, кто может
    // согласовывать, создавать или актуализировать/консолидировать документы
    const canFilterLinkedToMe =
        hasPermission(PermissionCode.ActAsApprover) ||
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithApproval) ||
        hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval) ||
        hasPermission(PermissionCode.ActualizeVndWithApprovalByRequest) ||
        hasPermission(PermissionCode.ActualizeVndWithoutApprovalByRequest);

    const [scope, setScope] = useState<VndScope>("all");
    const [draftOwnerScope, setDraftOwnerScope] = useState<DraftOwnerScope>("allDraft");
    const [advOpen, setAdvOpen] = useState(false);

    const filters = useVndFilters(
        scope,
        scope === "draft" && draftOwnerScope !== "allDraft" ? draftOwnerScope : undefined,
        canCreateVnd
    );

    useRubricsFromUrl(filters.setRubricFilters, setAdvOpen);

    const {visibleCols, toggleColumn, selectAllColumns, deselectAllColumns, columns, gridTemplate, toggleableColumns} =
        useVndColumnVisibility(scope, canViewVndRegistryExtended, filters.linkedToMeOnly);

    const counts = useVndScopeCounts(canCreateVnd);
    const {filteredRows, loading, error} = useVndFilteredRows(filters.searchRequest, filters.search);

    const dictionaries = useDictionaries();
    const {keywordNames, rubricNames, secrecyLevelName, userGroupNames, responsibleExecutorNames} =
        useVndDictionaryResolvers();

    const isArchScope = scope === "arch";

    const selectAllStatuses = () => filters.setStatusFilters(ALL_STATUS_OPTIONS.map((o) => o.key));
    const deselectAllStatuses = () => filters.setStatusFilters([]);

    // Вкладка "Черновики" видна только при праве создавать ВНД — и идёт сразу за
    // "Архивированными", в общей группе табов (не отделяется вправо)
    const scopeTabs = [
        {id: "all" as VndScope, label: "Все", n: counts.all},
        {id: "active" as VndScope, label: "Действующие", n: counts.active},
        {id: "arch" as VndScope, label: "Архивированные", n: counts.arch},
        ...(canCreateVnd
            ? [{id: "draft" as VndScope, label: "Черновики", n: counts.draft, icon: <FileEdit size={14}/>}]
            : []),
    ];

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <VndPageHeader onCreateClick={() => navigate("/base-vnd/new")}/>

            <Tabs<VndScope> tabs={scopeTabs} value={scope} onChange={setScope}/>

            {scope === "draft" && canViewOtherUsersDrafts && (
                <div className="flex items-center gap-2 mb-3.5">
                    {([
                        {key: "allDraft" as const, label: "Все черновики"},
                        {key: "mine" as const, label: "Мои черновики"},
                        {key: "others" as const, label: "Черновики других пользователей"},
                    ]).map((t) => {
                        const active = draftOwnerScope === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setDraftOwnerScope(t.key)}
                                className={`inline-flex items-center h-8 px-3 rounded-lg border font-semibold text-[12.5px] cursor-pointer ${
                                    active
                                        ? "border-[#4e57d6] bg-[#f6f8fb] text-[#4e57d6]"
                                        : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <VndFilters
                canViewExtended={canViewVndRegistryExtended}
                organFilters={filters.organFilters}
                onOrganFiltersChange={filters.setOrganFilters}
                docTypeFilters={filters.docTypeFilters}
                onDocTypeFiltersChange={filters.setDocTypeFilters}
                scope={scope}
                isArchScope={isArchScope}
                canFilterLinkedToMe={canFilterLinkedToMe}
                linkedToMeOnly={filters.linkedToMeOnly}
                onLinkedToMeOnlyChange={filters.setLinkedToMeOnly}
                linkedToMeRelations={filters.linkedToMeRelations}
                onToggleLinkedToMeRelation={filters.toggleLinkedToMeRelation}
                onSelectAllLinkedToMeRelations={filters.selectAllLinkedToMeRelations}
                onDeselectAllLinkedToMeRelations={filters.deselectAllLinkedToMeRelations}
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
                initiatorFilters={filters.initiatorFilters}
                onInitiatorFiltersChange={filters.setInitiatorFilters}
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

            {loading || dictionaries.loading ? (
                <Loader label="Загрузка данных…"/>
            ) : error ? (
                <EmptyState
                    variant="error"
                    title="Не удалось загрузить данные"
                    description={error}
                />
            ) : dictionaries.error ? (
                <EmptyState
                    variant="error"
                    title="Не удалось загрузить справочники"
                    description={dictionaries.error}
                    actionLabel="Повторить"
                    onAction={dictionaries.refetch}
                />
            ) : (
                <VndTable
                    searchQuery={filters.search}
                    canViewExtended={canViewVndRegistryExtended}
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