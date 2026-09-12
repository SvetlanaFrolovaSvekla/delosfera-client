// Виджет "Последние уведомления" на главной
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {Bell, ChevronRight} from "lucide-react";
import {useRecentNotifications} from "@/hooks/notificationsHooks/useRecentNotifications.ts";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import {NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META} from "@/constants/notificationCategory.ts";
import {timeAgo} from "@/utils/dateUtils.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

interface RecentNotificationsCardProps {
    limit?: number;
}

export function RecentNotificationsCard({limit = 8}: RecentNotificationsCardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {items, isLoading, error} = useRecentNotifications(limit);

    const handleOpen = (id: number, isRead: boolean) => {
        if (!isRead) notificationsService.markAsRead(id).catch(() => undefined);
        navigate(`/notifications/${id}`);
    };

    // Переход к задаче — как на карточке уведомления (OpenNotificationPage.tsx):
    // для ВНД дополнительно открываем вкладку "Согласование".
    const goToTask = (n: {id: number; url: string | null; isRead: boolean}) => {
        if (!n.url) return;
        if (!n.isRead) notificationsService.markAsRead(n.id).catch(() => undefined);
        navigate(n.url, {state: n.url.startsWith("/base-vnd/") ? {tab: "approval"} : undefined});
    };

    return (
        // flex h-full flex-col — растягивается на всю высоту своей ячейки грида, вровень
        // с "Последняя активность" рядом (см. HomePage.tsx: обе карточки — в одной строке
        // грида и по умолчанию растягиваются до высоты более длинной из них — без ручного
        // измерения через JS).
        <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                {/* Последние уведомления */}
                <h2 className="text-[15px] font-semibold">{t("home.recentNotifications.title")}</h2>
                <button
                    className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                    onClick={() => navigate("/notifications")}
                >
                    {/* Все уведомления */}
                    {t("home.recentNotifications.viewAll")}
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[14px] pt-1.5">
                {isLoading ? (
                    // Загрузка уведомлений…
                    <Loader label={t("home.recentNotifications.loading")} fullHeight={false}/>
                ) : error ? (
                    <div className="py-6 text-center text-[13px] text-[#c0392b]">{error}</div>
                ) : items.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-[#8b97ab]">
                        {/* Пока нет уведомлений */}
                        {t("home.recentNotifications.empty")}
                    </div>
                ) : (
                    items.map((n) => {
                        const meta = NOTIFICATION_CATEGORY_META[n.category] ?? DEFAULT_CATEGORY_META;
                        const CategoryIcon = meta.icon;
                        return (
                            <div
                                key={n.id}
                                onClick={() => handleOpen(n.id, n.isRead)}
                                className={
                                    "flex cursor-pointer items-center gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0 hover:bg-[#fafbfc] " +
                                    (!n.isRead ? "bg-[#f7f7fd]" : "")
                                }
                            >
                                <span
                                    className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px]"
                                    style={{background: meta.bg, color: meta.color}}
                                >
                                    {n.url ? <CategoryIcon className="h-3.5 w-3.5"/> : <Bell className="h-3.5 w-3.5"/>}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div
                                        className={
                                            "truncate text-[12.5px] leading-[1.4] " +
                                            (n.isRead ? "text-[#26324a]" : "font-semibold text-[#0f1b2d]")
                                        }
                                    >
                                        {n.title}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-[#8b97ab]">{timeAgo(n.createdAt)}</div>
                                </div>
                                {n.url && (
                                    // Перейти к задаче — справа в строке, шрифт тоньше, чем у
                                    // "Все уведомления" в шапке (там — акцент на кнопке-ссылке).
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            goToTask(n);
                                        }}
                                        className="inline-flex flex-none cursor-pointer items-center gap-0.5 whitespace-nowrap pl-2 text-[12px] font-normal text-[var(--app-accent,_#2f68f5)] hover:underline"
                                    >
                                        Перейти к задаче
                                        <ChevronRight className="h-3 w-3"/>
                                    </button>
                                )}
                                {!n.isRead && <span className="ml-2 h-1.5 w-1.5 flex-none rounded-full bg-[#4e57d6]"/>}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
