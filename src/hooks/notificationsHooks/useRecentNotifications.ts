import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import type {Notification, NotificationCategory} from "@/service/notificationsService/notificationsServiceType.ts";
import {notificationsRefreshBus} from "@/service/notificationsRefreshBus.ts";

/**
 * Последние уведомления для виджета на главной — первая страница общего списка
 * (тот же /notifications/search, что и на странице "Мои уведомления"), сортировка
 * "самые новые сверху" там уже есть. category - как у "Последней активности"
 * (см. useRecentActivity.ts): при смене таба перезапрашивает с сервера, а не режет
 * по уже загруженным limit штукам, иначе на неглавном табе строк было бы меньше limit.
 */
export function useRecentNotifications(limit = 8, category?: NotificationCategory) {
    const {i18n} = useTranslation();
    const [items, setItems] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    const fetchItems = useCallback(() => {
        const id = ++requestId.current;
        setIsLoading(true);
        setError(null);

        notificationsService.search({page: 1, pageSize: limit, categories: category ? [category] : undefined})
            .then((res) => {
                if (id !== requestId.current) return; // ответ на устаревший запрос - игнор
                setItems(res.items);
            })
            .catch((e) => {
                if (id !== requestId.current) return;
                setError(e instanceof Error ? e.message : "Не удалось загрузить уведомления");
            })
            .finally(() => {
                if (id === requestId.current) setIsLoading(false);
            });
    }, [limit, category]);

    useEffect(() => {
        fetchItems();
        // i18n.language - перезапросить при смене языка интерфейса, иначе заголовки/текст
        // уведомлений остаются в языке, который был на момент первой загрузки виджета (см. тот
        // же комментарий в useNotificationRows.ts).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchItems, i18n.language]);

    // Обновляем список, когда где-то обнаружено новое уведомление (см.
    // NotificationsDropdown) - иначе виджет на главной устаревает, пока пользователь
    // сам не перезайдёт на страницу.
    useEffect(() => notificationsRefreshBus.subscribe(fetchItems), [fetchItems]);

    return {items, isLoading, error};
}
