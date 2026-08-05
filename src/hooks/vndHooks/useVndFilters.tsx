import {useMemo, useState} from "react";
import type {VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import type {VndScope, VndStatusKey} from "@/constants/vndTabs.ts";
import {type DateFilterValue, EMPTY_DATE_FILTER} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {toDateRangeFilter} from "@/utils/dateUtils.ts";

export function useVndFilters(scope: VndScope, draftOwnerScope?: "mine" | "others") {
    const [linkedToMeOnly, setLinkedToMeOnly] = useState(false);
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
        linkedToMeOnly, draftOwnerScope,
    ]);

    const resetFilters = () => {
        setLinkedToMeOnly(false);
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