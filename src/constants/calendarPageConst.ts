// Максимальное число видимых строк событий в календаре
import type {CalendarEvent} from "@/service/analyticsService/calendarService.ts";

export const MAX_VISIBLE = 3;

// Цвета просроченных/выполненных в срок задач/событий
export const COLORS = {
    overdue: {bg: "#fdecea", fg: "#c0392b"},
    upcoming: {bg: "#eef3ff", fg: "#2f68f5"},
} as const;

// Хелпер, который по событию возвращает нужную пару цветов
export const eventColors = (e: CalendarEvent) => (e.isOverdue ? COLORS.overdue : COLORS.upcoming);

// Куда вести клик по событию, когда у типа документа нет страницы конкретной записи
export const STATIC_LINKS: Record<string, string> = {
    Acknowledgement: "/hr-ack",
    Letter: "/correspondence",
    Obligation: "/obligations",
};

// Для типов, у которых есть страница отдельной записи
export const LINKS: Record<string, (id: number) => string> = {
    Sz: id => `/sz/${id}`,
    Procurement: id => `/prc/${id}`,
    Vnd: id => `/base-vnd/${id}`,
    Meeting: id => `/meetings/${id}`,
};