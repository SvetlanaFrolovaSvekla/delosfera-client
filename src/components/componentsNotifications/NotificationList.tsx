// Список уведомлений
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
    Notification,
    NotificationCategoryOption,
} from "@/service/notificationsService/notificationsServiceType.ts";
import { NotificationRow } from "./NotificationRow.tsx";
import { EmptyState } from "@/components/componentsGeneral/EmptyState.tsx";
import { Bell } from "lucide-react";

interface NotificationListProps {
    rows: Notification[];
    searchQuery: string;
    categories: NotificationCategoryOption[];
    showCategoryLabel: boolean; // true, когда выбраны "Все категории"
    onRead: (id: number) => void;
    onToggleFavorite: (id: number) => void;
    onDelete: (id: number) => Promise<void>;
    onResetFilters: () => void;
}

export function NotificationList({
                                     rows,
                                     searchQuery,
                                     categories,
                                     showCategoryLabel,
                                     onRead,
                                     onToggleFavorite,
                                     onDelete,
                                     onResetFilters,
                                 }: NotificationListProps) {
    const { t } = useTranslation();

    // Название категории берём из локального перевода по ключу, а не с бэка (c.name) —
    // так оно переключается вместе с языком интерфейса; если перевода для ключа ещё
    // нет, используем название с бэка как запасной вариант.
    const categoryNameByKey = useMemo(
        () => new Map(categories.map((c) => [c.key, t(`notifications.categories.${c.key}`, { defaultValue: c.name })])),
        [categories, t]
    );

    if (rows.length === 0) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                    icon={Bell}
                    title={t("notifications.list.emptyTitle")}
                    description={t("notifications.list.emptyDescription")}
                    actionLabel={t("notifications.list.resetFilters")}
                    onAction={onResetFilters}
                />
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {rows.map((n) => (
                <NotificationRow
                    key={n.id}
                    notification={n}
                    searchQuery={searchQuery}
                    categoryLabel={showCategoryLabel ? categoryNameByKey.get(n.category) : undefined}
                    onRead={onRead}
                    onToggleFavorite={onToggleFavorite}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
