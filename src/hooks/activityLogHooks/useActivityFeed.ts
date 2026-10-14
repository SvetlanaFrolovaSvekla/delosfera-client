// Лента "Активность на портале" с отбором на сервере (поиск, период, тип, раздел) и подгрузкой
// следующих страниц по кнопке "Показать ещё" (см. ActivityLogController.GetFeed).
import {useCallback, useEffect, useRef, useState} from "react";
import {activityLogService} from "@/service/activityLogService/activityLogService.ts";
import type {ActivityFeedQuery, ActivityLogEntryResponse} from "@/service/activityLogService/activityLogServiceType.ts";
import {notificationsRefreshBus} from "@/service/notificationsRefreshBus.ts";

export function useActivityFeed(filters: Omit<ActivityFeedQuery, "cursor" | "limit">, pageSize = 30) {
    const [items, setItems] = useState<ActivityLogEntryResponse[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cursorRef = useRef<string | null>(null);
    const requestId = useRef(0);

    // Отбор сравниваем по значению, а не по ссылке на объект
    const filtersKey = JSON.stringify(filters);

    const loadFirst = useCallback(() => {
        const id = ++requestId.current;
        setIsLoading(true);
        setError(null);
        activityLogService.getFeed({...(JSON.parse(filtersKey) as ActivityFeedQuery), limit: pageSize})
            .then((page) => {
                if (id !== requestId.current) return; // ответ на устаревший отбор - игнор
                setItems(page.items);
                setHasMore(page.hasMore);
                cursorRef.current = page.nextCursor;
            })
            .catch((e) => {
                if (id !== requestId.current) return;
                setError(e instanceof Error ? e.message : "Ошибка загрузки активности");
            })
            .finally(() => {
                if (id === requestId.current) setIsLoading(false);
            });
    }, [filtersKey, pageSize]);

    const loadMore = useCallback(() => {
        if (!cursorRef.current || isLoadingMore) return;
        const id = requestId.current;
        setIsLoadingMore(true);
        activityLogService.getFeed({
            ...(JSON.parse(filtersKey) as ActivityFeedQuery), limit: pageSize, cursor: cursorRef.current,
        })
            .then((page) => {
                if (id !== requestId.current) return; // отбор успели поменять
                setItems((prev) => [...prev, ...page.items]);
                setHasMore(page.hasMore);
                cursorRef.current = page.nextCursor;
            })
            .catch((e) => {
                if (id !== requestId.current) return;
                setError(e instanceof Error ? e.message : "Ошибка загрузки активности");
            })
            .finally(() => setIsLoadingMore(false));
    }, [filtersKey, pageSize, isLoadingMore]);

    useEffect(() => {
        loadFirst();
    }, [loadFirst]);

    // Новое уведомление (см. NotificationsDropdown) - обычно это и есть новая активность
    useEffect(() => notificationsRefreshBus.subscribe(loadFirst), [loadFirst]);

    return {items, hasMore, isLoading, isLoadingMore, error, loadMore};
}
