// Виджет "Последние уведомления" на главной
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {Bell, BellOff, ChevronRight} from "lucide-react";
import {useRecentNotifications} from "@/hooks/notificationsHooks/useRecentNotifications.ts";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import {NOTIFICATION_CATEGORY_META, DEFAULT_CATEGORY_META} from "@/constants/notificationCategory.ts";
import {timeAgo} from "@/utils/dateUtils.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {HOME_BOTTOM_ROW_HEIGHT} from "@/constants/home.ts";

interface RecentNotificationsCardProps {
    limit?: number;
}

export function RecentNotificationsCard({limit = 15}: RecentNotificationsCardProps) {
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
        // Высота зафиксирована (HOME_BOTTOM_ROW_HEIGHT) и совпадает с "Последняя активность"
        // рядом (см. RecentActivityCard.tsx) - список ниже сам скроллится, если 15 строк
        // не помещаются (см. flex-1 min-h-0 overflow-y-auto на списке).
        <div
            className="flex flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            style={{height: HOME_BOTTOM_ROW_HEIGHT}}
        >
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
                    <EmptyState
                        embedded
                        icon={BellOff}
                        title={t("home.recentNotifications.empty")}
                        description={t("home.recentNotifications.emptyDescription")}
                    />
                ) : (
                    // Строка похожа на "Последняя активность" рядом (RecentActivityCard) - та же
                    // иконка-бейдж слева, тот же текстовый блок из двух строк (заголовок +
                    // "N назад"), тот же разделитель между строками. Кнопка "Перейти к задаче"
                    // вернулась (только когда у уведомления вообще есть привязанная задача/
                    // документ - n.url) - клик по строке целиком открывает само уведомление
                    // (как и раньше делал handleOpen), а кнопка - отдельное действие сразу к
                    // задаче, поэтому останавливает всплытие клика на строку. Осталась убрана
                    // только точка "непрочитано" - она "плавала" отдельно от текста и не
                    // понравилась; непрочитанное по-прежнему выделяется жирным заголовком.
                    items.map((n) => {
                        const meta = NOTIFICATION_CATEGORY_META[n.category] ?? DEFAULT_CATEGORY_META;
                        const CategoryIcon = meta.icon;
                        return (
                            <div
                                key={n.id}
                                onClick={() => handleOpen(n.id, n.isRead)}
                                className="flex cursor-pointer gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0 hover:bg-[#fafbfc]"
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
                                            "text-[12.5px] leading-[1.4] " +
                                            (n.isRead ? "text-[#26324a]" : "font-semibold text-[#0f1b2d]")
                                        }
                                    >
                                        {n.title}
                                    </div>
                                    {/* Часть текста уведомления - чтобы был понятен смысл, не открывая
                                        само уведомление. В одну строку с обрезкой (полный текст - по
                                        клику), так же как в общем списке уведомлений (см. NotificationRow). */}
                                    {n.body && (
                                        <div className="mt-0.5 line-clamp-1 text-[11.5px] leading-[1.4] text-[#8b97ab]">
                                            {n.body}
                                        </div>
                                    )}
                                    {/* Код и название ВНД - только для уведомлений о ВНД (entityType === "Vnd"),
                                        чтобы сразу было видно, о каком документе речь, не открывая уведомление */}
                                    {n.entityType === "Vnd" && n.vndCode && (
                                        <div className="mt-0.5 truncate text-[11px] text-[#5b6b84]">
                                            <span className="font-medium">{n.vndCode}</span>
                                            {n.vndTitle && <span className="text-[#8b97ab]"> · {n.vndTitle}</span>}
                                        </div>
                                    )}
                                    <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-[#8b97ab]">{timeAgo(n.createdAt)}</span>
                                        {n.url && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    goToTask(n);
                                                }}
                                                className="inline-flex flex-none cursor-pointer items-center gap-0.5 whitespace-nowrap text-[11px] font-medium text-[var(--app-accent,_#2f68f5)] hover:underline"
                                            >
                                                Перейти к задаче
                                                <ChevronRight className="h-3 w-3"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
