import {
    Bell,
    FileText,
    ShieldCheck,
    ListChecks,
    MoreHorizontal,
    type LucideIcon,
} from "lucide-react";
import type { NotificationCategory } from "@/service/notificationsService/notificationsServiceType.ts";

interface NotificationCategoryMeta {
    icon: LucideIcon;
    color: string;   // текст/иконка
    bg: string;      // фон карточки в неактивном состоянии
    ring: string;    // акцентная обводка в активном состоянии
}

export const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, NotificationCategoryMeta> = {
    System: { icon: Bell, color: "#55617a", bg: "#eef2f7", ring: "#cbd3df" },
    Vnd: { icon: FileText, color: "#0e8091", bg: "#dbf2f5", ring: "#b4e6ec" },
    Approval: { icon: ShieldCheck, color: "#7a5ce0", bg: "#efeafe", ring: "#ddd0fa" },
    Task: { icon: ListChecks, color: "#2f68f5", bg: "#e9f0ff", ring: "#cbddff" },
    Other: { icon: MoreHorizontal, color: "#6b7686", bg: "#eceff3", ring: "#d7dde6" },
};

export const DEFAULT_CATEGORY_META: NotificationCategoryMeta = {
    icon: Bell,
    color: "#55617a",
    bg: "#eef2f7",
    ring: "#cbd3df",
};