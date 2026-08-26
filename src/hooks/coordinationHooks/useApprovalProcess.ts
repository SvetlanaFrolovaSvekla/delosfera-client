// Загрузка процесса согласования ВНД + возможность тихо перезагрузить его после действия
// (decide/cancel/revision), не включая общий лоадер страницы повторно.
import {useCallback, useEffect, useState} from "react";
import axios from "axios";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

const isNotStartedYet = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 404;

export function useApprovalProcess(vndId: number) {
    const [process, setProcess] = useState<ApprovalProcessResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProcess = useCallback(async () => {
        try {
            const data = await coordinationService.getByVndId(vndId);
            setProcess(data);
            setError(null);
        } catch (err) {
            setProcess(null);
            setError(isNotStartedYet(err)
                ? null
                : err instanceof Error ? err.message : "Не удалось загрузить согласование!");
        }
    }, [vndId]);

    // Только этот эффект переключает "loading" — первичная загрузка при монтировании/смене vndId.
    // Ручной вызов reload() (после decide/cancel/revision) обновляет process тихо, без лоадера.
    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        fetchProcess().finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [fetchProcess]);

    return {process, loading, error, reload: fetchProcess};
}