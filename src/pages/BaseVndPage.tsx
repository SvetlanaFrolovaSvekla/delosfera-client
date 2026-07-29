import {useMemo, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";

import {
    type OrganizationUnit,
    type Keyword,
    KEYWORDS, ORG_UNITS, type SecurityLevel, SECURITY_LEVELS, USER_GROUPS, type UserGroup, type Rubric, RUBRICS
} from '@/service/mockData/DictionaryData.tsx';

import {type VndScope, type VndStatusKey} from '@/service/mockData/BaseVndData';

import {getColumnsForScope, getToggleableColumns} from "@/constants/vndColumns";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {VndPageHeader} from "@/components/componentsVND/componentsBaseVndPage/VndPageHeader";
import {VndScopeTabs} from "@/components/componentsVND/componentsBaseVndPage/VndScopeTabs";
import {VndFilters} from "@/components/componentsVND/componentsBaseVndPage/VndFilters";
import {VndTable} from "@/components/componentsVND/componentsBaseVndPage/VndTable";
import {type DateFilterValue, EMPTY_DATE_FILTER} from "@/components/componentsGeneral/DateFilterGroup.tsx";
import type {DateRangeFilter, VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {useVndSearch} from "@/hooks/useVndSearch.ts";

// Справочники, которых нет готовыми в VndResponse — резолвим через моки,
// пока бэкенд не отдаёт их отдельными эндпоинтами. Мок-id — строки, с сервера id — числа.
const orgUnitMap = new Map<string, OrganizationUnit>(ORG_UNITS.map((o) => [o.id, o]));
const orgUnitName = (id: number) => orgUnitMap.get(String(id))?.name ?? "—";

const keywordMap = new Map<string, Keyword>(KEYWORDS.map((k) => [k.id, k]));
const securityLevelMap = new Map<string, SecurityLevel>(SECURITY_LEVELS.map((s) => [s.id, s]));
const userGroupMap = new Map<string, UserGroup>(USER_GROUPS.map((g) => [g.id, g]));

const keywordNames = (ids: number[]) =>
    ids.map((id) => keywordMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

const secrecyLevelName = (id?: number) => (id != null ? securityLevelMap.get(String(id))?.name ?? "—" : "—");

const userGroupNames = (ids: number[]) =>
    ids.map((id) => userGroupMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

const responsibleExecutorNames = (ids: number[]) =>
    ids.map((id) => orgUnitName(id)).filter((n) => n !== "—").join(", ") || "—";

const rubricMap = new Map<string, Rubric>(RUBRICS.map((r) => [r.id, r]));
const rubricNames = (ids: number[]) => ids.map((id) => rubricMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

// Сервер отдаёт даты в формате "YYYY-MM-DD"
function parseDate(str: string | null | undefined): Date | null {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
}

function daysUntil(dateStr: string | null | undefined): number | null {
    const date = parseDate(dateStr);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function rygColor(days: number) {
    if (days < 0 || days < 5) return "#c0392b";
    if (days < 30) return "#b3730a";
    return "#1c7a4d";
}

const ALL_STATUS_OPTIONS: { key: VndStatusKey; label: string }[] = (
    Object.keys(STATUS_META) as VndStatusKey[]
).map((key) => ({key, label: STATUS_META[key].label}));

const DEFAULT_VISIBLE_ALL_ACTIVE: string[] = ["act", "status"];
const DEFAULT_VISIBLE_ARCH: string[] = ["status"];
const DEFAULT_VISIBLE_DRAFT: string[] = ["status"];

function buildDefaultVisibility(scope: VndScope): Record<string, boolean> {
    const toggleable = getToggleableColumns(scope);
    const defaultVisible =
        scope === "arch" ? DEFAULT_VISIBLE_ARCH :
            scope === "draft" ? DEFAULT_VISIBLE_DRAFT :
                DEFAULT_VISIBLE_ALL_ACTIVE;

    return Object.fromEntries(
        toggleable.map((c) => [c.key, defaultVisible.includes(c.key)])
    );
}

function toDateRangeFilter(v: DateFilterValue): DateRangeFilter | null {
    const exact = v.exact ? formatISO(v.exact) : null;
    const from = v.from ? formatISO(v.from) : null;
    const to = v.to ? formatISO(v.to) : null;
    if (!exact && !from && !to) return null;
    return {exact, from, to};
}

function formatISO(d: Date | string) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().slice(0, 10);
}

export function BaseVndPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [docTypeFilters, setDocTypeFilters] = useState<string[]>([]);
    const [developerFilters, setDeveloperFilters] = useState<string[]>([]);
    const [scope, setScope] = useState<VndScope>("all");
    const [search, setSearch] = useState("");
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [advOpen, setAdvOpen] = useState(false);
    const [rubricFilters, setRubricFilters] = useState<string[]>([]);

    // Синхронизация с URL (?rubrics=5,7) без эффекта — "подгонка состояния во время рендера".
    const [lastRubricsParam, setLastRubricsParam] = useState<string | null>(null);
    const rubricsParam = searchParams.get("rubrics");
    if (rubricsParam !== lastRubricsParam) {
        setLastRubricsParam(rubricsParam);
        if (rubricsParam) {
            setRubricFilters(rubricsParam.split(",").filter(Boolean));
            setAdvOpen(true);
        }
    }

    const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
    const [responsibleExecutorFilters, setResponsibleExecutorFilters] = useState<string[]>([]);
    const [advSearchName, setAdvSearchName] = useState("");
    const [advSearchCode, setAdvSearchCode] = useState("");
    const [advSearchRevisionText, setAdvSearchRevisionText] = useState("");

    const [adoptionDateFilter, setAdoptionDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [adoptionCodeFilter, setAdoptionCodeFilter] = useState("");
    const [effectiveDateFilter, setEffectiveDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [requisitesChangedDateFilter, setRequisitesChangedDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [revisionChangedDateFilter, setRevisionChangedDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [cancelDateFilter, setCancelDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [cancelCodeFilter, setCancelCodeFilter] = useState("");
    const [dueActualizationDateFilter, setDueActualizationDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [lastActualizationDateFilter, setLastActualizationDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
    const [archivedDateFilter, setArchivedDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);

    const [secrecyLevelFilters, setSecrecyLevelFilters] = useState<string[]>([]);
    const [userGroupFilters, setUserGroupFilters] = useState<string[]>([]);

    const toggleStatusFilter = (key: string) =>
        setStatusFilters((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    const selectAllStatuses = () => setStatusFilters(ALL_STATUS_OPTIONS.map((o) => o.key));
    const deselectAllStatuses = () => setStatusFilters([]);

    const [organFilters, setOrganFilters] = useState<string[]>([]);

    const [visibleColsByScope, setVisibleColsByScope] = useState<Record<VndScope, Record<string, boolean>>>({
        all: buildDefaultVisibility("all"),
        active: buildDefaultVisibility("active"),
        draft: buildDefaultVisibility("draft"),
        arch: buildDefaultVisibility("arch"),
    });

    const visibleCols = visibleColsByScope[scope];

    const toggleColumn = (key: string) =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: {...prev[scope], [key]: !(prev[scope][key] === true)},
        }));

    const allColumns = getColumnsForScope(scope);
    const columns = allColumns.filter((c) => c.fixed || visibleCols[c.key] === true);
    const gridTemplate = columns.map((c) => c.width).join(" ");
    const toggleableColumns = getToggleableColumns(scope);

    const isArchScope = scope === "arch";

    const searchRequest: VndSearchRequest = useMemo(() => {
        const statuses: VndStatusKey[] =
            scope === "active" ? ["active"] :
                scope === "arch" ? ["arch"] :
                    scope === "draft" ? ["draft"] :
                        statusFilters.length > 0 ? (statusFilters as VndStatusKey[]) :
                            ["active", "onact", "review", "consol"];

        return {
            code: advSearchCode || undefined,
            name: advSearchName || undefined,
            revisionText: advSearchRevisionText || undefined,
            statuses,
            typeIds: docTypeFilters.length ? docTypeFilters.map(Number) : undefined,
            organIds: organFilters.length ? organFilters.map(Number) : undefined,
            developerIds: developerFilters.length ? developerFilters.map(Number) : undefined,
            responsibleExecutorIds: responsibleExecutorFilters.length ? responsibleExecutorFilters.map(Number) : undefined,
            keywordIds: keywordFilters.length ? keywordFilters.map(Number) : undefined,
            rubricIds: rubricFilters.length ? rubricFilters.map(Number) : undefined,
            secrecyLevelIds: secrecyLevelFilters.length ? secrecyLevelFilters.map(Number) : undefined,
            userGroupIds: userGroupFilters.length ? userGroupFilters.map(Number) : undefined,
            adoptionDate: toDateRangeFilter(adoptionDateFilter),
            adoptionCode: adoptionCodeFilter || undefined,
            effectiveDate: toDateRangeFilter(effectiveDateFilter),
            requisitesChangedDate: toDateRangeFilter(requisitesChangedDateFilter),
            revisionChangedDate: toDateRangeFilter(revisionChangedDateFilter),
            cancelDate: toDateRangeFilter(cancelDateFilter),
            cancelCode: cancelCodeFilter || undefined,
            dueActualizationDate: toDateRangeFilter(dueActualizationDateFilter),
            lastActualizationDate: toDateRangeFilter(lastActualizationDateFilter),
            archivedDate: toDateRangeFilter(archivedDateFilter),
        };
    }, [
        scope, statusFilters, advSearchCode, advSearchName, advSearchRevisionText,
        docTypeFilters, organFilters, developerFilters, responsibleExecutorFilters,
        keywordFilters, rubricFilters, secrecyLevelFilters, userGroupFilters,
        adoptionDateFilter, adoptionCodeFilter, effectiveDateFilter,
        requisitesChangedDateFilter, revisionChangedDateFilter,
        cancelDateFilter, cancelCodeFilter,
        dueActualizationDateFilter, lastActualizationDateFilter, archivedDateFilter,
    ]);

    const {data: vndAll, loading, error} = useVndSearch(searchRequest);
    const {data: allForCounts} = useVndSearch({}, 500);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vndAll;
        return vndAll.filter((r) =>
            `${r.name} ${r.code} ${r.typeName} ${r.developerName} ${r.organName}`
                .toLowerCase()
                .includes(q)
        );
    }, [vndAll, search]);

    const counts = {
        all: allForCounts.filter((r) => r.status !== "arch" && r.status !== "draft").length,
        active: allForCounts.filter((r) => r.status === "active").length,
        arch: allForCounts.filter((r) => r.status === "arch").length,
        draft: allForCounts.filter((r) => r.status === "draft").length,
    };

    const scopeTabs = [
        {id: "all" as VndScope, label: "Все", n: counts.all},
        {id: "active" as VndScope, label: "Действующие", n: counts.active},
        {id: "arch" as VndScope, label: "Архивированные", n: counts.arch},
        {id: "draft" as VndScope, label: "Черновики", n: counts.draft},
    ];

    const resetFilters = () => {
        setSearch("");
        setStatusFilters([]);
        setRubricFilters([]);
        setDocTypeFilters([]);
        setOrganFilters([]);
        setDeveloperFilters([]);
        setKeywordFilters([]);
        setResponsibleExecutorFilters([]);
        setAdvSearchName("");
        setAdvSearchCode("");
        setAdvSearchRevisionText("");
        setAdoptionDateFilter(EMPTY_DATE_FILTER);
        setAdoptionCodeFilter("");
        setEffectiveDateFilter(EMPTY_DATE_FILTER);
        setRequisitesChangedDateFilter(EMPTY_DATE_FILTER);
        setRevisionChangedDateFilter(EMPTY_DATE_FILTER);
        setCancelDateFilter(EMPTY_DATE_FILTER);
        setCancelCodeFilter("");
        setDueActualizationDateFilter(EMPTY_DATE_FILTER);
        setLastActualizationDateFilter(EMPTY_DATE_FILTER);
        setArchivedDateFilter(EMPTY_DATE_FILTER);
        setSecrecyLevelFilters([]);
        setUserGroupFilters([]);
    };

    const selectAllColumns = () =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(getToggleableColumns(scope).map((c) => [c.key, true])),
        }));

    const deselectAllColumns = () =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(getToggleableColumns(scope).map((c) => [c.key, false])),
        }));

    console.log(vndAll);

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <VndPageHeader onCreateClick={() => navigate("/basevnd/new")}/>

            <VndScopeTabs tabs={scopeTabs} scope={scope} onChange={setScope}/>

            <VndFilters
                organFilters={organFilters}
                onOrganFiltersChange={setOrganFilters}
                docTypeFilters={docTypeFilters}
                onDocTypeFiltersChange={setDocTypeFilters}
                scope={scope}
                isArchScope={isArchScope}
                search={search}
                onSearchChange={setSearch}
                statusOptions={ALL_STATUS_OPTIONS}
                statusFilters={statusFilters}
                onToggleStatus={toggleStatusFilter}
                onSelectAllStatuses={selectAllStatuses}
                onDeselectAllStatuses={deselectAllStatuses}
                advOpen={advOpen}
                onToggleAdv={() => setAdvOpen((v) => !v)}
                onCloseAdv={() => setAdvOpen(false)}
                rubricFilters={rubricFilters}
                onRubricFiltersChange={setRubricFilters}
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
                developerFilters={developerFilters}
                onDeveloperFiltersChange={setDeveloperFilters}
                keywordFilters={keywordFilters}
                onKeywordFiltersChange={setKeywordFilters}
                responsibleExecutorFilters={responsibleExecutorFilters}
                onResponsibleExecutorFiltersChange={setResponsibleExecutorFilters}
                advSearchName={advSearchName}
                onAdvSearchNameChange={setAdvSearchName}
                advSearchCode={advSearchCode}
                onAdvSearchCodeChange={setAdvSearchCode}
                advSearchRevisionText={advSearchRevisionText}
                onAdvSearchRevisionTextChange={setAdvSearchRevisionText}
                adoptionDateFilter={adoptionDateFilter}
                onAdoptionDateFilterChange={setAdoptionDateFilter}
                adoptionCodeFilter={adoptionCodeFilter}
                onAdoptionCodeFilterChange={setAdoptionCodeFilter}
                effectiveDateFilter={effectiveDateFilter}
                onEffectiveDateFilterChange={setEffectiveDateFilter}
                requisitesChangedDateFilter={requisitesChangedDateFilter}
                onRequisitesChangedDateFilterChange={setRequisitesChangedDateFilter}
                revisionChangedDateFilter={revisionChangedDateFilter}
                onRevisionChangedDateFilterChange={setRevisionChangedDateFilter}
                cancelDateFilter={cancelDateFilter}
                onCancelDateFilterChange={setCancelDateFilter}
                cancelCodeFilter={cancelCodeFilter}
                onCancelCodeFilterChange={setCancelCodeFilter}
                dueActualizationDateFilter={dueActualizationDateFilter}
                onDueActualizationDateFilterChange={setDueActualizationDateFilter}
                lastActualizationDateFilter={lastActualizationDateFilter}
                onLastActualizationDateFilterChange={setLastActualizationDateFilter}
                archivedDateFilter={archivedDateFilter}
                onArchivedDateFilterChange={setArchivedDateFilter}
                secrecyLevelFilters={secrecyLevelFilters}
                onSecrecyLevelFiltersChange={setSecrecyLevelFilters}
                userGroupFilters={userGroupFilters}
                onUserGroupFiltersChange={setUserGroupFilters}
                onResetFilters={resetFilters}
            />

            {error && (
                <div
                    className="my-4 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[13px] text-[#c0392b]">
                    Не удалось загрузить данные: {error}
                </div>
            )}

            {loading ? (
                <div className="py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</div>
            ) : (
                <VndTable
                    columns={columns}
                    rows={filteredRows}
                    gridTemplate={gridTemplate}
                    daysUntil={daysUntil}
                    rygColor={rygColor}
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