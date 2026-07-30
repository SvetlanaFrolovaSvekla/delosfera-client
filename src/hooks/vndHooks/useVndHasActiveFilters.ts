// Хук для hasActiveFilters
import {useMemo} from "react";
import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";

const isDateActive = (v: DateFilterValue) => Boolean(v.exact || v.from || v.to);

interface UseVndHasActiveFiltersParams {
    search: string;
    statusFilters: string[];
    rubricFilters: string[];
    docTypeFilters: string[];
    organFilters: string[];
    developerFilters: string[];
    keywordFilters: string[];
    responsibleExecutorFilters: string[];
    advSearchName: string;
    advSearchCode: string;
    advSearchRevisionText: string;
    adoptionCodeFilter: string;
    cancelCodeFilter: string;
    secrecyLevelFilters: string[];
    userGroupFilters: string[];
    adoptionDateFilter: DateFilterValue;
    effectiveDateFilter: DateFilterValue;
    requisitesChangedDateFilter: DateFilterValue;
    revisionChangedDateFilter: DateFilterValue;
    cancelDateFilter: DateFilterValue;
    dueActualizationDateFilter: DateFilterValue;
    lastActualizationDateFilter: DateFilterValue;
    archivedDateFilter: DateFilterValue;
}

export function useVndHasActiveFilters(params: UseVndHasActiveFiltersParams): boolean {
    const {
        search, statusFilters, rubricFilters, docTypeFilters, organFilters,
        developerFilters, keywordFilters, responsibleExecutorFilters,
        advSearchName, advSearchCode, advSearchRevisionText,
        adoptionCodeFilter, cancelCodeFilter, secrecyLevelFilters, userGroupFilters,
        adoptionDateFilter, effectiveDateFilter, requisitesChangedDateFilter,
        revisionChangedDateFilter, cancelDateFilter, dueActualizationDateFilter,
        lastActualizationDateFilter, archivedDateFilter,
    } = params;

    return useMemo(() =>
            search.trim() !== "" ||
            statusFilters.length > 0 ||
            rubricFilters.length > 0 ||
            docTypeFilters.length > 0 ||
            organFilters.length > 0 ||
            developerFilters.length > 0 ||
            keywordFilters.length > 0 ||
            responsibleExecutorFilters.length > 0 ||
            advSearchName.trim() !== "" ||
            advSearchCode.trim() !== "" ||
            advSearchRevisionText.trim() !== "" ||
            adoptionCodeFilter.trim() !== "" ||
            cancelCodeFilter.trim() !== "" ||
            secrecyLevelFilters.length > 0 ||
            userGroupFilters.length > 0 ||
            isDateActive(adoptionDateFilter) ||
            isDateActive(effectiveDateFilter) ||
            isDateActive(requisitesChangedDateFilter) ||
            isDateActive(revisionChangedDateFilter) ||
            isDateActive(cancelDateFilter) ||
            isDateActive(dueActualizationDateFilter) ||
            isDateActive(lastActualizationDateFilter) ||
            isDateActive(archivedDateFilter),
        [
            search, statusFilters, rubricFilters, docTypeFilters, organFilters,
            developerFilters, keywordFilters, responsibleExecutorFilters,
            advSearchName, advSearchCode, advSearchRevisionText,
            adoptionCodeFilter, cancelCodeFilter, secrecyLevelFilters, userGroupFilters,
            adoptionDateFilter, effectiveDateFilter, requisitesChangedDateFilter,
            revisionChangedDateFilter, cancelDateFilter, dueActualizationDateFilter,
            lastActualizationDateFilter, archivedDateFilter,
        ]
    );
}