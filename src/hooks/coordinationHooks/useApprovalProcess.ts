import {useCallback, useEffect, useState} from "react";
import {isAxiosError} from "axios";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

interface UseApprovalProcessResult {
    process: ApprovalProcessResponse | null;
    loading: boolean;
    error: string | null;
    /** Согласование по этому ВНД ещё не запускалось (бэк вернул 404) */
    notStarted: boolean;
    refetch: () => Promise<void>;
}

export function useApprovalProcess(vndId?: number): UseApprovalProcessResult {
    const [process, setProcess] = useState<ApprovalProcessResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notStarted, setNotStarted] = useState(false);

    const fetchProcess = useCallback(async () => {
        if (!vndId) return;
        setLoading(true);
        setError(null);
        setNotStarted(false);
        try {
            const data = await coordinationService.getByVndId(vndId);
            setProcess(data);
        } catch (e) {
            if (isAxiosError(e) && e.response?.status === 404) {
                setProcess(null);
                setNotStarted(true);
            } else {
                setError(e instanceof Error ? e.message : "Не удалось загрузить процесс согласования");
            }
        } finally {
            setLoading(false);
        }
    }, [vndId]);

    useEffect(() => {
        void fetchProcess();
    }, [fetchProcess]);

    return {process, loading, error, notStarted, refetch: fetchProcess};
}