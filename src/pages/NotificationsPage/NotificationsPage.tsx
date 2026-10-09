import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { notificationsService } from "@/service/notificationsService/notificationsService.ts";
import type {
    NotificationCategoryOption,
    NotificationSeverity,
} from "@/service/notificationsService/notificationsServiceType.ts";

import { useNotificationTabs } from "@/hooks/notificationsHooks/useNotificationTabs.ts";
import { useNotificationScopeCounts } from "@/hooks/notificationsHooks/useNotificationScopeCounts.ts";
import { useNotificationRows } from "@/hooks/notificationsHooks/useNotificationRows.ts";
import { useNotificationActions } from "@/hooks/notificationsHooks/useNotificationActions.ts";

import { NotificationCategoryPanel } from "@/components/componentsNotifications/NotificationCategoryPanel.tsx";
import { NotificationSeverityFilter } from "@/components/componentsNotifications/NotificationSeverityFilter.tsx";
import { NotificationList } from "@/components/componentsNotifications/NotificationList.tsx";

import { PageHeader } from "@/components/componentsGeneral/PageHeader.tsx";
import { SearchBar } from "@/components/componentsGeneral/SearchBar.tsx";
import { ConfirmActionModal } from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import { Tabs } from "@/components/componentsGeneral/Tabs.tsx";
import { Loader } from "@/components/componentsGeneral/Loader.tsx";
import { EmptyState } from "@/components/componentsGeneral/EmptyState.tsx";

import { Check, CheckCheck, Star, Trash2 } from "lucide-react";

