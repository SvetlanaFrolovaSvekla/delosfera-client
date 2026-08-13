import {useEffect, useState} from "react";
import {activityLogService} from "@/service/activityLogService/activityLogService.ts";
import type {ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";

export function useRecentActivity(limit = 8, module?: string) {
    const [items, setItems] = useState<ActivityLogEntryResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        activityLogService.getRecent(limit, module)
            .then((data) => {
                if (!cancelled) setItems(data);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки активности");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [limit, module]);

    return {items, isLoading, error};
}