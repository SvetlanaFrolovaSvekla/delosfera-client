import {useEffect, useState} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

interface UseVndByIdResult {
    data: VndResponse | null;
    loading: boolean;
    error: string | null;
}

export function useVndById(id: number | undefined): UseVndByIdResult {
    const [data, setData] = useState<VndResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id === undefined || Number.isNaN(id)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setData(null);
            setLoading(false);
            setError("Некорректный идентификатор документа");
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        vndService.getById(id)
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить документ");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    return {data, loading, error};
}