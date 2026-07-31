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

export function NotificationCategoryPanel({
                                              categories,
                                              value,
                                              onChange,
                                              unreadByCategory,
                                              totalCount,
                                          }: NotificationCategoryPanelProps) {
    return (
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {/* "Все категории" */}
            <button
                onClick={() => onChange("all")}
                className={
                    "cursor-pointer group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all " +
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
                <span className="min-w-0">
                    <span
                        className={
                            "block truncate text-[13px] font-semibold " +
                            (value === "all" ? "text-[#4e57d6]" : "text-slate-700")
                        }
                    >
                        Все категории
                    </span>
                    <span className="block font-mono text-[11px] text-slate-400">{totalCount} всего</span>
                </span>
            </button>

            {categories.map((cat) => {
                const meta = NOTIFICATION_CATEGORY_META[cat.key as keyof typeof NOTIFICATION_CATEGORY_META] ?? DEFAULT_CATEGORY_META;
                const Icon = meta.icon;
                const active = value === cat.key;
                const unread = unreadByCategory[String(cat.code)] ?? 0;

                return (
                    <button
                        key={cat.key}
                        onClick={() => onChange(cat.key as NotificationCategoryTab)}
                        className={
                            "cursor-pointer group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all " +
                            (active
                                ? "border-transparent shadow-[0_4px_14px_-6px_rgba(15,27,45,0.28)]"
                                : "border-slate-200 bg-white hover:-translate-y-[1px] hover:shadow-[0_6px_16px_-10px_rgba(15,27,45,0.25)]")
                        }
                        style={active ? {
                            backgroundColor: meta.bg,
                            boxShadow: `inset 0 0 0 1.5px ${meta.ring}`
                        } : undefined}
                    >
                        <span
                            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
                            style={{
                                backgroundColor: active ? "#fff" : meta.bg,
                                color: meta.color,
                            }}
                        >
                            <Icon className="h-4.5 w-4.5"/>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-slate-800">
                                {cat.name}
                            </span>
                            <span className="block font-mono text-[11px] text-slate-400">
                                {unread > 0 ? `${unread} непрочит.` : "нет новых"}
                            </span>
                        </span>
                        {unread > 0 && (
                            <span
                                className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] font-bold text-white"
                                style={{backgroundColor: meta.color}}
                            >
                                {unread}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}