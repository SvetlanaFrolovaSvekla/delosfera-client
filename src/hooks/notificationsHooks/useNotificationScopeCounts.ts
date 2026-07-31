import { useEffect, useState } from "react";
import { notificationsService } from "@/service/notificationsService/notificationsService.ts";
import type { NotificationCounts } from "@/service/notificationsService/notificationsServiceType.ts";

interface ScopeCounts {
    all: number;
    unread: number;
    favorites: number;
    byCategory: Record<string, number>;
}

const EMPTY: ScopeCounts = { all: 0, unread: 0, favorites: 0, byCategory: {} };

export function useNotificationScopeCounts(refreshKey: number) {
    const [counts, setCounts] = useState<ScopeCounts>(EMPTY);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            notificationsService.getCounts(),
            notificationsService.search({ page: 1, pageSize: 1 }), // только totalCount
        ])
            .then(([countsRes, allRes]: [NotificationCounts, { totalCount: number }]) => {
                if (cancelled) return;
                setCounts({
                    all: allRes.totalCount,
                    unread: countsRes.totalUnread,
                    favorites: countsRes.totalFavorites,
                    byCategory: countsRes.unreadByCategory,
                });
            })
            .catch(() => {
                if (!cancelled) setCounts(EMPTY);
            });

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return counts;
}