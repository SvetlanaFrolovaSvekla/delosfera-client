import {useEffect, useState} from "react";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import type {Notification, NotificationCategory} from "@/service/notificationsService/notificationsServiceType.ts";

/**
 * Последние уведомления для виджета на главной — первая страница общего списка
 * (тот же /notifications/search, что и на странице "Мои уведомления"), сортировка
 * "самые новые сверху" там уже есть. category - как у "Последней активности"
 * (см. useRecentActivity.ts): при смене таба перезапрашивает с сервера, а не режет
 * по уже загруженным limit штукам, иначе на неглавном табе строк было бы меньше limit.
 */
export function useRecentNotifications(limit = 8, category?: NotificationCategory) {
    const [items, setItems] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        notificationsService.search({page: 1, pageSize: limit, categories: category ? [category] : undefined})
            .then((res) => {
                if (!cancelled) setItems(res.items);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить уведомления");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [limit, category]);

    return {items, isLoading, error};
}
