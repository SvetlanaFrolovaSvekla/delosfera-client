import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notificationsService } from "@/service/notificationsService/notificationsService";
import type {
    Notification,
    NotificationCategory,
    NotificationCategoryOption,
    NotificationCounts,
    NotificationFilter,
} from "@/service/notificationsService/notificationsServiceType";

export type ActiveTab = "all" | "unread" | "favorites" | NotificationCategory;

const PAGE_SIZE = 20;

export function useNotifications() {
    const [items, setItems] = useState<Notification[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);

    const [categories, setCategories] = useState<NotificationCategoryOption[]>([]);
    const [counts, setCounts] = useState<NotificationCounts | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requestId = useRef(0);

    // дебаунс поиска
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    // сброс страницы при смене вкладки/поиска
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [activeTab, debouncedSearch]);

    const buildFilter = useCallback((): NotificationFilter => {
        const filter: NotificationFilter = {
            page,
            pageSize: PAGE_SIZE,
            search: debouncedSearch || undefined,
        };

        if (activeTab === "unread") filter.isRead = false;
        else if (activeTab === "favorites") filter.isFavorite = true;
        else if (activeTab !== "all") filter.categories = [activeTab];

        return filter;
    }, [page, debouncedSearch, activeTab]);

    const fetchList = useCallback(async () => {
        const id = ++requestId.current;
        setIsFetching(true);
        setError(null);
        try {
            const res = await notificationsService.search(buildFilter());
            if (id !== requestId.current) return; // отменённый запрос — игнорируем
            setItems(res.items);
            setTotalCount(res.totalCount);
        } catch {
            if (id === requestId.current) setError("Не удалось загрузить уведомления");
        } finally {
            if (id === requestId.current) {
                setIsFetching(false);
                setIsLoading(false);
            }
        }
    }, [buildFilter]);

    const fetchCounts = useCallback(async () => {
        try {
            const res = await notificationsService.getCounts();
            setCounts(res);
        } catch {
            /* не критично для UI */
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await notificationsService.getCategories();
            setCategories(res);
        } catch {
            /* не критично для UI */
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    const markAsRead = useCallback(
        async (id: number) => {
            const target = items.find(n => n.id === id);
            if (!target || target.isRead) return;

            setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
            try {
                await notificationsService.markAsRead(id);
                fetchCounts();
            } catch {
                setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: false } : n)));
            }
        },
        [items, fetchCounts]
    );

    const markAllAsRead = useCallback(async () => {
        const prevItems = items;
        setItems(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            const category = activeTab !== "all" && activeTab !== "unread" && activeTab !== "favorites"
                ? activeTab
                : undefined;
            await notificationsService.markAllAsRead(category);
            fetchCounts();
        } catch {
            setItems(prevItems);
        }
    }, [items, activeTab, fetchCounts]);

    const toggleFavorite = useCallback(
        async (id: number) => {
            const target = items.find(n => n.id === id);
            if (!target) return;
            const next = !target.isFavorite;

            setItems(prev => prev.map(n => (n.id === id ? { ...n, isFavorite: next } : n)));
            try {
                await notificationsService.toggleFavorite(id);
                fetchCounts();
            } catch {
                setItems(prev => prev.map(n => (n.id === id ? { ...n, isFavorite: !next } : n)));
            }
        },
        [items, fetchCounts]
    );

    const removeNotification = useCallback(
        async (id: number) => {
            const prevItems = items;
            setItems(prev => prev.filter(n => n.id !== id));
            setTotalCount(c => Math.max(0, c - 1));
            try {
                await notificationsService.delete(id);
                fetchCounts();
            } catch {
                setItems(prevItems);
                setTotalCount(c => c + 1);
            }
        },
        [items, fetchCounts]
    );

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const tabBadge = useMemo(() => {
        return (tab: ActiveTab): number | undefined => {
            if (!counts) return undefined;
            if (tab === "unread") return counts.totalUnread || undefined;
            if (tab === "favorites") return counts.totalFavorites || undefined;
            if (tab === "all") return undefined;
            const opt = categories.find(c => c.key === tab);
            if (!opt) return undefined;
            return counts.unreadByCategory[String(opt.code)] || undefined;
        };
    }, [counts, categories]);

    return {
        items,
        totalCount,
        page,
        totalPages,
        setPage,
        categories,
        counts,
        activeTab,
        setActiveTab,
        search,
        setSearch,
        isLoading,
        isFetching,
        error,
        tabBadge,
        markAsRead,
        markAllAsRead,
        toggleFavorite,
        removeNotification,
        refetch: fetchList,
    };
}