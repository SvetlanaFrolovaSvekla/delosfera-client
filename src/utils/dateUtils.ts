import type {DateFilterValue} from "@/components/componentsGeneral/DateFilterGroup.tsx";

/**
 * Парсит строку "дд.мм.гггг" в timestamp (мс). Без валидации календарных
 * границ (в отличие от parseDDMMYYYY) — используется только для сравнения
 * дат внутри matchDateFilter, где скорость важнее строгости.
 * Возвращает null, если строку не удалось разобрать.
 */
function parseDMY(str: string): number | null {
    const [d, m, y] = str.split(".").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d).getTime();
}

/**
 * Проверяет, попадает ли дата строки (в формате "дд.мм.гггг") под фильтр —
 * либо точное совпадение (filter.mode === "exact"), либо попадание в диапазон
 * [from, to]. Пустой фильтр (без exact/from/to) пропускает любую дату.
 * Используется в таблицах для клиентской фильтрации строк по датам.
 */
export function matchDateFilter(rowDateStr: string, filter: DateFilterValue): boolean {
    if (filter.mode === "exact") {
        return !filter.exact.trim() || rowDateStr === filter.exact.trim();
    }

    // диапазон
    if (!filter.from.trim() && !filter.to.trim()) return true;
    const rowTime = parseDMY(rowDateStr);
    if (rowTime === null) return false;

    const fromTime = filter.from.trim() ? parseDMY(filter.from.trim()) : null;
    const toTime = filter.to.trim() ? parseDMY(filter.to.trim()) : null;

    return !((fromTime !== null && rowTime < fromTime) || (toTime !== null && rowTime > toTime));
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