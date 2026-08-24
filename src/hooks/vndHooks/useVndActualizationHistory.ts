// История циклов актуализации ВНД (кто и когда актуализировал) - для вкладки «Актуализация»
import {useCallback, useEffect, useState} from "react";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import type {VndActualizationRecordResponse} from "@/service/vndService/vndServiceType.ts";

interface UseVndActualizationHistoryResult {
    data: VndActualizationRecordResponse[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useVndActualizationHistory(vndId: number | undefined): UseVndActualizationHistoryResult {
    const [data, setData] = useState<VndActualizationRecordResponse[]>([]);
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

        actualizationService.getHistory(vndId)
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить историю актуализаций");
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
