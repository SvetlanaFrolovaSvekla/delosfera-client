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
        } catch {
            setRows(prevRows);
        }
    };

    return { markAsRead, markAllAsRead, toggleFavorite, deleteNotification };
}