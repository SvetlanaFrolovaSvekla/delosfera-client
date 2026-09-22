import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import type {NotificationCategoryOption} from "@/service/notificationsService/notificationsServiceType.ts";
import {NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META} from "@/constants/notificationCategory.ts";
import {useNotificationById} from "@/hooks/notificationsHooks/useNotificationById.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";

import {SeverityDot} from "@/components/componentsNotifications/SeverityDot.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Bell, ChevronRight, ArrowLeft, Star, Trash2, Paperclip, Download} from "lucide-react";


// Локаль для форматирования даты — следует за текущим языком интерфейса
// (i18next хранит "ru" / "ky" / "en", а Intl ждёт полноценный языковой тег).
const DATE_LOCALE: Record<string, string> = {
    ru: "ru-RU",
    ky: "ky-KG",
    en: "en-US",
};

export function OpenNotificationPage() {
    const {t, i18n} = useTranslation();

    function formatFullDate(iso: string) {
        return new Date(iso).toLocaleString(DATE_LOCALE[i18n.language] ?? "ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notificationId = id ? Number(id) : undefined;

    const [categories, setCategories] = useState<NotificationCategoryOption[]>([]);
    const [downloading, setDownloading] = useState(false);

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
                {/* Загрузка уведомления… */}
                <Loader label={t("notifications.loadingNotification")}/>
            </div>
        );
    }

    if (error || !notification) {
        return (
            <div className="w-full max-w-[900px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <EmptyState
                    icon={Bell}
                    variant="error"
                    // Уведомление не найдено
                    title={t("notifications.notificationNotFound")}
                    // Возможно, оно было удалено
                    description={error ?? t("notifications.maybeDeleted")}
                    // Назад к списку
                    actionLabel={t("notifications.backToList")}
                    onAction={() => navigate("/notifications")}
                />
            </div>
        );
    }

    const meta = NOTIFICATION_CATEGORY_META[notification.category] ?? DEFAULT_CATEGORY_META;
    const Icon = meta.icon;
    // Название категории берём из локального перевода по ключу, а не с бэка — так оно
    // переключается вместе с языком интерфейса (см. NotificationCategoryPanel).
    const categoryOption = categories.find((c) => c.key === notification.category);
    const categoryName = t(`notifications.categories.${notification.category}`, {
        defaultValue: categoryOption?.name ?? notification.category,
    });

    const handleDelete = async () => {
        // Удалить это уведомление?
        if (!window.confirm(t("notifications.confirmDelete"))) return;
        await remove();
        navigate("/notifications");
    };

    const handleDownloadAttachment = async () => {
        if (!notification.attachmentFileId) return;
        setDownloading(true);
        try {
            await downloadWithToast(
                notification.attachmentFileId,
                // файл.xlsx
                notification.attachmentFileName ?? t("notifications.defaultFileName"),
            );
        } catch {
            // downloadWithToast уже показал тост с ошибкой
        } finally {
            setDownloading(false);
        }
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
                    {/* Уведомления */}
                    {t("notifications.title")}
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
                        {/* Убрать из избранного / В избранное */}
                        {notification.isFavorite
                            ? t("notifications.removeFromFavorites")
                            : t("notifications.addToFavorites")}
                    </button>

                    <button
                        onClick={handleDelete}
                        className="hover:bg-[#f6f8fb] cursor-pointer flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#3a4560] transition-colors"
                    >
                        <Trash2 size={16} strokeWidth={1.8}/>
                        {/* Удалить */}
                        {t("notifications.delete")}
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

                {/* Файл, приложенный к уведомлению (например, Excel-план единоразовой рассылки
                    актуализации) — доступен прямо здесь, без почты. */}
                {notification.attachmentFileId && (
                    <div className="border-t border-slate-100 px-6 py-4">
                        <button
                            onClick={handleDownloadAttachment}
                            disabled={downloading}
                            className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-[#e5e9f0] bg-[#f6f8fb] px-4 py-2 text-sm font-semibold text-[#3a4560] transition hover:bg-[#eef1f7] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Paperclip className="h-4 w-4 text-[#8b97ab]"/>
                            {/* Вложение */}
                            {notification.attachmentFileName ?? t("notifications.attachment")}
                            <Download className="h-4 w-4"/>
                        </button>
                    </div>
                )}

                {notification.url && (
                    <div className="border-t border-slate-100 px-6 py-4">
                        <button
                            onClick={() => {
                                const url = notification.url!;
                                // Если сервер уже указал таб явно (?tab=...) в самой ссылке -
                                // используем его и не форсим state, иначе OpenVndPage.tsx
                                // (сначала смотрит location.state.tab, потом ?tab=) проигнорирует
                                // то, что прислал бэк. Раньше здесь стоял безусловный
                                // state: {tab: "approval"} для любой /base-vnd/... ссылки - из-за
                                // этого уведомление "Заявка на доступ к актуализации" (шлёт
                                // /base-vnd/{id}?tab=actual) вело не на «Актуализация», а на
                                // «Реквизиты» ("approval" не входит в список табов для статуса
                                // "active", и OpenVndPage.tsx откатывался на "passport").
                                const hasExplicitTab = url.includes("?tab=");
                                navigate(url, {
                                    state: !hasExplicitTab && url.startsWith("/base-vnd/")
                                        ? {tab: "approval"}
                                        : undefined,
                                });
                            }}
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#4e57d6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3d45c0]"
                        >
                            {/* Перейти к задаче */}
                            {t("notifications.goToTheTask")}
                            <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}