import {useEffect, useState} from "react";
import {vndAnalyticsService} from "@/service/analyticsService/vndAnalyticsService.ts";
import type {VndActualizationOverviewResponse} from "@/service/analyticsService/vndAnalyticsServiceType.ts";

/** Данные вкладки "Актуализация" страницы отчётности по ВНД: бакеты сроков, открытые циклы,
 * их длительность, заявки на доступ к актуализации */
export function useVndActualizationOverview() {
    const [overview, setOverview] = useState<VndActualizationOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);

        vndAnalyticsService
            .getActualizationOverview()
            .then((data) => {
                if (!cancelled) setOverview(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить статистику актуализации");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {overview, loading, error};
}
