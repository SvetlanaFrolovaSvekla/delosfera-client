import {useMemo, useState} from "react";
import type {DocumentStatusKey, VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import type {VndScope, VndStatusKey} from "@/constants/vndTabs.ts";
import {STATUS_OPTIONS_BY_SCOPE} from "@/constants/vndStatus.ts";
import {type DateFilterValue, EMPTY_DATE_FILTER} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {toDateRangeFilter} from "@/utils/dateUtils.ts";
import {ALL_LINKED_TO_ME_RELATION_KEYS, type LinkedToMeRelationKey} from "@/constants/linkedToMeRelations.ts";

// canCreateVnd — право создавать ВНД (CreateVndWithApproval / CreateVndWithoutApproval):
// определяет, входят ли черновики в состав таба "Все" по умолчанию (без ручного фильтра
// по статусу, доступного только при праве ViewVndRegistryExtended).
export function useVndFilters(scope: VndScope, draftOwnerScope?: "mine" | "others", canCreateVnd: boolean = false) {
    const [linkedToMeOnly, setLinkedToMeOnly] = useState(false);
    // По умолчанию выбраны все виды связи — чекбокс без открытия выпадающего списка
    // ведёт себя как раньше (любая связь с пользователем)
    const [linkedToMeRelations, setLinkedToMeRelations] =
        useState<LinkedToMeRelationKey[]>(ALL_LINKED_TO_ME_RELATION_KEYS);

    const toggleLinkedToMeRelation = (key: string) =>
        setLinkedToMeRelations((prev) =>
            prev.includes(key as LinkedToMeRelationKey)
                ? prev.filter((k) => k !== key)
                : [...prev, key as LinkedToMeRelationKey]
        );
    const selectAllLinkedToMeRelations = () => setLinkedToMeRelations(ALL_LINKED_TO_ME_RELATION_KEYS);
    const deselectAllLinkedToMeRelations = () => setLinkedToMeRelations([]);

    const [docTypeFilters, setDocTypeFilters] = useState<string[]>([]);
    const [developerFilters, setDeveloperFilters] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [rubricFilters, setRubricFilters] = useState<string[]>([]);
    const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
    const [responsibleExecutorFilters, setResponsibleExecutorFilters] = useState<string[]>([]);
    const [initiatorFilters, setInitiatorFilters] = useState<string[]>([]);
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
    const [organFilters, setOrganFilters] = useState<string[]>([]);

    const toggleStatusFilter = (key: string) =>
        setStatusFilters((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );

    const searchRequest: VndSearchRequest = useMemo(() => {
        // "Действующие" и "Ещё не действующие" — оба сужаются к одному и тому же базовому набору
        // редакционных статусов (active/onact/review/consol, без draft/arch): различие между
        // ними не в Statuses, а в documentStatuses ниже (documentStatus === "active" против
        // "notYetActive", см. VndResponse.documentStatus/ComputeDocumentStatus). Фильтр "Статус
        // последней редакции" на этих вкладках сужает этот базовый набор дальше (см.
        // STATUS_OPTIONS_BY_SCOPE/VndFilters) — а не игнорируется, как было раньше.
        const statuses: VndStatusKey[] =
            scope === "active" || scope === "notYetActive" ? (() => {
                const allowed = STATUS_OPTIONS_BY_SCOPE[scope]!;
                const effective = statusFilters.filter((k) => (allowed as string[]).includes(k)) as VndStatusKey[];
                return effective.length > 0 ? effective : allowed;
            })() :
                scope === "arch" ? ["arch"] :
                    scope === "draft" ? ["draft"] :
                        statusFilters.length > 0 ? (statusFilters as VndStatusKey[]) :
                            canCreateVnd
                                ? ["active", "onact", "review", "consol", "arch", "draft"]
                                : ["active", "onact", "review", "consol", "arch"];

        // "Статус ВНД" (документ-уровня) — теперь целиком определяется вкладкой (scope), а не
        // отдельным фильтром: "Действующие" означает "по-настоящему действующие" (documentStatus
        // === "active"), "Ещё не действующие" — свой отдельный таб (виден только при
        // ViewVndRegistryExtended, см. BaseVndPage/useVndScopeCounts). На "Все"/"Архивированные"/
        // "Черновики" доп. сужения по documentStatus нет — сервер и так уже вообще не отдаёт
        // notYetActive пользователям без ViewVndRegistryExtended (см. VndService.SearchAsync).
        const documentStatuses: DocumentStatusKey[] | undefined =
            scope === "active" ? ["active"] :
                scope === "notYetActive" ? ["notYetActive"] :
                    undefined;

        return {
            code: advSearchCode || undefined,
            name: advSearchName || undefined,
            revisionText: advSearchRevisionText || undefined,
            statuses,
            documentStatuses,
            typeIds: docTypeFilters.length ? docTypeFilters.map(Number) : undefined,
            organIds: organFilters.length ? organFilters.map(Number) : undefined,
            developerIds: developerFilters.length ? developerFilters.map(Number) : undefined,
            responsibleExecutorIds: responsibleExecutorFilters.length ? responsibleExecutorFilters.map(Number) : undefined,
            createdByUserIds: initiatorFilters.length ? initiatorFilters.map(Number) : undefined,
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
            linkedToMeOnly: linkedToMeOnly || undefined,
            linkedToMeRelations: linkedToMeOnly ? linkedToMeRelations : undefined,
            draftOwnerScope: scope === "draft" ? draftOwnerScope : undefined,
        };
    }, [
        scope, statusFilters, advSearchCode, advSearchName, advSearchRevisionText,
        docTypeFilters, organFilters, developerFilters, responsibleExecutorFilters, initiatorFilters,
        keywordFilters, rubricFilters, secrecyLevelFilters, userGroupFilters,
        adoptionDateFilter, adoptionCodeFilter, effectiveDateFilter,
        requisitesChangedDateFilter, revisionChangedDateFilter,
        cancelDateFilter, cancelCodeFilter,
        dueActualizationDateFilter, lastActualizationDateFilter, archivedDateFilter,
        linkedToMeOnly, linkedToMeRelations, draftOwnerScope, canCreateVnd,
    ]);

    const resetFilters = () => {
        setLinkedToMeOnly(false);
        setLinkedToMeRelations(ALL_LINKED_TO_ME_RELATION_KEYS);
        setSearch("");
        setStatusFilters([]);
        setRubricFilters([]);
        setDocTypeFilters([]);
        setOrganFilters([]);
        setDeveloperFilters([]);
        setKeywordFilters([]);
        setResponsibleExecutorFilters([]);
        setInitiatorFilters([]);
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

    return {
        linkedToMeOnly, setLinkedToMeOnly,
        linkedToMeRelations, toggleLinkedToMeRelation,
        selectAllLinkedToMeRelations, deselectAllLinkedToMeRelations,
        docTypeFilters, setDocTypeFilters,
        developerFilters, setDeveloperFilters,
        search, setSearch,
        statusFilters, setStatusFilters, toggleStatusFilter,
        rubricFilters, setRubricFilters,
        keywordFilters, setKeywordFilters,
        responsibleExecutorFilters, setResponsibleExecutorFilters,
        initiatorFilters, setInitiatorFilters,
        advSearchName, setAdvSearchName,
        advSearchCode, setAdvSearchCode,
        advSearchRevisionText, setAdvSearchRevisionText,
        adoptionDateFilter, setAdoptionDateFilter,
        adoptionCodeFilter, setAdoptionCodeFilter,
        effectiveDateFilter, setEffectiveDateFilter,
        requisitesChangedDateFilter, setRequisitesChangedDateFilter,
        revisionChangedDateFilter, setRevisionChangedDateFilter,
        cancelDateFilter, setCancelDateFilter,
        cancelCodeFilter, setCancelCodeFilter,
        dueActualizationDateFilter, setDueActualizationDateFilter,
        lastActualizationDateFilter, setLastActualizationDateFilter,
        archivedDateFilter, setArchivedDateFilter,
        secrecyLevelFilters, setSecrecyLevelFilters,
        userGroupFilters, setUserGroupFilters,
        organFilters, setOrganFilters,
        searchRequest,
        resetFilters,
    };
}