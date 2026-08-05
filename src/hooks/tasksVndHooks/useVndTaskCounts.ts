import { useEffect, useState, useCallback } from "react";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";
import type {VndTaskCountsResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";


const EMPTY_COUNTS: VndTaskCountsResponse = {
    coordination: 0,
    actualization: 0,
    consolidation: 0,
    myVndApproval: 0,
};

export function useVndTaskCounts() {
    const [counts, setCounts] = useState<VndTaskCountsResponse>(EMPTY_COUNTS);
    const [isLoading, setIsLoading] = useState(true);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await tasksService.getCounts();
            setCounts(data);
        } catch {
            setCounts(EMPTY_COUNTS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refetch();
    }, [refetch]);

    return { counts, isLoading, refetch };
}