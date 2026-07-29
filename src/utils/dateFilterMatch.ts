import type {DateFilterValue} from "@/components/componentsGeneral/DateFilterGroup.tsx";

function parseDMY(str: string): number | null {
    const [d, m, y] = str.split(".").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d).getTime();
}

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

export function formatDDMMYYYY(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}