import { useMemo } from "react";
import { Bell } from "lucide-react";
import { NotificationRow } from "./NotificationRow.tsx";
import { EmptyState } from "@/components/componentsGeneral/EmptyState.tsx";
import type {
    Notification,
    NotificationCategoryOption,
} from "@/service/notificationsService/notificationsServiceType.ts";

interface NotificationListProps {
    rows: Notification[];
    searchQuery: string;
    categories: NotificationCategoryOption[];
    showCategoryLabel: boolean; // true, когда выбраны "Все категории"
    onRead: (id: number) => void;
    onToggleFavorite: (id: number) => void;
    onDelete: (id: number) => void;
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
    const categoryNameByKey = useMemo(
        () => new Map(categories.map((c) => [c.key, c.name])),
        [categories]
    );

    if (rows.length === 0) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                    icon={Bell}
                    title="Здесь пока пусто!"
                    description="В этой категории нет уведомлений — попробуйте изменить фильтры или поиск"
                    actionLabel="Сбросить фильтры"
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