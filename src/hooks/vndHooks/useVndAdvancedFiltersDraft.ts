// Хук для черновика расширенного поиска
import {useState} from "react";
import {type DateFilterValue, EMPTY_DATE_FILTER} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";

export interface AdvancedDraft {
    docTypeFilters: string[];
    organFilters: string[];
    developerFilters: string[];
    responsibleExecutorFilters: string[];
    initiatorFilters: string[];
    keywordFilters: string[];
    rubricFilters: string[];
    secrecyLevelFilters: string[];
    userGroupFilters: string[];
    advSearchName: string;
    advSearchCode: string;
    advSearchRevisionText: string;
    adoptionDateFilter: DateFilterValue;
    adoptionCodeFilter: string;
    effectiveDateFilter: DateFilterValue;
    requisitesChangedDateFilter: DateFilterValue;
    revisionChangedDateFilter: DateFilterValue;
    cancelDateFilter: DateFilterValue;
    cancelCodeFilter: string;
    dueActualizationDateFilter: DateFilterValue;
    lastActualizationDateFilter: DateFilterValue;
    archivedDateFilter: DateFilterValue;
}

export const EMPTY_ADVANCED_DRAFT: AdvancedDraft = {
    docTypeFilters: [],
    organFilters: [],
    developerFilters: [],
    responsibleExecutorFilters: [],
    initiatorFilters: [],
    keywordFilters: [],
    rubricFilters: [],
    secrecyLevelFilters: [],
    userGroupFilters: [],
    advSearchName: "",
    advSearchCode: "",
    advSearchRevisionText: "",
    adoptionDateFilter: EMPTY_DATE_FILTER,
    adoptionCodeFilter: "",
    effectiveDateFilter: EMPTY_DATE_FILTER,
    requisitesChangedDateFilter: EMPTY_DATE_FILTER,
    revisionChangedDateFilter: EMPTY_DATE_FILTER,
    cancelDateFilter: EMPTY_DATE_FILTER,
    cancelCodeFilter: "",
    dueActualizationDateFilter: EMPTY_DATE_FILTER,
    lastActualizationDateFilter: EMPTY_DATE_FILTER,
    archivedDateFilter: EMPTY_DATE_FILTER,
};

interface UseVndAdvancedFiltersDraftParams {
    onCloseAdv: () => void;
    /* Актуальные применённые значения (из пропов страницы) */
    appliedValues: AdvancedDraft;
    /* Применить черновик - вызывает соответствующие onXChange из пропов */
    onApply: (draft: AdvancedDraft) => void;
}

export function useVndAdvancedFiltersDraft({
                                               onCloseAdv,
                                               appliedValues,
                                               onApply,
                                           }: UseVndAdvancedFiltersDraftParams) {
    const [draft, setDraft] = useState<AdvancedDraft>(appliedValues);

    // Ресинхронизация черновика, если применённые значения поменялись извне
    // (сброс фильтров кнопкой вне панели, переход по рубрике из рубрикатора и т.п.).
    // Сравниваем по содержимому, а не по ссылке — иначе будет срабатывать на каждый рендер.
    // Пока пользователь просто печатает в черновике, appliedValues не меняются
    // (onApply вызывается только при "Найти"/"Сбросить"), так что ввод не затирается.
    const appliedSnapshot = JSON.stringify(appliedValues);
    const [prevAppliedSnapshot, setPrevAppliedSnapshot] = useState(appliedSnapshot);

    if (appliedSnapshot !== prevAppliedSnapshot) {
        setPrevAppliedSnapshot(appliedSnapshot);
        setDraft(appliedValues);
    }

    const updateDraft = <K extends keyof AdvancedDraft>(key: K, value: AdvancedDraft[K]) =>
        setDraft((prev) => ({...prev, [key]: value}));

    const handleApply = () => {
        onApply(draft);
        onCloseAdv();
    };

    const handleCollapse = () => {
        onCloseAdv();
    };

    const handleResetDraft = () => {
        setDraft(EMPTY_ADVANCED_DRAFT);
        onApply(EMPTY_ADVANCED_DRAFT);
    };

    return {draft, updateDraft, handleApply, handleCollapse, handleResetDraft};
}