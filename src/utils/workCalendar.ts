// Рабочее время для сроков согласования редакций ВНД — зеркало VndWorkingCalendar на бэкенде:
// пн–пт в рабочие часы банка (по умолчанию 09:00–18:00 по Бишкеку, UTC+6, без перехода на летнее
// время) без праздников. И часы, и праздники задаёт справочник "Производственный календарь".
//
// Сами сроки (deadlineAt) считает сервер — здесь только то, что меняется каждую минуту на экране:
// "осталось N рабочих часов", "прошло", срочность и предпросмотр срока в модалке запуска.
// Правила грузятся ОДИН раз на окно в три года и кэшируются на уровне модуля (10 минут), расчёт
// идёт по дням (а не по минутам) — на отрисовку списка задач это не влияет.
import {useEffect, useSyncExternalStore} from "react";
import {
    vndWorkCalendarService,
    type WorkCalendarRules,
} from "@/service/vndWorkCalendarService/vndWorkCalendarService.ts";

/** Рабочее время банка по умолчанию (до загрузки справочника): 09:00–18:00, минуты от полуночи. */
export const DEFAULT_WORK_START_MINUTES = 9 * 60;
export const DEFAULT_WORK_END_MINUTES = 18 * 60;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const CACHE_TTL = 10 * 60_000;
const MAX_DAYS_SCANNED = 2000;

interface State {
    offsetMinutes: number;
    /** Начало/конец рабочего дня банка, минуты от полуночи по Бишкеку. */
    startMinutes: number;
    endMinutes: number;
    /** Праздники "yyyy-MM-dd". */
    holidays: Set<string>;
    loadedAt: number;
    loaded: boolean;
}

// До загрузки справочника считаем по обычному графику (пн–пт) — это верно для подавляющего
// большинства дней, а через долю секунды подтянутся праздники.
let state: State = {
    offsetMinutes: 6 * 60,
    startMinutes: DEFAULT_WORK_START_MINUTES,
    endMinutes: DEFAULT_WORK_END_MINUTES,
    holidays: new Set(),
    loadedAt: 0,
    loaded: false,
};

let version = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
    version++;
    listeners.forEach((l) => l());
}

function applyRules(r: WorkCalendarRules) {
    state = {
        offsetMinutes: r.utcOffsetMinutes,
        startMinutes: r.workStartMinutes,
        endMinutes: r.workEndMinutes,
        holidays: new Set(r.holidays),
        loadedAt: Date.now(),
        loaded: true,
    };
    emit();
}

/** Загрузить (или обновить устаревший) календарь. Повторные вызовы не дублируют запрос. */
export function ensureWorkCalendarLoaded(): Promise<void> {
    if (state.loaded && Date.now() - state.loadedAt < CACHE_TTL) return Promise.resolve();
    if (inflight) return inflight;

    const year = new Date().getFullYear();
    inflight = vndWorkCalendarService
        .getRules(`${year - 1}-01-01`, `${year + 1}-12-31`)
        .then(applyRules)
        .catch(() => {
            // Не критично: остаёмся на обычном графике пн–пт, повторим при следующем обращении.
        })
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

/** Сбросить кэш после правки справочника — следующая отрисовка перезагрузит правила. */
export function invalidateWorkCalendar() {
    state = {...state, loadedAt: 0};
    void ensureWorkCalendarLoaded();
}

/** Подписка компонента на календарь: перерисует его, когда подтянутся праздники. */
export function useWorkCalendar(enabled = true): number {
    useEffect(() => {
        if (enabled) void ensureWorkCalendarLoaded();
    }, [enabled]);

    return useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => version,
    );
}

/** "1 д." в нормативах согласования = 1 рабочий день банка (по умолчанию 9 ч = 540 мин). */
export function getWorkDayMinutes(): number {
    return state.endMinutes - state.startMinutes;
}

/** Рабочие часы банка, минуты от полуночи по Бишкеку. */
export function getWorkHours(): { start: number; end: number } {
    return {start: state.startMinutes, end: state.endMinutes};
}

