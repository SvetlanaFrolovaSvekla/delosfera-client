// Список уведомлений
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
    Notification,
    NotificationCategoryOption,
} from "@/service/notificationsService/notificationsServiceType.ts";
import { NotificationRow } from "./NotificationRow.tsx";
import { PlainCheckbox } from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
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
    selectedIds: Set<number>;
    onToggleSelect: (id: number) => void;
    onToggleAll: () => void;
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
                                     selectedIds,
                                     onToggleSelect,
                                     onToggleAll,
                                 }: NotificationListProps) {
    const { t } = useTranslation();

    // Название категории берём из локального перевода по ключу, а не с бэка -
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

    const allSelected = rows.length > 0 && rows.every((n) => selectedIds.has(n.id));

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Шапка списка: "выбрать все на странице" */}
            <div className="flex items-center gap-3 border-b border-slate-100 bg-[#fafbfd] px-5 py-2.5">
                <PlainCheckbox checked={allSelected} onChange={onToggleAll} className="font-semibold text-slate-500">
                    {t("notifications.bulk.selectAll", { defaultValue: "Выбрать все на странице" })}
                </PlainCheckbox>
            </div>
            {rows.map((n) => (
                <NotificationRow
                    key={n.id}
                    notification={n}
                    searchQuery={searchQuery}
                    categoryLabel={showCategoryLabel ? categoryNameByKey.get(n.category) : undefined}
                    onRead={onRead}
                    onToggleFavorite={onToggleFavorite}
                    onDelete={onDelete}
                    selected={selectedIds.has(n.id)}
                    onToggleSelect={onToggleSelect}
                />
            ))}
        </div>
    );
}
