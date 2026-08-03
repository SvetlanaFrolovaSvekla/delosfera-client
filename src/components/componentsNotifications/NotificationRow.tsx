import { useNavigate } from "react-router-dom";
import type { Notification } from "@/service/notificationsService/notificationsServiceType.ts";
import { HighlightText } from "@/utils/HighlightText.tsx";
import { NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META } from "@/constants/notificationCategory.ts";
import { SeverityDot } from "./SeverityDot.tsx";
import { Bell, ChevronRight, Star, Trash2 } from "lucide-react";

interface NotificationRowProps {
    notification: Notification;
    searchQuery: string;
    categoryLabel?: string; // показывается только когда выбраны "Все категории"
    onRead: (id: number) => void;
    onToggleFavorite: (id: number) => void;
    onDelete: (id: number) => void;
}

function formatTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
        ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function NotificationRow({
                                    notification: n,
                                    searchQuery,
                                    categoryLabel,
                                    onRead,
                                    onToggleFavorite,
                                    onDelete,
                                }: NotificationRowProps) {
    const navigate = useNavigate();
    const meta = NOTIFICATION_CATEGORY_META[n.category] ?? DEFAULT_CATEGORY_META;
    const Icon = meta.icon;

    const handleClick = () => {
        if (!n.isRead) onRead(n.id);
        navigate(`/notifications/${n.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className={
                "group flex cursor-pointer gap-3 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50 " +
                (!n.isRead ? "bg-[#f7f7fd]" : "")
            }
        >
            <div className="mt-2.5 flex flex-none flex-col items-center gap-1">
                <SeverityDot severity={n.severity} />
                {!n.isRead && <span className="h-1 w-1 rounded-full bg-[#4e57d6]" />}
            </div>

            <span
                className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg"
                style={{ backgroundColor: meta.bg, color: meta.color }}
            >
                {n.url ? <Icon className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <HighlightText
                        text={n.title}
                        query={searchQuery}
                        className={
                            "min-w-0 truncate text-[13.5px] " +
                            (n.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900")
                        }
                    />
                    {categoryLabel && (
                        <span
                            className="flex-none rounded-full px-2 py-[1px] text-[10.5px] font-semibold"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                            {categoryLabel}
                        </span>
                    )}
                </div>

                <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-slate-500">
                    {n.body}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-[11px] text-slate-400">{formatTime(n.createdAt)}</span>
                    {n.createdByName && <span className="text-[11px] text-slate-400">· {n.createdByName}</span>}
                    {n.url && (
                        <span
                            className="inline-flex items-center gap-1 font-mono text-[11.5px] font-semibold"
                            style={{ color: meta.color }}
                        >
                            Перейти
                            <ChevronRight className="h-3 w-3" />
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-none items-start gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(n.id);
                    }}
                    className="cursor-pointer rounded-md p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-amber-400"
                    aria-label={n.isFavorite ? "Убрать из избранного" : "В избранное"}
                >
                    <Star className={"h-4 w-4 " + (n.isFavorite ? "fill-amber-400 text-amber-400" : "")} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(n.id);
                    }}
                    className="cursor-pointer rounded-md p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-rose-500"
                    aria-label="Удалить"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}