import {useEffect, useRef} from "react";
import {useLocation} from "react-router-dom";
import {usageService, type VisitRecord} from "@/service/usageService/usageService.ts";

/**
 * Записывает переходы по экранам.
 *
 * Копит их в памяти вкладки и отправляет пачкой. Обращение на каждый клик по меню
 * стоило бы дороже, чем всё, что мы выиграли, ускоряя загрузку: пятьсот человек,
 * листающих разделы, — это поток запросов, ничего не добавляющих к работе.
 *
 * Ошибки отправки глотаются намеренно. Учёт посещаемости — вспомогательная вещь;
 * сообщение о том, что не удалось записать переход, ничем не поможет человеку и
 * только испугает его посреди работы.
 */

/** Как часто сбрасываем накопленное. Полминуты — компромисс между свежестью и числом запросов. */
const FLUSH_INTERVAL_MS = 30_000;

/** Сколько переходов копим, прежде чем отправить не дожидаясь срока. Столько же берёт сервер за раз. */
const MAX_BUFFER = 50;

/** Метка вкладки: живёт до её закрытия, ни с чем не связана — только чтобы отличать сеансы. */
function sessionKey(): string {
    const KEY = "delosfera-usage-session";
    let value = sessionStorage.getItem(KEY);

    if (!value) {
        value = crypto.randomUUID();
        sessionStorage.setItem(KEY, value);
    }

    return value;
}

export function useUsageTracking(enabled: boolean) {
    const location = useLocation();

    const buffer = useRef<VisitRecord[]>([]);
    const openedAt = useRef<number>(Date.now());
    const currentPath = useRef<string | null>(null);
    const currentTitle = useRef<string | null>(null);

    // Отправка живёт в ref, чтобы обработчики закрытия вкладки не пересоздавались
    // на каждом переходе — иначе слушатели копились бы вместе с историей навигации.
    const flush = useRef<(closing?: boolean) => void>(() => {
    });

    flush.current = (closing = false) => {
        if (buffer.current.length === 0) return;

        const batch = buffer.current;
        buffer.current = [];

        usageService.track(sessionKey(), batch, closing).catch(() => {
            // Молча: посещаемость не стоит того, чтобы мешать работе.
        });
    };

    // Закрываем предыдущий экран и открываем новый при каждом переходе.
    useEffect(() => {
        if (!enabled) return;

        const now = Date.now();

        if (currentPath.current !== null) {
            buffer.current.push({
                path: currentPath.current,
                title: currentTitle.current ?? undefined,
                at: new Date(openedAt.current).toISOString(),
                durationMs: now - openedAt.current,
            });
        }

        currentPath.current = location.pathname;
        currentTitle.current = document.title;
        openedAt.current = now;

        if (buffer.current.length >= MAX_BUFFER) flush.current();
    }, [enabled, location.pathname]);

    // Периодический сброс и отправка при уходе со страницы.
    useEffect(() => {
        if (!enabled) return;

        const timer = window.setInterval(() => flush.current(), FLUSH_INTERVAL_MS);

        // visibilitychange, а не beforeunload: на телефоне и при переключении вкладок
        // beforeunload часто не срабатывает вовсе, и последний экран теряется.
        const onHidden = () => {
            if (document.visibilityState !== "hidden") return;

            if (currentPath.current !== null) {
                buffer.current.push({
                    path: currentPath.current,
                    title: currentTitle.current ?? undefined,
                    at: new Date(openedAt.current).toISOString(),
                    durationMs: Date.now() - openedAt.current,
                });
                // Экран не закрыт — человек может вернуться. Отсчёт начинаем заново,
                // чтобы время в свёрнутой вкладке не засчиталось как работа.
                openedAt.current = Date.now();
            }

            flush.current(true);
        };

        document.addEventListener("visibilitychange", onHidden);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onHidden);
            flush.current(true);
        };
    }, [enabled]);
}