export function NotificationsPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [severities, setSeverities] = useState<NotificationSeverity[]>([]);
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    // Подтверждение перед "Прочитать все" - действие массовое, случайный клик не должен его запускать.
    const [markAllConfirmOpen, setMarkAllConfirmOpen] = useState(false);
    const [categories, setCategories] = useState<NotificationCategoryOption[]>([]);
    // Выбор строк для массовых действий (чекбоксы) и подтверждение массового удаления.
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

    const {
        markAsRead,
        markAllAsRead,
        toggleFavorite,
        deleteNotification,
        bulkMarkAsRead,
        bulkSetFavorite,
        bulkDelete,
    } = useNotificationActions({
        rows,
        setRows,
        categoryTab,
        onMutated: bumpReload,
    });

    // Смена вкладки, фильтра, поиска или страницы меняет набор строк - прежний выбор к ним не относится.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(new Set());
    }, [mainTab, categoryTab, severities, debouncedSearch, page]);

    // После обновления списка (удалили, перечитали) выкидываем из выбора то, чего на странице уже нет.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected((prev) => {
            const ids = new Set(rows.map((n) => n.id));
            const next = new Set([...prev].filter((id) => ids.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [rows]);

    const toggleRow = (id: number) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleAll = () =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (rows.every((n) => next.has(n.id))) rows.forEach((n) => next.delete(n.id));
            else rows.forEach((n) => next.add(n.id));
            return next;
        });

    const selectedRows = rows.filter((n) => selected.has(n.id));
    const hasUnreadSelected = selectedRows.some((n) => !n.isRead);
    // Если все отмеченные уже в избранном, кнопка превращается в "Убрать из избранного".
    const allSelectedFavorite = selectedRows.length > 0 && selectedRows.every((n) => n.isFavorite);

    const resetFilters = () => {
        resetTabs();
        setSearch("");
        setSeverities([]);
    };

    const mainTabs = [
        // Все
        { id: "all" as const, label: t("notifications.tabs.all"), n: counts.all },
        // Непрочитанные
        { id: "unread" as const, label: t("notifications.tabs.unread"), n: counts.unread },
        // Избранное
        { id: "favorites" as const, label: t("notifications.tabs.favorites"), n: counts.favorites },
    ];

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("notifications.pageTitle")}
                description={
                    <>
                        {t("notifications.unreadCountLabel")} <b className="text-[#4e57d6]">{counts.unread}</b>
                    </>
                }
                actions={
                    <button
                        onClick={() => setMarkAllConfirmOpen(true)}
                        disabled={counts.unread === 0}
                        className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Check className="h-4 w-4" />
                        {t("notifications.markAllRead")}
                    </button>
                }
            />

            <SearchBar
                className="mb-5"
                placeholder={t("notifications.searchPlaceholder")}
                value={search}
                onChange={setSearch}
                variant="white"
            />

            {/* Модалка подтверждения прочтения всех уведомлений */}
            <ConfirmActionModal
                open={markAllConfirmOpen}
                onClose={() => setMarkAllConfirmOpen(false)}
                onConfirm={() => {
                    setMarkAllConfirmOpen(false);
                    void markAllAsRead();
                }}
                variant="primary"
                icon={CheckCheck}
                title={t("notifications.markAllConfirm.title", { defaultValue: "Прочитать все уведомления?" })}
                message={t("notifications.markAllConfirm.message", { defaultValue: "Все непрочитанные уведомления будут отмечены прочитанными." })}
                confirmLabel={t("notifications.markAllConfirm.confirm", { defaultValue: "Прочитать все" })}
            />

            {/* Подтверждение массового удаления выбранных уведомлений */}
            <ConfirmActionModal
                open={bulkDeleteOpen}
                onClose={() => setBulkDeleteOpen(false)}
                onConfirm={() => {
                    setBulkDeleteOpen(false);
                    void bulkDelete([...selected]);
                    setSelected(new Set());
                }}
                variant="danger"
                icon={Trash2}
                title={t("notifications.bulk.deleteConfirmTitle", { defaultValue: "Удалить выбранные уведомления?" })}
                message={t("notifications.bulk.deleteConfirmMessage", { n: selected.size, defaultValue: "Будет удалено уведомлений: {{n}}. Это действие нельзя отменить." })}
                confirmLabel={t("notifications.bulk.delete", { defaultValue: "Удалить" })}
            />

            <Tabs<"all" | "unread" | "favorites"> tabs={mainTabs} value={mainTab} onChange={setMainTab} />

            <NotificationCategoryPanel
                categories={categories}
                value={categoryTab}
                onChange={setCategoryTab}
                unreadByCategory={counts.byCategory}
                totalCount={counts.all}
            />

            {/* Фильтры по типу уведомления */}
            <NotificationSeverityFilter value={severities} onChange={setSeverities} />

            {loading ? (
                // Загрузка уведомлений…
                <Loader label={t("notifications.loadingNotifications")} />
            ) : error ? (
                <EmptyState
                    variant="error"
                    // Не удалось загрузить данные
                    title={t("notifications.loadError")}
                    description={error}
                />
            ) : (
                <>
                    {/* Панель массовых действий - появляется, когда отмечено хотя бы одно уведомление */}
                    {selected.size > 0 && (
                        <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/40 px-3.5 py-3">
                            <span className="text-[12.5px] font-semibold text-slate-400">
                                {t("notifications.bulk.selected", { n: selected.size, defaultValue: "Выбрано: {{n}}" })}
                            </span>
                            <button
                                type="button"
                                onClick={() => void bulkMarkAsRead([...selected])}
                                disabled={!hasUnreadSelected}
                                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#c9ccf0] bg-white px-3 text-[12.5px] font-semibold text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {t("notifications.bulk.markRead", { defaultValue: "Отметить прочитанными" })}
                            </button>
                            <button
                                type="button"
                                onClick={() => void bulkSetFavorite([...selected], !allSelectedFavorite)}
                                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#ecd9a6] bg-white px-3 text-[12.5px] font-semibold text-[#a16207] transition-colors"
                            >
                                <Star className="h-3.5 w-3.5 text-[#ca8a04]" />
                                {allSelectedFavorite
                                    ? t("notifications.bulk.removeFavorite", { defaultValue: "Убрать из избранного" })
                                    : t("notifications.bulk.addFavorite", { defaultValue: "В избранное" })}
                            </button>
                            <button
                                type="button"
                                onClick={() => setBulkDeleteOpen(true)}
                                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#f1c9c2] bg-white px-3 text-[12.5px] font-semibold text-[#c0392b]"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t("notifications.bulk.delete", { defaultValue: "Удалить" })}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelected(new Set())}
                                className="cursor-pointer border-none bg-transparent text-[12px] text-[#8b97ab]"
                            >
                                {t("notifications.bulk.clear", { defaultValue: "Снять выделение" })}
                            </button>
                        </div>
                    )}

                    <NotificationList
                        rows={rows}
                        searchQuery={debouncedSearch}
                        categories={categories}
                        showCategoryLabel={categoryTab === "all"}
                        onRead={markAsRead}
                        onToggleFavorite={toggleFavorite}
                        onDelete={deleteNotification}
                        onResetFilters={resetFilters}
                        selectedIds={selected}
                        onToggleSelect={toggleRow}
                        onToggleAll={toggleAll}
                    />

                    {totalPages > 1 && (
                        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <span className="text-xs text-slate-400">
                                {/* Показано {rows.length} из {totalCount} */}
                                {t("notifications.shownOfTotal", { shown: rows.length, total: totalCount })}
                            </span>
                            {/* Кнопки по центру, подпись "Показано..." слева */}
                            <div className="flex items-center justify-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {/* Назад */}
                                    {t("notifications.pagination.prev")}
                                </button>
                                <span className="px-2 text-xs text-slate-500">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {/* Вперёд */}
                                    {t("notifications.pagination.next")}
                                </button>
                            </div>
                            <span aria-hidden="true"/>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}