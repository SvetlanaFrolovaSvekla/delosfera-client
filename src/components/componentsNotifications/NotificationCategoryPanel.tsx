import {useTranslation} from "react-i18next";
import type {NotificationCategoryOption} from "@/service/notificationsService/notificationsServiceType.ts";
import type {NotificationCategoryTab} from "@/hooks/notificationsHooks/useNotificationTabs.ts";
import {NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META} from "@/constants/notificationCategory.ts";
import {Layers} from "lucide-react";

interface NotificationCategoryPanelProps {
    categories: NotificationCategoryOption[];
    value: NotificationCategoryTab;
    onChange: (value: NotificationCategoryTab) => void;
    unreadByCategory: Record<string, number>;
    totalCount: number;
}

/**
 * Ряд вкладок-карточек над списком уведомлений: "Все категории" + один пункт на категорию.
 * Стилизован так же, как TaskInboxFilterTabs на странице "Мои задачи" (карточка, цветная
 * иконка, подсветка активной вкладки цветом категории) — чтобы обе страницы выглядели
 * единообразно.
 */
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
                const meta = NOTIFICATION_CATEGORY_META[cat.key as keyof typeof NOTIFICATION_CATEGORY_META] ?? DEFAULT_CATEGORY_META;
                const Icon = meta.icon;
                const active = value === cat.key;
                const unread = unreadByCategory[String(cat.code)] ?? 0;
                // Название категории берём из локального перевода по ключу (System/Vnd/Sz/...),
                // а не с бэка (cat.name) — так оно переключается вместе с языком интерфейса;
                // если перевода для ключа ещё нет, используем название с бэка как запасной вариант.
                const label = t(`notifications.categories.${cat.key}`, {defaultValue: cat.name});

                return (
                    <button
                        key={cat.key}
                        onClick={() => onChange(cat.key as NotificationCategoryTab)}
                        className={
                            "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all " +
                            (active
                                ? "shadow-[0_4px_14px_-6px_rgba(15,27,45,0.28)]"
                                : "border-slate-200 bg-white hover:-translate-y-[1px] hover:shadow-[0_6px_16px_-10px_rgba(15,27,45,0.25)]")
                        }
                        style={active ? {borderColor: meta.color, backgroundColor: meta.bg} : undefined}
                    >
                        <span
                            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors"
                            style={{backgroundColor: active ? meta.color : meta.bg, color: active ? "#fff" : meta.color}}
                        >
                            <Icon className="h-4.5 w-4.5"/>
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span
                                className="truncate text-[13px] font-semibold"
                                style={active ? {color: meta.color} : undefined}
                            >
                                {!active && <span className="text-slate-800">{label}</span>}
                                {active && label}
                            </span>
                            {unread > 0 && (
                                <span
                                    className="flex-none rounded-full px-[7px] py-[1px] font-mono text-[11px] font-bold text-white"
                                    style={{backgroundColor: meta.color}}
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
