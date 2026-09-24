import {useEffect, useRef, useState, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate, Link} from "react-router-dom";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import type {Notification} from "@/service/notificationsService/notificationsServiceType.ts";
import {toast} from "@/service/toastService.ts";
import {notificationPopupPreference} from "@/service/notificationPopupPreference.ts";
import {notificationsRefreshBus} from "@/service/notificationsRefreshBus.ts";
import {PREVIEW_COUNT, SEVERITY_DOT, SEVERITY_TOAST_VARIANT} from "@/constants/notificationConst.ts";
import {formatRelativeTime} from "@/utils/dateUtils.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Icon} from "@/assets/icons/Icon";

// Как часто спрашиваем сервер о новых уведомлениях, чтобы обновить счётчик,
// тряхнуть колокольчик и показать тост Опрос дополнительно приостанавливается,
// пока вкладка свёрнута/неактивна - не тратим запросы впустую, пока на неё никто не смотрит.
const POLL_INTERVAL_MS = 45_000;

export function NotificationsDropdown() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [shakeToken, setShakeToken] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);

    const lastSeenIdRef = useRef<number | null>(null);
    // Не даёт двум опросам выполняться параллельно (в т.ч. тому самому двойному
    // вызову эффекта в StrictMode/dev) - второй, пока первый не закончился, просто
    // ничего не делает вместо того, чтобы гоняться с ним за lastSeenIdRef.
    const isPollingRef = useRef(false);

    const pollForNew = useCallback(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;

        try {
            const [counts, recent] = await Promise.all([
                notificationsService.getCounts(),
                notificationsService.search({page: 1, pageSize: 10}),
            ]);
            setUnreadCount(counts.totalUnread);

            const maxId = recent.items.reduce((max, n) => Math.max(max, n.id), 0);

            if (lastSeenIdRef.current === null) {
                // Первый опрос после захода/обновления страницы - просто запоминаем
                // текущий максимум, чтобы не тостить по уже существующим уведомлениям.
                lastSeenIdRef.current = maxId;
                return;
            }

            const freshItems = recent.items.filter(
                (n) => !n.isRead && n.id > lastSeenIdRef.current!
            );
            if (maxId > lastSeenIdRef.current) lastSeenIdRef.current = maxId;

            if (freshItems.length === 0) return;

            setShakeToken((v) => v + 1);
            // Панели на главной (Последняя активность/Последние уведомления/Мои задачи)
            // сами решают, стоит ли им перезапросить данные - независимо от настройки
            // тостов: это не всплывающее окно, а просто "не устаревай молча".
            notificationsRefreshBus.notify();

            if (!notificationPopupPreference.isEnabled()) return;

            // Порядок появления тостов - от старого к новому, чтобы самое свежее
            // уведомление оказалось сверху стопки (ToastContainer рендерит в flex-col-reverse).
            [...freshItems].reverse().forEach((n) => {
                const variant = SEVERITY_TOAST_VARIANT[n.severity];
                toast[variant](n.title, n.body, undefined, () => navigate(`/notifications/${n.id}`));
            });
        } catch {
            // сеть моргнула - подождём следующего опроса, счётчик не критичен
        } finally {
            isPollingRef.current = false;
        }
    }, [navigate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void pollForNew();

        const intervalId = window.setInterval(() => {
            if (document.hidden) return;
            void pollForNew();
        }, POLL_INTERVAL_MS);

        const handleVisibility = () => {
            if (!document.hidden) void pollForNew();
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [pollForNew]);

    const loadPreview = useCallback(() => {
        setLoading(true);
        notificationsService
            .search({page: 1, pageSize: PREVIEW_COUNT})
            .then((res) => setItems(res.items))
            .catch(() => {
                // не удалось загрузить превью - показываем пустой список вместо ошибки
                setItems([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadPreview();
        // i18n.language - перезагрузить превью при смене языка интерфейса, пока список открыт,
        // иначе заголовки/текст остаются на прежнем языке (см. тот же комментарий в
        // useNotificationRows.ts).
    }, [open, loadPreview, i18n.language]);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleRowClick = async (n: Notification) => {
        setOpen(false);

        if (!n.isRead) {
            try {
                await notificationsService.markAsRead(n.id);
                setItems((prev) =>
                    prev.map((it) => (it.id === n.id ? {...it, isRead: true} : it))
                );
                setUnreadCount((c) => Math.max(0, c - 1));
            } catch {
                // счётчик и список подтянутся заново при следующем открытии
            }
        }

        navigate(`/notifications/${n.id}`);
    };

    return (
        <div className="relative" ref={rootRef}>
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="cursor-pointer relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                >
                    {/* Анимация - на обёртке-span, а не на самом svg: у transform-origin
                        на корневом SVG-элементе браузеры по-разному трактуют систему
                        координат, из-за чего точка вращения может уехать мимо иконки
                        и "тряска" будет почти незаметна. На обычном HTML-элементе
                        такой неоднозначности нет. */}
                    <span
                        key={shakeToken}
                        className={`inline-flex ${shakeToken > 0 ? "bell-shake" : ""}`}
                    >
                        <Icon name="bell" width={19} height={19}/>
                    </span>
                    {unreadCount > 0 && (
                        <span
                            className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#e0483d]"/>
                    )}
                </button>

            {open && (
                <div
                    className="absolute right-0 top-[46px] z-40 w-[340px] overflow-hidden rounded-[13px] border border-[#e5e9f0] bg-white shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)]">
                    <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-[13px]">
                        <span className="text-[13.5px] font-semibold">{t("header.notif")}</span>
                        <Link
                            to="/notifications"
                            onClick={() => setOpen(false)}
                            className="text-[11px] font-semibold text-[var(--app-accent,_#4e57d6)] hover:underline"
                        >
                            {t("header.allNotifs")} &gt;&gt;
                        </Link>
                    </div>

                    <div className="max-h-[340px] overflow-y-auto">
                        {loading ? (
                            <Loader label="Загрузка уведомлений…" />
                        ) : items.length === 0 ? (
                            <EmptyState variant="empty" title={t("notifications.emptyState.title")}/>
                        ) : (
                            items.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleRowClick(n)}
                                    className={`flex cursor-pointer gap-[11px] border-b border-[#f3f6f9] px-4 py-[11px] hover:bg-[#f8fafc] ${
                                        !n.isRead ? "bg-[#f8faff]" : ""
                                    }`}
                                >
                                    <span
                                        className="mt-[5px] h-2 w-2 flex-none rounded-full"
                                        style={{background: SEVERITY_DOT[n.severity]}}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div
                                            className={`truncate text-[12.5px] leading-[1.45] text-[#26324a] ${
                                                !n.isRead ? "font-semibold" : ""
                                            }`}
                                        >
                                            {n.title}
                                        </div>
                                        <div className="mt-[2px] truncate text-[11.5px] leading-[1.4] text-[#5c6a83]">
                                            {n.body}
                                        </div>
                                        <div className="mt-[3px] text-[11px] text-[#8b97ab]">
                                            {formatRelativeTime(n.createdAt, t)}
                                        </div>
                                    </div>
                                    {!n.isRead && (
                                        <span
                                            className="mt-[6px] h-[7px] w-[7px] flex-none rounded-full bg-[var(--app-accent,_#4e57d6)]"/>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
