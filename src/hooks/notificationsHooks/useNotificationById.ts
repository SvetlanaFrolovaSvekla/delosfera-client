import { useCallback, useEffect, useState } from "react";
import { notificationsService } from "@/service/notificationsService/notificationsService.ts";
import type { Notification } from "@/service/notificationsService/notificationsServiceType.ts";

interface UseNotificationByIdResult {
    notification: Notification | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
    markAsRead: () => Promise<void>;
    markAsUnread: () => Promise<void>;
    toggleFavorite: () => Promise<void>;
    remove: () => Promise<void>;
}

export function useNotificationById(id: number | undefined): UseNotificationByIdResult {
    const [notification, setNotification] = useState<Notification | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        if (id === undefined) return;

        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);

        notificationsService
            .getById(id)
            .then((data) => {
                if (!cancelled) setNotification(data);
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить уведомление");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, reloadKey]);

    const markAsRead = useCallback(async () => {
        if (!notification || notification.isRead) return;
        const updated = await notificationsService.markAsRead(notification.id);
        setNotification(updated);
    }, [notification]);

    const markAsUnread = useCallback(async () => {
        if (!notification || !notification.isRead) return;
        const updated = await notificationsService.markAsUnread(notification.id);
        setNotification(updated);
    }, [notification]);

    const toggleFavorite = useCallback(async () => {
        if (!notification) return;
        const updated = await notificationsService.toggleFavorite(notification.id);
        setNotification(updated);
    }, [notification]);

    const remove = useCallback(async () => {
        if (!notification) return;
        await notificationsService.delete(notification.id);
    }, [notification]);

    return { notification, loading, error, refetch, markAsRead, markAsUnread, toggleFavorite, remove };
}