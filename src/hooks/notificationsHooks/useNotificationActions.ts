import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/service/toastService.ts";
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
    const { t } = useTranslation();

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

    // Массовые действия над отмеченными id - одним запросом на действие. Id могут быть не только
    // с текущей страницы (режим "выбрать все по фильтру"), поэтому список правим по id, а не по rows.
    // Массовое действие: итог сообщаем тостом (сколько записей сервер реально затронул),
    // а сбой не глотаем - иначе оптимистичное обновление списка молча откатывается перезагрузкой.
    const runBulk = async (action: () => Promise<number>, doneKey: string) => {
        try {
            const affected = await action();
            toast.success(t(doneKey, { n: affected }));
        } catch {
            toast.error(t("notifications.bulk.failed"));
        } finally {
            onMutated();
        }
    };

    const bulkMarkAsRead = async (ids: number[]) => {
        if (ids.length === 0) return;
        const set = new Set(ids);
        setRows((prev) => prev.map((n) => (set.has(n.id) ? { ...n, isRead: true } : n)));
        await runBulk(() => notificationsService.bulkMarkAsRead(ids), "notifications.bulk.readDone");
    };

    // favorite=true - добавить в избранное; false - убрать из избранного.
    const bulkSetFavorite = async (ids: number[], favorite: boolean) => {
        if (ids.length === 0) return;
        const set = new Set(ids);
        setRows((prev) => prev.map((n) => (set.has(n.id) ? { ...n, isFavorite: favorite } : n)));
        await runBulk(
            () => notificationsService.bulkSetFavorite(ids, favorite),
            favorite ? "notifications.bulk.favoriteAdded" : "notifications.bulk.favoriteRemoved",
        );
    };

    const bulkDelete = async (ids: number[]) => {
        if (ids.length === 0) return;
        const set = new Set(ids);
        setRows((prev) => prev.filter((n) => !set.has(n.id)));
        await runBulk(() => notificationsService.bulkDelete(ids), "notifications.bulk.deleted");
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