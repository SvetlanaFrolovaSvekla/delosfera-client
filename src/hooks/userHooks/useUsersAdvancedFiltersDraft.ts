// Хук для черновика расширенного поиска пользователей
import {useState} from "react";

export interface UserAdvancedDraft {
    positionFilters: string[];
    orgUnitFilters: string[];
    roleFilters: string[];
}

export const EMPTY_USER_ADVANCED_DRAFT: UserAdvancedDraft = {
    positionFilters: [],
    orgUnitFilters: [],
    roleFilters: [],
};

interface UseUsersAdvancedFiltersDraftParams {
    advOpen: boolean;
    onCloseAdv: () => void;
    /* Актуальные применённые значения (из пропов страницы) */
    appliedValues: UserAdvancedDraft;
    /* Применить черновик - вызывает соответствующие onXChange из пропов */
    onApply: (draft: UserAdvancedDraft) => void;
}

export function useUsersAdvancedFiltersDraft({
                                                 advOpen,
                                                 onCloseAdv,
                                                 appliedValues,
                                                 onApply,
                                             }: UseUsersAdvancedFiltersDraftParams) {
    const [draft, setDraft] = useState<UserAdvancedDraft>(appliedValues);

    // Синхронизация черновика с применёнными фильтрами в момент открытия панели
    const [prevAdvOpen, setPrevAdvOpen] = useState(advOpen);
    if (advOpen !== prevAdvOpen) {
        setPrevAdvOpen(advOpen);
        if (advOpen) {
            setDraft(appliedValues);
        }
    }

    const updateDraft = <K extends keyof UserAdvancedDraft>(key: K, value: UserAdvancedDraft[K]) =>
        setDraft((prev) => ({...prev, [key]: value}));

    const handleApply = () => {
        onApply(draft);
        onCloseAdv();
    };

    const handleCollapse = () => {
        onCloseAdv();
    };

    const handleResetDraft = () => {
        setDraft(EMPTY_USER_ADVANCED_DRAFT);
    };

    return {draft, updateDraft, handleApply, handleCollapse, handleResetDraft};
}