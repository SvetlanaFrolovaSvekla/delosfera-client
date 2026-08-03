import { useEffect, useState } from "react";
import { notificationsService } from "@/service/notificationsService/notificationsService.ts";
import type {
    NotificationCategoryOption,
    NotificationSeverity,
} from "@/service/notificationsService/notificationsServiceType.ts";

import { useNotificationTabs } from "@/hooks/notificationsHooks/useNotificationTabs.ts";
import { useNotificationScopeCounts } from "@/hooks/notificationsHooks/useNotificationScopeCounts.ts";
import { useNotificationRows } from "@/hooks/notificationsHooks/useNotificationRows.ts";
import { useNotificationActions } from "@/hooks/notificationsHooks/useNotificationActions.ts";

import { NotificationsPageHeader } from "@/components/componentsNotifications/NotificationsPageHeader.tsx";
import { NotificationCategoryPanel } from "@/components/componentsNotifications/NotificationCategoryPanel.tsx";
import { NotificationSeverityFilter } from "@/components/componentsNotifications/NotificationSeverityFilter.tsx";
import { NotificationList } from "@/components/componentsNotifications/NotificationList.tsx";

import { Tabs } from "@/components/componentsGeneral/Tabs.tsx";
import { Loader } from "@/components/componentsGeneral/Loader.tsx";
import { EmptyState } from "@/components/componentsGeneral/EmptyState.tsx";

export function NotificationsPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [severities, setSeverities] = useState<NotificationSeverity[]>([]);
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [categories, setCategories] = useState<NotificationCategoryOption[]>([]);

    const { mainTab, setMainTab, categoryTab, setCategoryTab, resetTabs } = useNotificationTabs();

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [mainTab, categoryTab, severities, debouncedSearch]);

    useEffect(() => {
        notificationsService.getCategories().then(setCategories).catch(() => setCategories([]));
    }, []);

    const counts = useNotificationScopeCounts(reloadKey);
    const { rows, setRows, totalCount, totalPages, loading, error } = useNotificationRows(
        mainTab,
        categoryTab,
        severities,
        debouncedSearch,
        page,
        reloadKey
    );

    const bumpReload = () => setReloadKey((k) => k + 1);

    const { markAsRead, markAllAsRead, toggleFavorite, deleteNotification } = useNotificationActions({
        rows,
        setRows,
        categoryTab,
        onMutated: bumpReload,
    });

    const resetFilters = () => {
        resetTabs();
        setSearch("");
        setSeverities([]);
    };

    const mainTabs = [
        { id: "all" as const, label: "Все", n: counts.all },
        { id: "unread" as const, label: "Непрочитанные", n: counts.unread },
        { id: "favorites" as const, label: "Избранное", n: counts.favorites },
    ];

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <NotificationsPageHeader
                unreadCount={counts.unread}
                onMarkAllRead={markAllAsRead}
                markAllDisabled={counts.unread === 0}
                search={search}
                onSearchChange={setSearch}
            />

            <Tabs<"all" | "unread" | "favorites"> tabs={mainTabs} value={mainTab} onChange={setMainTab} />

            <NotificationCategoryPanel
                categories={categories}
                value={categoryTab}
                onChange={setCategoryTab}
                unreadByCategory={counts.byCategory}
                totalCount={counts.all}
            />

            <NotificationSeverityFilter value={severities} onChange={setSeverities} />

            {loading ? (
                <Loader label="Загрузка уведомлений…" />
            ) : error ? (
                <EmptyState variant="error" title="Не удалось загрузить данные" description={error} />
            ) : (
                <>
                    <NotificationList
                        rows={rows}
                        searchQuery={debouncedSearch}
                        categories={categories}
                        showCategoryLabel={categoryTab === "all"}
                        onRead={markAsRead}
                        onToggleFavorite={toggleFavorite}
                        onDelete={deleteNotification}
                        onResetFilters={resetFilters}
                    />

                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-400">
                                Показано {rows.length} из {totalCount}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                                >
                                    Назад
                                </button>
                                <span className="px-2 text-xs text-slate-500">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                                >
                                    Вперёд
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}