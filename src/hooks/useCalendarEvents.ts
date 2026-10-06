import {useCallback, useEffect, useState} from "react";
import {calendarService, type CalendarEvent} from "@/service/analyticsService/calendarService.ts";

/** Загрузка событий календаря: данные, признаки загрузки/ошибки и повторный запрос. */
export function useCalendarEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        calendarService.get()
            .then(e => {
                if (!cancelled) setEvents(e);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    // Состояние сбрасывается здесь, а не в эффекте: так не нужен синхронный setState внутри useEffect
    const reload = useCallback(() => {
        setLoading(true);
        setError(false);
        setReloadKey(k => k + 1);
    }, []);

    return {events, loading, error, reload};
}
