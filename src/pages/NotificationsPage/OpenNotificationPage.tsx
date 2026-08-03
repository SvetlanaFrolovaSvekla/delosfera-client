import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Bell, ChevronRight, ArrowLeft, Star, Trash2} from "lucide-react";

import {useNotificationById} from "@/hooks/notificationsHooks/useNotificationById.ts";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import type {NotificationCategoryOption} from "@/service/notificationsService/notificationsServiceType.ts";
import {NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META} from "@/constants/notificationCategory.ts";
import {SeverityDot} from "@/components/componentsNotifications/SeverityDot.tsx";

import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

function formatFullDate(iso: string) {
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function OpenNotificationPage() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notificationId = id ? Number(id) : undefined;

    const [categories, setCategories] = useState<NotificationCategoryOption[]>([]);

    useEffect(() => {
        notificationsService.getCategories().then(setCategories).catch(() => setCategories([]));
    }, []);

    const {
        notification,
        loading,
        error,
        markAsRead,
        toggleFavorite,
        remove,
    } = useNotificationById(notificationId);

    // при открытии страницы уведомление автоматически отмечается прочитанным
    useEffect(() => {
        if (notification && !notification.isRead) {
            markAsRead().catch(() => {
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notification?.id]);

    if (loading) {
        return (
            <div className="w-full max-w-[900px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <Loader label="Загрузка уведомления…"/>
            </div>
        );
    }

    if (error || !notification) {
        return (
            <div className="w-full max-w-[900px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <EmptyState
                    icon={Bell}
                    variant="error"
                    title="Уведомление не найдено"
                    description={error ?? "Возможно, оно было удалено"}
                    actionLabel="Назад к списку"
                    onAction={() => navigate("/notifications")}
                />
            </div>
        );
    }

    const meta = NOTIFICATION_CATEGORY_META[notification.category] ?? DEFAULT_CATEGORY_META;
    const Icon = meta.icon;
    const categoryName = categories.find((c) => c.key === notification.category)?.name ?? notification.category;

    const handleDelete = async () => {
        if (!window.confirm("Удалить это уведомление?")) return;
        await remove();
        navigate("/notifications");
    };

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            {/* Хедер */}
            <div className="mb-5 flex items-center justify-between gap-3">
                <button
                    onClick={() => navigate("/notifications")}
                    className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
                >
                    <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                    Уведомления
                </button>


                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => toggleFavorite()}
                        className={`hover:bg-[#f6f8fb] text-[#3a4560] bg-white cursor-pointer flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition-colors`}
                    >
                        <Star
                            size={16}
                            strokeWidth={1.8}
                            className={notification.isFavorite ? "text-amber-500 fill-amber-500" : ""}
                        />
                        {notification.isFavorite ? "Убрать из избранного" : "В избранное"}
                    </button>

                    <button
                        onClick={handleDelete}
                        className="hover:bg-[#f6f8fb] cursor-pointer flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#3a4560] transition-colors"
                    >
                        <Trash2 size={16} strokeWidth={1.8}/>
                        Удалить
                    </button>


                </div>
            </div>

            {/* Карточка уведомления */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
                    <span
                        className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl"
                        style={{backgroundColor: meta.bg, color: meta.color}}
                    >
                        <Icon className="h-5 w-5"/>
                    </span>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <SeverityDot severity={notification.severity}/>
                            <span
                                className="rounded-full px-2 py-[1px] text-[11px] font-semibold"
                                style={{backgroundColor: meta.bg, color: meta.color}}
                            >
                                {categoryName}
                            </span>
                            {!notification.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#4e57d6]"/>}
                        </div>

                        <h1 className="mt-1.5 text-lg font-semibold text-slate-900">{notification.title}</h1>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{formatFullDate(notification.createdAt)}</span>
                            {notification.createdByName && <span>· {notification.createdByName}</span>}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-600">
                        {notification.body}
                    </p>
                </div>

                {notification.url && (
                    <div className="border-t border-slate-100 px-6 py-4">
                        <button
                            onClick={() => navigate(notification.url!)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e57d6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3d45c0]"
                        >
                            Перейти к объекту
                            <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}