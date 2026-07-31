import {useEffect, useState} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndActualizationSummaryResponse} from "@/service/vndService/vndServiceType.ts";

export function useVndActualizationSummary() {
    const [summary, setSummary] = useState<VndActualizationSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        vndService.getActualizationSummary()
            .then((data) => {
                if (!cancelled) setSummary(data);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить сводку");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {summary, loading, error};
}