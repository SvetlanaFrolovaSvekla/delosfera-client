import { useEffect, useState } from "react";
import { vndService } from "@/service/vndService/vndService.ts";
import type { VndActualizationSummaryResponse } from "@/service/vndService/vndServiceType.ts";

export function useActualizationSummary() {
    const [summary, setSummary] = useState<VndActualizationSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        vndService
            .getActualizationSummary()
            .then((res) => {
                if (!cancelled) setSummary(res);
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить сводку по актуализации");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { summary, isLoading, error };
}