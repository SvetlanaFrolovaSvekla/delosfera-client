import { useCallback, useEffect, useState } from "react";
import { vndService } from "@/service/vndService/vndService.ts";
import type { VndRedactionResponse } from "@/service/vndService/vndServiceType.ts";

interface UseVndRedactionsResult {
    data: VndRedactionResponse[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useVndRedactions(vndId: number | undefined): UseVndRedactionsResult {
    const [data, setData] = useState<VndRedactionResponse[]>([]);
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

        vndService.getRedactions(vndId)
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить редакции");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [vndId, reloadKey]);

    return { data, loading, error, refetch };
}