// Категории уведомлений
import type { NotificationCategory } from "@/service/notificationsService/notificationsServiceType.ts";
import {
    Bell,
    FileText,
    ShieldCheck,
    ListChecks,
    MoreHorizontal,
    FileSignature,
    ShoppingCart,
    type LucideIcon,
} from "lucide-react";

interface NotificationCategoryMeta {
    icon: LucideIcon;
    color: string;   // текст/иконка
    bg: string;      // фон карточки в неактивном состоянии
    ring: string;    // акцентная обводка в активном состоянии
}

export const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, NotificationCategoryMeta> = {
    System: { icon: Bell, color: "#55617a", bg: "#eef2f7", ring: "#cbd3df" },
    Vnd: { icon: FileText, color: "#0e8091", bg: "#dbf2f5", ring: "#b4e6ec" },
    Sz: { icon: FileSignature, color: "#b45309", bg: "#fef3e0", ring: "#fbe3b8" },
    Procurement: { icon: ShoppingCart, color: "#0f8a5f", bg: "#e3f7ee", ring: "#c3ecd9" },
    Other: { icon: MoreHorizontal, color: "#6b7686", bg: "#eceff3", ring: "#d7dde6" },
    // Approval/Task - легаси, своей вкладки больше нет (см. notificationsServiceType.ts),
    // но карточки старых уведомлений с такой категорией должны на что-то отрисоваться.
    Approval: { icon: ShieldCheck, color: "#7a5ce0", bg: "#efeafe", ring: "#ddd0fa" },
    Task: { icon: ListChecks, color: "#2f68f5", bg: "#e9f0ff", ring: "#cbddff" },
};

export const DEFAULT_CATEGORY_META: NotificationCategoryMeta = {
    icon: Bell,
    color: "#55617a",
    bg: "#eef2f7",
    ring: "#cbd3df",
};