import {useEffect, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";

export interface VndHomeSummary {
    myResponsibleActualizations: number;
    myTimeoutApprovalsThisMonth: number;
    myVndAwaitingApproval: number;
    pendingMyApproval: number;
}

export function useVndHomeSummary() {
    const [summary, setSummary] = useState<VndHomeSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);

        axiosInstance
            .get<VndHomeSummary>("/tasks/home-summary")
            .then((res) => {
                if (!cancelled) setSummary(res.data);
            })
            .catch(() => {
                if (!cancelled) setSummary(null);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {summary, isLoading};
}