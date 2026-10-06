import type {CalendarEvent} from "@/service/analyticsService/calendarService.ts";
import {COLORS, LINKS, STATIC_LINKS} from "@/constants/calendarPageConst.ts";

/** Отображаемый месяц: m - индекс месяца (0-11). */
export interface CalendarView {
    y: number;
    m: number;
}

/** Сортировка событий: просроченные выше, внутри группы порядок сервера сохраняется. */
export function sortEvents(list: CalendarEvent[]): CalendarEvent[] {
    return [...list].sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue));
}

/** Уникальный React-ключ события. */
export function eventKey(e: CalendarEvent, j: number): string {
    return `${e.documentType}-${e.entityId ?? "x"}-${e.taskType}-${e.dueAt}-${j}`;
}

/** Пара цветов события: красная для просроченных, синяя для остальных. */
export const eventColors = (e: CalendarEvent) => (e.isOverdue ? COLORS.overdue : COLORS.upcoming);

/** Куда ведёт клик по событию. STATIC_LINKS - когда нет конкретной записи. */
export function eventLink(e: CalendarEvent): string {
    if (STATIC_LINKS[e.documentType]) return STATIC_LINKS[e.documentType];
    if (e.entityId === null) return "/tasks";
    return LINKS[e.documentType]?.(e.entityId) ?? "/tasks";
}

/** События по дням (ключ - "YYYY-MM-DD"), в каждом дне просроченные выше. */
export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
        const arr = map.get(e.date) ?? [];
        arr.push(e);
        map.set(e.date, arr);
    }
    for (const [k, arr] of map) map.set(k, sortEvents(arr));
    return map;
}

/** Текущий месяц. */
export function currentView(): CalendarView {
    const n = new Date();
    return {y: n.getFullYear(), m: n.getMonth()};
}

/** Сдвиг на delta месяцев с переходом через границу года. */
export function shiftMonth(v: CalendarView, delta: number): CalendarView {
    const m = v.m + delta;
    return {y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12};
}

/**
 * Даты сетки: 6 недель по 7 дней от понедельника недели, в которую попадает 1-е число.
 * Если последняя неделя целиком из соседнего месяца, она не включается (35 дат).
 */
export function buildMonthCells({y, m}: CalendarView): Date[] {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // 0 = понедельник
    const start = new Date(y, m, 1 - offset);
    const all = Array.from({length: 42}, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
    return all[35].getMonth() === m ? all : all.slice(0, 35);
}

/**
 * Годы для селекта: ±10 от текущего, расширяется, только если выбранный год вышел за границы,
 * чтобы значения в списке не «ехали» при каждой смене года.
 */
export function buildYearOptions(selectedYear: number): { value: string; label: string }[] {
    const cy = new Date().getFullYear();
    const from = Math.min(cy - 10, selectedYear);
    const to = Math.max(cy + 10, selectedYear);
    return Array.from({length: to - from + 1}, (_, i) => {
        const y = String(from + i);
        return {value: y, label: y};
    });
}
