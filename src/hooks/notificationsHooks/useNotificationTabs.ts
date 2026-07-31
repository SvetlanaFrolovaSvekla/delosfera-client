import { useState } from "react";
import type { NotificationCategory } from "@/service/notificationsService/notificationsServiceType.ts";

export type NotificationMainTab = "all" | "unread" | "favorites";
export type NotificationCategoryTab = NotificationCategory | "all";

export function useNotificationTabs() {
    const [mainTab, setMainTab] = useState<NotificationMainTab>("all");
    const [categoryTab, setCategoryTab] = useState<NotificationCategoryTab>("all");

    const resetTabs = () => {
        setMainTab("all");
        setCategoryTab("all");
    };

    return { mainTab, setMainTab, categoryTab, setCategoryTab, resetTabs };
}