import { useEffect, useRef, useState, type SetStateAction} from "react";
import { useTranslation } from "react-i18next";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import type {Notification, NotificationFilter, NotificationSeverity} from "@/service/notificationsService/notificationsServiceType.ts";
import type {NotificationMainTab, NotificationCategoryTab} from "./useNotificationTabs.ts";

export const PAGE_SIZE = 20;

export function buildFilter(
    mainTab: NotificationMainTab,
    categoryTab: NotificationCategoryTab,
    severity: NotificationSeverity[],
    search: string,
    page: number
): NotificationFilter {
    const filter: NotificationFilter = {
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
    };

    if (mainTab === "unread") filter.isRead = false;
    if (mainTab === "favorites") filter.isFavorite = true;
    if (categoryTab !== "all") filter.categories = [categoryTab];
    if (severity.length > 0) filter.severities = severity;

    return filter;
}

export function useNotificationRows(
    mainTab: NotificationMainTab,
    categoryTab: NotificationCategoryTab,
    severities: NotificationSeverity[],
    search: string,
    page: number,
    reloadKey: number
) {
    const { t, i18n } = useTranslation();
    const [rows, setRows] = useState<Notification[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Запрос из-за смены reloadKey (отметили прочитанным, в избранное, удалили) - "тихий":
    // список остаётся на экране и обновляется на месте. Раньше тут тоже включался loading, и страница
    // подменяла весь список лоадером - высота схлопывалась, и прокрутка прыгала вверх.
    // Смена фильтров, страницы или языка по-прежнему показывает лоадер.
    const lastReloadKeyRef = useRef(reloadKey);

    useEffect(() => {
        let cancelled = false;
        const silent = lastReloadKeyRef.current !== reloadKey;
        lastReloadKeyRef.current = reloadKey;
        if (!silent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(true);
        }
        setError(null);

        notificationsService
            .search(buildFilter(mainTab, categoryTab, severities, search, page))
            .then((res: { items: SetStateAction<Notification[]>; totalCount: SetStateAction<number>; }) => {
                if (cancelled) return;
                setRows(res.items);
                setTotalCount(res.totalCount);
            })
            .catch(() => {
                if (!cancelled) setError(t("notifications.loadRowsError"));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // Перезапрашиваем и при смене языка интерфейса (i18n.language) - заголовок/текст
        // каждого уведомления резолвится сервером по заголовку X-Language на момент запроса
        // (см. NotificationService.ResolveBody), поэтому без этой зависимости переключение
        // языка не обновляло уже отрисованный список, пока страница не перезагружалась целиком.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainTab, categoryTab, severities, search, page, reloadKey, i18n.language]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return { rows, setRows, totalCount, totalPages, loading, error };
}
