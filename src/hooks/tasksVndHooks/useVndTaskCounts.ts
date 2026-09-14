import { useEffect, useState, useCallback } from "react";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";
import type {VndTaskCountsResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";


const EMPTY_COUNTS: VndTaskCountsResponse = {
    coordination: 0,
    actualization: 0,
    consolidation: 0,
    myVndApproval: 0,
    rejected: 0,
    actualizationRequests: 0,
    actualizationApproved: 0,
};

export function useVndTaskCounts() {
    const [counts, setCounts] = useState<VndTaskCountsResponse>(EMPTY_COUNTS);
    const [isLoading, setIsLoading] = useState(true);
    // Раньше любая ошибка запроса молча подменялась нулевыми счётчиками — бейджи на вкладках
    // задач показывали бы "0" неотличимо от честного "задач правда нет". Отдаём error наружу,
    // чтобы вызывающий код (см. VndTasksPanel) мог отличить одно от другого.
    const [error, setError] = useState<unknown>(null);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await tasksService.getCounts();
            setCounts(data);
        } catch (e) {
            setError(e);
            setCounts(EMPTY_COUNTS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refetch();
    }, [refetch]);

    return { counts, isLoading, error, refetch };
}