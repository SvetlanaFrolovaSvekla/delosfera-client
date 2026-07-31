import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import type {DateRangeFilter} from "@/service/vndService/vndServiceType.ts";

// Берем значение из UI (DatePicker/RangePicker), преобразуем в { exact, from, to } для фильтрации
export function toDateRangeFilter(v: DateFilterValue): DateRangeFilter | null {
    const exact = v.exact ? formatISO(v.exact) : null;
    const from = v.from ? formatISO(v.from) : null;
    const to = v.to ? formatISO(v.to) : null;
    if (!exact && !from && !to) return null;
    return {exact, from, to};
}

// Приводит любую переданную дату (Date или строку) к строгому текстовому формату ISO: YYYY-MM-DD
export function formatISO(d: Date | string) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().slice(0, 10);
}

// Сервер отдаёт даты в формате "YYYY-MM-DD", парсим в объект JS Data,
// Если строка пустая или некорректная, возвращает null
export function parseDate(str: string | null | undefined): Date | null {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
}

// Подсчёт количества дней, оставшихся до указанной даты (или прошедших, если дата в прошлом) (для расчёта актуализации и др.)
export function daysUntil(dateStr: string | null | undefined): number | null {
    const date = parseDate(dateStr);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Строго парсит строку вида "дд.мм.гггг" в Date, с проверкой, что дата
 * реально существует в календаре (напр. "31.02.2026" вернёт null, а не
 * "перетечёт" в март, как сделал бы обычный конструктор Date).
 * Возвращает null для пустой строки или некорректного формата/даты.
 */
export function parseDDMMYYYY(str: string): Date | null {
    if (!str) return null;
    const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    const [, d, m, y] = match;
    const day = Number(d), month = Number(m), year = Number(y);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
}

/**
 * Форматирует Date в строку "дд.мм.гггг" (с ведущими нулями у дня/месяца).
 * Пара к parseDDMMYYYY — используется там, где даты вводятся/показываются
 * пользователю в этом формате (напр. DatePickerInput).
 */
export function formatDDMMYYYY(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

/**
 * Сравнивает две даты по календарному дню (год/месяц/число), игнорируя время.
 * Используется, например, в date-picker'ах для подсветки выбранного/сегодняшнего дня.
 */
export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Форматирует дату/datetime с бэкенда в "дд.мм.гггг" для отображения.
 * Сервер отдаёт даты как "YYYY-MM-DD", а datetime — как ISO-строку
 * ("YYYY-MM-DDTHH:mm:ssZ") — .slice(0, 10) отбрасывает время в обоих случаях.
 * Возвращает "—" для null/undefined или некорректной строки.
 */
export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    if (!y || !m || !d) return "—";
    return `${d}.${m}.${y}`;
}

/**
 * Приблизительно определяет периодичность актуализации по разнице между
 * двумя датами (напр. lastActualizationDate → dueActualizationDate).
 * Бэкенд не хранит исходно выбранный период (Quarterly/Annual/...) отдельно,
 * поэтому здесь период восстанавливается по количеству месяцев между датами
 * с допуском ±10% (чтобы 365 и 370 дней одинаково читались как "раз в год").
 * Если разница не попадает ни в один из известных периодов — возвращает
 * приблизительное количество дней/месяцев. Возвращает "—", если даты нет
 * или интервал некорректен (to <= from).
 */
export function describePeriod(fromISO: string | null | undefined, toISO: string | null | undefined): string {
    if (!fromISO || !toISO) return "—";
    const from = new Date(fromISO);
    const to = new Date(toISO);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "—";

    const approxMonths = days / 30.44;
    const buckets = [
        {months: 3, label: "раз в квартал"},
        {months: 6, label: "раз в полгода"},
        {months: 12, label: "раз в год"},
        {months: 24, label: "раз в два года"},
        {months: 36, label: "раз в три года"},
    ];
    const closest = buckets.find((b) => Math.abs(approxMonths - b.months) <= b.months * 0.1);
    if (closest) return closest.label;

    return approxMonths < 1 ? `${days} дн.` : `≈ ${Math.round(approxMonths)} мес.`;
}

// Возвращает текущую дату и день недели
export function getFormattedDate(): string {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
    const formatted = formatter.format(date); // Например: "Четверг, 23 июля"
    return formatted.charAt(0).toLowerCase() + formatted.slice(1);
}