// Заявки на доступ к актуализации конкретного ВНД (любого статуса) - для истории/аудита
// и для того, чтобы понять, есть ли у текущего пользователя своя заявка по этому документу.
import {useCallback, useEffect, useState} from "react";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import type {VndActualizationRequestResponse} from "@/service/actualizationService/actualizationServiceTypes.ts";

interface UseVndActualizationRequestsResult {
    data: VndActualizationRequestResponse[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useVndActualizationRequests(vndId: number | undefined): UseVndActualizationRequestsResult {
    const [data, setData] = useState<VndActualizationRequestResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        if (vndId === undefined || Number.isNaN(vndId)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setData([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        actualizationService.getRequests(vndId)
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить заявки на актуализацию");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [vndId, reloadKey]);

    return {data, loading, error, refetch};
}
