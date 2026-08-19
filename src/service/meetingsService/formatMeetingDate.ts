/**
 * Даты приходят с сервера как DateOnly («2026-08-20»), а читают их в банке
 * в привычной записи. Форматирование вынесено отдельно: журнал, карточка и
 * поручения должны показывать дату одинаково.
 */
export function formatDate(value: string | null | undefined): string {
    if (!value) return "—";

    const [year, month, day] = value.split("T")[0].split("-");
    if (!year || !month || !day) return value;

    return `${day}.${month}.${year}`;
}

/** Время приходит как «10:00:00» — секунды в интерфейсе не нужны. */
export function formatTime(value: string | null | undefined): string {
    return value ? value.slice(0, 5) : "—";
}
