import type {CalendarEvent} from "@/service/analyticsService/calendarService.ts";

/** Сортировка событий: просроченные выше, внутри группы порядок сервера сохраняется. */
export function sortEvents(list: CalendarEvent[]): CalendarEvent[] {
    return [...list].sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue));
}

// Собирает ключ для типа события
export function eventKey(e: CalendarEvent, j: number): string {
    return `${e.documentType}-${e.entityId ?? "x"}-${e.taskType}-${e.dueAt}-${j}`;
}

