import {useCallback, useEffect, useRef, useState} from "react";
import {activityLogService} from "@/service/activityLogService/activityLogService.ts";
import type {ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";
import {notificationsRefreshBus} from "@/service/notificationsRefreshBus.ts";

export function useRecentActivity(limit = 8, module?: string) {
    const [items, setItems] = useState<ActivityLogEntryResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    const fetchItems = useCallback(() => {
        const id = ++requestId.current;
        setIsLoading(true);
        setError(null);

        activityLogService.getRecent(limit, module)
            .then((data) => {
                if (id !== requestId.current) return; // ответ на устаревший запрос - игнор
                setItems(data);
            })
            .catch((e) => {
                if (id !== requestId.current) return;
                setError(e instanceof Error ? e.message : "Ошибка загрузки активности");
            })
            .finally(() => {
                if (id === requestId.current) setIsLoading(false);
            });
    }, [limit, module]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Обновляем "Последнюю активность", когда где-то обнаружено новое уведомление
    // (см. NotificationsDropdown) - многие уведомления как раз о новой активности.
    useEffect(() => notificationsRefreshBus.subscribe(fetchItems), [fetchItems]);

    return {items, isLoading, error};
}
