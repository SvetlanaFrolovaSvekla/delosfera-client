import type { Dispatch, SetStateAction } from "react";
import { notificationsService } from "@/service/notificationsService/notificationsService.ts";
import type { useNotificationRows } from "@/hooks/notificationsHooks/useNotificationRows.ts";
import type { useNotificationTabs } from "@/hooks/notificationsHooks/useNotificationTabs.ts";

type NotificationRow = ReturnType<typeof useNotificationRows>["rows"][number];
type CategoryTab = ReturnType<typeof useNotificationTabs>["categoryTab"];

interface UseNotificationActionsParams {
    rows: NotificationRow[];
    setRows: Dispatch<SetStateAction<NotificationRow[]>>;
    categoryTab: CategoryTab;
    onMutated: () => void;
}

export function useNotificationActions({ rows, setRows, categoryTab, onMutated }: UseNotificationActionsParams) {
    const markAsRead = async (id: number) => {
        const target = rows.find((n) => n.id === id);
        if (!target || target.isRead) return;

        setRows((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        try {
            await notificationsService.markAsRead(id);
            onMutated();
        } catch {
            setRows((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
        }
    };

    const markAllAsRead = async () => {
        const prevRows = rows;
        setRows((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            const category = categoryTab !== "all" ? categoryTab : undefined;
            await notificationsService.markAllAsRead(category);
            onMutated();
        } catch {
            setRows(prevRows);
        }
    };

    const toggleFavorite = async (id: number) => {
        const target = rows.find((n) => n.id === id);
        if (!target) return;
        const next = !target.isFavorite;

        setRows((prev) => prev.map((n) => (n.id === id ? { ...n, isFavorite: next } : n)));
        try {
            await notificationsService.toggleFavorite(id);
            onMutated();
        } catch {
            setRows((prev) => prev.map((n) => (n.id === id ? { ...n, isFavorite: !next } : n)));
        }
    };

    const deleteNotification = async (id: number) => {
        const prevRows = rows;
        setRows((prev) => prev.filter((n) => n.id !== id));
        try {
            await notificationsService.delete(id);
            onMutated();
        } catch (e) {
            setRows(prevRows);
            throw e;
        }
    };

    // Массовые действия над отмеченными строками. Оптимистично правим список, шлём запросы по
    // одному (пакетных методов на бэке нет) и обновляем страницу один раз в конце - если часть
    // запросов упала, тихая перезагрузка вернёт реальное состояние.
    const bulkMarkAsRead = async (ids: number[]) => {
        const targets = rows.filter((n) => ids.includes(n.id) && !n.isRead).map((n) => n.id);
        if (targets.length === 0) return;
        const set = new Set(targets);
        setRows((prev) => prev.map((n) => (set.has(n.id) ? { ...n, isRead: true } : n)));
        await Promise.allSettled(targets.map((id) => notificationsService.markAsRead(id)));
        onMutated();
    };

    // favorite=true - добавить в избранное тех, кто там ещё не лежит; false - убрать из избранного.
    const bulkSetFavorite = async (ids: number[], favorite: boolean) => {
        const targets = rows.filter((n) => ids.includes(n.id) && n.isFavorite !== favorite).map((n) => n.id);
        if (targets.length === 0) return;
        const set = new Set(targets);
        setRows((prev) => prev.map((n) => (set.has(n.id) ? { ...n, isFavorite: favorite } : n)));
        await Promise.allSettled(targets.map((id) => notificationsService.toggleFavorite(id)));
        onMutated();
    };

    const bulkDelete = async (ids: number[]) => {
        if (ids.length === 0) return;
        const set = new Set(ids);
        setRows((prev) => prev.filter((n) => !set.has(n.id)));
        await Promise.allSettled(ids.map((id) => notificationsService.delete(id)));
        onMutated();
    };

    return {
        markAsRead,
        markAllAsRead,
        toggleFavorite,
        deleteNotification,
        bulkMarkAsRead,
        bulkSetFavorite,
        bulkDelete,
    };
}