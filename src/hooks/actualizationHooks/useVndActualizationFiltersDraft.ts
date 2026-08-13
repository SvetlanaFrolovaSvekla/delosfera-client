// Хук для черновика расширенного поиска на странице актуализации
import {useState} from "react";
import {type DateFilterValue, EMPTY_DATE_FILTER} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";

export interface ActualizationDraft {
    typeFilters: string[];
    developerFilters: string[];
    organFilters: string[];
    dueDateFilter: DateFilterValue;
}

export const EMPTY_ACTUALIZATION_DRAFT: ActualizationDraft = {
    typeFilters: [],
    developerFilters: [],
    organFilters: [],
    dueDateFilter: EMPTY_DATE_FILTER,
};

interface UseVndActualizationFiltersDraftParams {
    onCloseAdv: () => void;
    /* Актуальные применённые значения (из пропов страницы) — используются только
       как начальное значение черновика при первом монтировании компонента */
    appliedValues: ActualizationDraft;
    /* Применить черновик — вызывает соответствующие onXChange из пропов */
    onApply: (draft: ActualizationDraft) => void;
}

export function useVndActualizationFiltersDraft({
                                                    onCloseAdv,
                                                    appliedValues,
                                                    onApply,
                                                }: UseVndActualizationFiltersDraftParams) {
    // Черновик инициализируется применёнными значениями один раз и дальше живёт
    // независимо — сворачивание/разворачивание панели его не трогает
    const [draft, setDraft] = useState<ActualizationDraft>(appliedValues);

    const updateDraft = <K extends keyof ActualizationDraft>(key: K, value: ActualizationDraft[K]) =>
        setDraft((prev) => ({...prev, [key]: value}));

    const handleApply = () => {
        onApply(draft);
        onCloseAdv();
    };

    const handleCollapse = () => {
        onCloseAdv();
    };

    const handleResetDraft = () => {
        setDraft(EMPTY_ACTUALIZATION_DRAFT);
        onApply(EMPTY_ACTUALIZATION_DRAFT);
    };

    return {draft, updateDraft, handleApply, handleCollapse, handleResetDraft};
}