/**
 * Ряд вкладок-карточек над списком уведомлений: "Все категории" + один пункт на категорию.
 */
import {useTranslation} from "react-i18next";
import type {NotificationCategoryOption} from "@/service/notificationsService/notificationsServiceType.ts";
import {NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META} from "@/constants/notificationCategory.ts";
import {INBOX_CONTOUR_META} from "@/constants/taskInboxConst.ts";
import type {NotificationCategoryTab} from "@/hooks/notificationsHooks/useNotificationTabs.ts";
import {Layers, type LucideIcon} from "lucide-react";

const TAB_META_OVERRIDE: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
    Vnd: INBOX_CONTOUR_META.vnd,
    Sz: INBOX_CONTOUR_META.sz,
    Procurement: INBOX_CONTOUR_META.prc,
    Acknowledgement: INBOX_CONTOUR_META.ack,
};

interface NotificationCategoryPanelProps {
    categories: NotificationCategoryOption[];
    value: NotificationCategoryTab;
    onChange: (value: NotificationCategoryTab) => void;
    unreadByCategory: Record<string, number>;
    totalCount: number;
}

export function NotificationCategoryPanel({
                                              categories,
                                              value,
                                              onChange,
                                              unreadByCategory,
                                              totalCount,
                                          }: NotificationCategoryPanelProps) {
    const {t} = useTranslation();

    return (
        <div className="mb-5 flex flex-wrap gap-2.5">
            {/* "Все категории" */}
            <button
                onClick={() => onChange("all")}
                className={
                    "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all " +
                    (value === "all"
                        ? "border-[#4e57d6] bg-[#ececfc] shadow-[0_4px_14px_-6px_rgba(78,87,214,0.35)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
                }
            >
                <span
                    className={
                        "flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors " +
                        (value === "all" ? "bg-[#4e57d6] text-white" : "bg-slate-100 text-slate-500")
                    }
                >
                    <Layers className="h-4.5 w-4.5"/>
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span
                        className={
                            "truncate text-[13px] font-semibold " +
                            (value === "all" ? "text-[#4e57d6]" : "text-slate-700")
                        }
                    >
                        {t("notifications.categories.all")}
                    </span>
                    {totalCount > 0 && (
                        <span
                            className={
                                "flex-none rounded-full px-[7px] py-[1px] font-mono text-[11px] font-bold " +
                                (value === "all" ? "bg-white text-[#4e57d6]" : "bg-slate-100 text-slate-500")
                            }
                        >
                            {totalCount}
                        </span>
                    )}
                </span>
            </button>

            {categories.map((cat) => {
                const baseMeta = NOTIFICATION_CATEGORY_META[cat.key as keyof typeof NOTIFICATION_CATEGORY_META] ?? DEFAULT_CATEGORY_META;
                const meta = TAB_META_OVERRIDE[cat.key] ?? baseMeta;
                const Icon = meta.icon;
                const active = value === cat.key;
                const unread = unreadByCategory[String(cat.code)] ?? 0;
                const label = t(`notifications.categories.${cat.key}`, {defaultValue: cat.name});

                return (
                    <button
                        key={cat.key}
                        onClick={() => onChange(cat.key as NotificationCategoryTab)}
                        className={
                            "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all " +
                            (active
                                ? "border-[#4e57d6] bg-[#ececfc] shadow-[0_4px_14px_-6px_rgba(78,87,214,0.35)]"
                                : "border-slate-200 bg-white hover:-translate-y-[1px] hover:shadow-[0_6px_16px_-10px_rgba(15,27,45,0.25)]")
                        }
                    >
                        <span
                            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors"
                            style={{backgroundColor: active ? "#4e57d6" : meta.bg, color: active ? "#fff" : meta.color}}
                        >
                            <Icon className="h-4.5 w-4.5"/>
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span
                                className="truncate text-[13px] font-semibold"
                                style={active ? {color: "#4e57d6"} : undefined}
                            >
                                {!active && <span className="text-slate-800">{label}</span>}
                                {active && label}
                            </span>
                            {unread > 0 && (
                                <span
                                    className={
                                        "flex-none rounded-full px-[7px] py-[1px] font-mono text-[11px] font-bold " +
                                        (active ? "bg-white text-[#4e57d6]" : "text-white")
                                    }
                                    style={active ? undefined : {backgroundColor: meta.color}}
                                >
                                    {unread}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