/** 540 → "09:00". */
export function formatClock(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "9" / "8,5" — длина рабочего дня в часах (для подсказок "1 д. = 9 ч"). */
export function formatWorkDayHours(): string {
    const hours = getWorkDayMinutes() / 60;
    return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, "").replace(".", ",");
}

/** "09:00–18:00" — текущие рабочие часы банка (для подсказок). */
export function formatWorkHours(): string {
    return `${formatClock(state.startMinutes)}–${formatClock(state.endMinutes)}`;
}

// ------------------------------------------------------------------
// Время банка: "локальные" миллисекунды = UTC + смещение; даты/часы читаем UTC-геттерами.

const toLocal = (utcMs: number) => utcMs + state.offsetMinutes * MINUTE;
const toUtc = (localMs: number) => localMs - state.offsetMinutes * MINUTE;
const startOfDay = (localMs: number) => Math.floor(localMs / DAY) * DAY;

function dayKey(localDayStart: number): string {
    const d = new Date(localDayStart);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/** Рабочее окно дня [start, end) в "локальных" мс или null, если день нерабочий. */
function windowOf(localDayStart: number): [number, number] | null {
    const weekday = new Date(localDayStart).getUTCDay();
    if (weekday === 0 || weekday === 6) return null;
    if (state.holidays.has(dayKey(localDayStart))) return null;
    return [localDayStart + state.startMinutes * MINUTE, localDayStart + state.endMinutes * MINUTE];
}

/** Нерабочий ли календарный день ("yyyy-MM-dd") — для раскраски календаря. */
export function isDayOff(isoDate: string): boolean {
    const [y, m, d] = isoDate.split("-").map(Number);
    return windowOf(Date.UTC(y, m - 1, d)) === null;
}

/** Момент (UTC, мс) + рабочие минуты → момент (UTC, мс). */
export function addWorkingMinutes(fromUtcMs: number, minutes: number): number {
    if (minutes <= 0) return fromUtcMs;

    let local = toLocal(fromUtcMs);
    let remaining = minutes * MINUTE;

    for (let i = 0; i < MAX_DAYS_SCANNED; i++) {
        const dayStart = startOfDay(local);
        const w = windowOf(dayStart);
        if (w && local < w[1]) {
            const cursor = Math.max(local, w[0]);
            const available = w[1] - cursor;
            if (remaining <= available) return toUtc(cursor + remaining);
            remaining -= available;
        }
        local = dayStart + DAY;
    }
    return fromUtcMs + minutes * MINUTE;
}

/** Рабочие минуты между моментами (UTC, мс). Отрицательно, если to раньше from. */
export function workingMinutesBetween(fromUtcMs: number, toUtcMs: number): number {
    if (toUtcMs === fromUtcMs) return 0;
    if (toUtcMs < fromUtcMs) return -workingMinutesBetween(toUtcMs, fromUtcMs);

    const from = toLocal(fromUtcMs);
    const to = toLocal(toUtcMs);
    let total = 0;

    for (let day = startOfDay(from), i = 0; day <= to && i < MAX_DAYS_SCANNED * 5; day += DAY, i++) {
        const w = windowOf(day);
        if (!w) continue;
        const start = Math.max(w[0], from);
        const end = Math.min(w[1], to);
        if (end > start) total += end - start;
    }
    return Math.floor(total / MINUTE);
}

/** Идёт ли сейчас рабочее время (для подписи "срок сейчас не идёт — нерабочее время"). */
export function isWorkingNow(nowUtcMs = Date.now()): boolean {
    const local = toLocal(nowUtcMs);
    const w = windowOf(startOfDay(local));
    return !!w && local >= w[0] && local < w[1];
}

/** "пт, 03.10 в 15:00" — момент по времени банка (для предпросмотра сроков). */
export function formatBankDateTime(utcMs: number): string {
    const d = new Date(utcMs);
    const date = d.toLocaleDateString("ru-RU", {
        timeZone: "Asia/Bishkek", weekday: "short", day: "2-digit", month: "2-digit",
    });
    const time = d.toLocaleTimeString("ru-RU", {timeZone: "Asia/Bishkek", hour: "2-digit", minute: "2-digit"});
    return `${date} ${time}`;
}
