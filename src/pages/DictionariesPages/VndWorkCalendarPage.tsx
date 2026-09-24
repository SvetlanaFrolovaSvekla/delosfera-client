// Страница-справочник "Производственный календарь" (раздел ВНД).
// Рабочее время банка и праздники, по которым считаются сроки согласования редакций ВНД: срок
// идёт только пн–пт в рабочие часы банка (по умолчанию 09:00–18:00 по Бишкеку), без праздников.
// Главный редактор задаёт часы в карточке "Рабочее время банка" и отмечает праздники прямо на
// годовом календаре: клик по дню - окно с названием праздника. После сохранения сервер сам
// пересчитывает сроки текущих согласований (см. VndWorkCalendarService).
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {useNavigate} from "react-router-dom";
import {
    ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Copy, Info, Pencil, Plus, Trash2, X,
} from "lucide-react";

import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    vndWorkCalendarService,
    type WorkCalendarDay,
    type WorkHours,
} from "@/service/vndWorkCalendarService/vndWorkCalendarService.ts";
import {formatClock, invalidateWorkCalendar} from "@/utils/workCalendar.ts";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {parseDDMMYYYY} from "@/utils/dateUtils.ts";

const DATE_LOCALE_BY_LANG: Record<string, string> = {ru: "ru-RU", en: "en-US", ky: "ky-KG", kg: "ky-KG"};

// Оформление праздника - одно и то же в сетке, легенде, списке и статистике.
const HOLIDAY_STYLE = {
    cell: "bg-[#fdecec] text-[#d0443b] font-semibold hover:bg-[#fbdcdc]",
    badge: "bg-[#fdecec] text-[#c0392b]",
    dot: "bg-[#e0483d]",
};

/** "09:30" → 570 (минуты от полуночи); null, если строка не время. */
function parseClock(value: string): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!m) return null;
    const minutes = Number(m[1]) * 60 + Number(m[2]);
    return minutes >= 0 && minutes <= 24 * 60 ? minutes : null;
}

/** 510 → "8 ч 30 мин" (длина рабочего дня для подписи). */
function formatDuration(minutes: number, t: TFunction): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0
        ? `${t("time.hours", {count: h})} ${t("time.minutes", {count: m})}`
        : t("time.hours", {count: h});
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const weekdayOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).getUTCDay(); // 0 = вс
const isWeekend = (wd: number) => wd === 0 || wd === 6;

function todayInBishkek(): string {
    return new Date().toLocaleDateString("sv-SE", {timeZone: "Asia/Bishkek"}); // yyyy-MM-dd
}

interface Draft {
    id: number | null;
    date: string;
    title: string;
}

export function VndWorkCalendarPage() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageVndDictionaries);
    const locale = DATE_LOCALE_BY_LANG[i18n.language] ?? "ru-RU";

    const [year, setYear] = useState(() => Number(todayInBishkek().slice(0, 4)));
    const [days, setDays] = useState<WorkCalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // ---------- рабочее время банка

    const [hours, setHours] = useState<WorkHours | null>(null);
    const [hoursStart, setHoursStart] = useState("");
    const [hoursEnd, setHoursEnd] = useState("");
    const [hoursSaving, setHoursSaving] = useState(false);
    const [hoursError, setHoursError] = useState<string | null>(null);

    const applyHours = (h: WorkHours) => {
        setHours(h);
        setHoursStart(formatClock(h.workStartMinutes));
        setHoursEnd(formatClock(h.workEndMinutes));
    };

    // ISO (yyyy-MM-dd) → дд.мм.гггг
    const isoToDDMMYYYY = (iso: string) => {
        const [y, m, d] = iso.split("-");
        return `${d}.${m}.${y}`;
    };
    useEffect(() => {
        vndWorkCalendarService.getHours()
            .then(applyHours)
            .catch(() => applyHours({workStartMinutes: 9 * 60, workEndMinutes: 18 * 60}));
    }, []);

    const draftStart = parseClock(hoursStart);
    const draftEnd = parseClock(hoursEnd);
    const hoursValid = draftStart !== null && draftEnd !== null && draftEnd - draftStart >= 60;
    const hoursChanged = !!hours && (draftStart !== hours.workStartMinutes || draftEnd !== hours.workEndMinutes);

    const load = useCallback(() => {
        setLoading(true);
        setLoadError(false);
        vndWorkCalendarService.getYear(year)
            .then(setDays)
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    }, [year]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
        setNotice(null);
    }, [load]);

    const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

    // Статистика года: рабочие дни = будни минус праздники
    const stats = useMemo(() => {
        let working = 0;
        for (let m = 0; m < 12; m++) {
            const count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
            for (let d = 1; d <= count; d++) {
                if (!isWeekend(weekdayOf(year, m, d)) && !byDate.has(isoOf(year, m, d))) working++;
            }
        }
        return {working, holidays: days.length};
    }, [byDate, days, year]);

    const monthName = (m: number) =>
        new Date(Date.UTC(year, m, 1)).toLocaleDateString(locale, {month: "long", timeZone: "UTC"});
    const weekdayShort = (wd: number) =>
        // 2024-01-01 - понедельник: смещаем, чтобы получить нужный день недели
        new Date(Date.UTC(2024, 0, 1 + ((wd + 6) % 7))).toLocaleDateString(locale, {weekday: "short", timeZone: "UTC"});
    const formatDay = (iso: string) => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
            day: "numeric", month: "long", weekday: "short", timeZone: "UTC",
        });
    };

    // ---------- редактирование

    const openDay = (iso: string) => {
        if (!canManage) return;
        const existing = byDate.get(iso);
        setSaveError(null);
        setDraft(existing
            ? {id: existing.id, date: existing.date, title: existing.title}
            : {id: null, date: iso, title: ""});
    };

    const openNew = () => {
        const today = todayInBishkek();
        openDay(today.startsWith(String(year)) ? today : `${year}-01-01`);
    };

    const afterChange = (message?: string) => {
        invalidateWorkCalendar();
        load();
        if (message) setNotice(message);
    };

    const errorMessage = (e: unknown) =>
        (e as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? t("vndWorkCalendarPage.saveError");

    const save = async () => {
        if (!draft) return;
        setSaving(true);
        setSaveError(null);
        try {
            const body = {date: draft.date, title: draft.title.trim()};
            if (draft.id) await vndWorkCalendarService.update(draft.id, body);
            else await vndWorkCalendarService.create(body);
            // Если дату перенесли в другой год - покажем тот год
            const savedYear = Number(draft.date.slice(0, 4));
            setDraft(null);
            if (savedYear !== year) setYear(savedYear);
            afterChange(t("vndWorkCalendarPage.savedNotice"));
        } catch (e) {
            setSaveError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: number) => {
        setSaving(true);
        setSaveError(null);
        try {
            await vndWorkCalendarService.remove(id);
            setDraft(null);
            afterChange(t("vndWorkCalendarPage.deletedNotice"));
        } catch (e) {
            setSaveError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const copyPrevYear = async () => {
        setSaving(true);
        try {
            const res = await vndWorkCalendarService.copyYear(year - 1, year);
            afterChange(res.added > 0
                ? t("vndWorkCalendarPage.copiedNotice", {count: res.added, year: year - 1})
                : t("vndWorkCalendarPage.copiedNothing", {year: year - 1}));
        } catch (e) {
            setNotice(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const saveHours = async () => {
        if (!hoursValid || draftStart === null || draftEnd === null) return;
        setHoursSaving(true);
        setHoursError(null);
        try {
            applyHours(await vndWorkCalendarService.updateHours({
                workStartMinutes: draftStart,
                workEndMinutes: draftEnd,
            }));
            invalidateWorkCalendar();
            setNotice(t("vndWorkCalendarPage.hours.savedNotice"));
        } catch (e) {
            setHoursError(errorMessage(e));
        } finally {
            setHoursSaving(false);
        }
    };

    // ---------- отрисовка

    const today = todayInBishkek();
    const weekdayHeader = [1, 2, 3, 4, 5, 6, 0];

    const renderMonth = (m: number) => {
        const count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
        const lead = (weekdayOf(year, m, 1) + 6) % 7; // пустые клетки до понедельника
        const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({length: count}, (_, i) => i + 1)];

        return (
            <div key={m} className="rounded-xl border border-[#eef1f5] bg-white p-3">
                <div className="mb-2 text-[12.5px] font-bold capitalize text-[#1c2740]">{monthName(m)}</div>
                <div className="grid grid-cols-7 gap-[3px] text-center">
                    {weekdayHeader.map((wd) => (
                        <div key={wd} className={`pb-1 text-[9.5px] font-semibold uppercase ${isWeekend(wd) ? "text-[#c3c9d4]" : "text-[#a3adbd]"}`}>
                            {weekdayShort(wd).slice(0, 2)}
                        </div>
                    ))}
                    {cells.map((d, i) => {
                        if (d === null) return <div key={`e${i}`}/>;
                        const iso = isoOf(year, m, d);
                        const entry = byDate.get(iso);
                        const weekend = isWeekend(weekdayOf(year, m, d));
                        const base = entry
                            ? HOLIDAY_STYLE.cell
                            : weekend
                                ? "text-[#b5bdca] hover:bg-[#f2f4f8]"
                                : "text-[#3a4560] hover:bg-[#eef0fd]";
                        const ring = iso === today ? " ring-2 ring-[#4e57d6] ring-offset-1" : "";
                        return (
                            <button
                                key={iso}
                                type="button"
                                onClick={() => openDay(iso)}
                                disabled={!canManage}
                                title={entry?.title}
                                className={`h-[26px] rounded-[7px] border-none text-[11.5px] leading-none transition-colors ${base}${ring} ${canManage ? "cursor-pointer" : "cursor-default"}`}
                            >
                                {d}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const entriesByMonth = useMemo(() => {
        const groups = new Map<number, WorkCalendarDay[]>();
        for (const d of days) {
            const m = Number(d.date.slice(5, 7)) - 1;
            groups.set(m, [...(groups.get(m) ?? []), d]);
        }
        return [...groups.entries()].sort((a, b) => a[0] - b[0]);
    }, [days]);

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/management/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateVnd")}
            </button>

            <div className="flex items-center gap-2.5 mb-1 mt-2">
                <span className="w-8 h-8 rounded-[9px] grid place-items-center flex-none bg-[#eef0fd] text-[#4e57d6]">
                    <CalendarDays className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                </span>
                <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                    {t("vndWorkCalendarPage.title")}
                </h1>
            </div>
            <p className="mt-[10px] mb-4 max-w-[900px] text-[13px] text-[#8b97ab] leading-[1.5]">
                {t("vndWorkCalendarPage.subtitle")}
            </p>

            {/* Рабочее время банка */}
            <div className="mb-4 rounded-2xl border border-[#e9edf3] bg-white p-4 shadow-[0_3px_12px_-8px_rgba(15,27,45,0.14)]">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="flex min-w-[220px] items-center gap-2.5">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#eef0fd] text-[#4e57d6]">
                            <Clock className="h-[17px] w-[17px]" strokeWidth={1.9}/>
                        </span>
                        <div>
                            <div className="text-[13.5px] font-bold text-[#1c2740]">{t("vndWorkCalendarPage.hours.title")}</div>
                            <div className="text-[11.5px] text-[#8b97ab]">{t("vndWorkCalendarPage.hours.weekdays")}</div>
                        </div>
                    </div>

                    {hours ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="time"
                                step={300}
                                value={hoursStart}
                                disabled={!canManage || hoursSaving}
                                onChange={(e) => setHoursStart(e.target.value)}
                                aria-label={t("vndWorkCalendarPage.hours.start")}
                                className="h-9 w-[104px] rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] font-semibold text-[#26324a] outline-none focus:border-[#4e57d6] disabled:bg-[#fafbfc] disabled:text-[#55617a]"
                            />
                            <span className="text-[#a3adbd]">—</span>
                            <input
                                type="time"
                                step={300}
                                value={hoursEnd}
                                disabled={!canManage || hoursSaving}
                                onChange={(e) => setHoursEnd(e.target.value)}
                                aria-label={t("vndWorkCalendarPage.hours.end")}
                                className="h-9 w-[104px] rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] font-semibold text-[#26324a] outline-none focus:border-[#4e57d6] disabled:bg-[#fafbfc] disabled:text-[#55617a]"
                            />
                            <span className={`ml-1 rounded-full px-3 py-1 text-[12px] font-semibold ${
                                hoursValid ? "bg-[#eef0fd] text-[#4e57d6]" : "bg-[#fdecec] text-[#c0392b]"
                            }`}>
                                {hoursValid && draftStart !== null && draftEnd !== null
                                    ? t("vndWorkCalendarPage.hours.dayLength", {duration: formatDuration(draftEnd - draftStart, t)})
                                    : t("vndWorkCalendarPage.hours.invalid")}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[12px] text-[#a3adbd]">{t("general.loading")}</span>
                    )}

                    {canManage && hoursChanged && (
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => hours && applyHours(hours)}
                                disabled={hoursSaving}
                                className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-60"
                            >
                                {t("general.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={saveHours}
                                disabled={hoursSaving || !hoursValid}
                                className="h-9 cursor-pointer rounded-[9px] border-none bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {hoursSaving ? t("general.saving") : t("general.save")}
                            </button>
                        </div>
                    )}
                </div>

                {canManage && hoursChanged && hoursValid && (
                    <div className="mt-3 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                        {t("vndWorkCalendarPage.hours.changeHint")}
                    </div>
                )}
                {hoursError && (
                    <div className="mt-3 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                        {hoursError}
                    </div>
                )}
            </div>

            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#e3e7fb] bg-[#f7f8ff] px-4 py-3 text-[12.5px] leading-[1.55] text-[#55617a]">
                <Info className="mt-[2px] h-4 w-4 flex-none text-[#4e57d6]" strokeWidth={1.9}/>
                <span>{t("vndWorkCalendarPage.rulesHint")}</span>
            </div>

            {/* Панель: год, статистика, действия */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-[10px] border border-[#e5e9f0] bg-white">
                    <button type="button" onClick={() => setYear((y) => y - 1)}
                            className="grid h-9 w-9 cursor-pointer place-items-center border-none bg-transparent text-[#55617a] hover:text-[#4e57d6]"
                            aria-label={t("vndWorkCalendarPage.prevYear")}>
                        <ChevronLeft className="h-4 w-4"/>
                    </button>
                    <span className="min-w-[56px] text-center text-[14px] font-bold text-[#1c2740]">{year}</span>
                    <button type="button" onClick={() => setYear((y) => y + 1)}
                            className="grid h-9 w-9 cursor-pointer place-items-center border-none bg-transparent text-[#55617a] hover:text-[#4e57d6]"
                            aria-label={t("vndWorkCalendarPage.nextYear")}>
                        <ChevronRight className="h-4 w-4"/>
                    </button>
                </div>

                {!loading && !loadError && (
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="rounded-full bg-[#eef0fd] px-3 py-1 font-semibold text-[#4e57d6]">
                            {t("vndWorkCalendarPage.stats.working", {count: stats.working})}
                        </span>
                        <span className={`rounded-full px-3 py-1 font-semibold ${HOLIDAY_STYLE.badge}`}>
                            {t("vndWorkCalendarPage.stats.holidays", {count: stats.holidays})}
                        </span>
                    </div>
                )}

                {canManage && (
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={copyPrevYear}
                            disabled={saving || loading}
                            title={t("vndWorkCalendarPage.copyHint")}
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#55617a] hover:border-[#4e57d6] hover:text-[#4e57d6] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Copy className="h-[14px] w-[14px]"/>
                            {t("vndWorkCalendarPage.copyFrom", {year: year - 1})}
                        </button>
                        <button
                            type="button"
                            onClick={openNew}
                            disabled={saving}
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border-none bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60"
                        >
                            <Plus className="h-[14px] w-[14px]"/>
                            {t("vndWorkCalendarPage.addDay")}
                        </button>
                    </div>
                )}
            </div>

            {notice && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-[10px] border border-[#cfe9d8] bg-[#f1faf4] px-3.5 py-2 text-[12.5px] text-[#1f8a4c]">
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice(null)}
                            className="grid h-6 w-6 cursor-pointer place-items-center border-none bg-transparent text-[#1f8a4c]/70 hover:text-[#1f8a4c]">
                        <X className="h-3.5 w-3.5"/>
                    </button>
                </div>
            )}

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && loadError && (
                <EmptyState
                    variant="error"
                    title={t("dictionaries.loadError")}
                    actionLabel={t("vndApprovalNormSettingsPage.retry")}
                    onAction={load}
                />
            )}

            {!loading && !loadError && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    {/* Годовой календарь */}
                    <div className="rounded-2xl border border-[#e9edf3] bg-[#fafbfc] p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-[#6b7488]">
                            <span className="inline-flex items-center gap-1.5">
                                <span className={`h-2.5 w-2.5 rounded-full ${HOLIDAY_STYLE.dot}`}/>
                                {t("vndWorkCalendarPage.holiday")}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#d5dae3]"/>
                                {t("vndWorkCalendarPage.weekend")}
                            </span>
                            {canManage && (
                                <span className="ml-auto text-[#a3adbd]">{t("vndWorkCalendarPage.clickHint")}</span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {Array.from({length: 12}, (_, m) => renderMonth(m))}
                        </div>
                    </div>

                    {/* Список исключений года */}
                    <div className="self-start rounded-2xl border border-[#e9edf3] bg-white p-4">
                        <div className="mb-3 text-[13px] font-bold text-[#1c2740]">
                            {t("vndWorkCalendarPage.listTitle", {year})}
                        </div>
                        {days.length === 0 ? (
                            <div className="rounded-xl bg-[#fafbfc] px-4 py-6 text-center text-[12.5px] leading-[1.5] text-[#8b97ab]">
                                {t("vndWorkCalendarPage.empty")}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {entriesByMonth.map(([m, list]) => (
                                    <div key={m}>
                                        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[.05em] text-[#a3adbd]">
                                            {monthName(m)}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {list.map((d) => (
                                                <div key={d.id}
                                                     className="group flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-[#f6f8fb]">
                                                    <span className={`h-2 w-2 flex-none rounded-full ${HOLIDAY_STYLE.dot}`}/>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-[12.5px] font-semibold text-[#26324a]">{d.title}</div>
                                                        <div className="text-[11px] text-[#8b97ab]">
                                                            {formatDay(d.date)}
                                                        </div>
                                                    </div>
                                                    {canManage && (
                                                        <div className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <button type="button" onClick={() => openDay(d.date)}
                                                                    title={t("vndWorkCalendarPage.edit")}
                                                                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border-none bg-transparent text-[#8b97ab] hover:bg-white hover:text-[#4e57d6]">
                                                                <Pencil className="h-3.5 w-3.5"/>
                                                            </button>
                                                            <button type="button" onClick={() => remove(d.id)}
                                                                    disabled={saving}
                                                                    title={t("general.delete")}
                                                                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border-none bg-transparent text-[#8b97ab] hover:bg-white hover:text-[#e0483d]">
                                                                <Trash2 className="h-3.5 w-3.5"/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Окно: добавить / изменить день */}
            {draft && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f1b2d]/40 p-4"
                     onMouseDown={(e) => {
                         if (e.target === e.currentTarget && !saving) setDraft(null);
                     }}>
                    <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_24px_60px_-20px_rgba(15,27,45,0.45)]">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">
                                {draft.id ? t("vndWorkCalendarPage.editTitle") : t("vndWorkCalendarPage.addTitle")}
                            </h2>
                            <button type="button" onClick={() => setDraft(null)} disabled={saving}
                                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-[#8b97ab] hover:bg-[#f2f4f8]">
                                <X className="h-4 w-4"/>
                            </button>
                        </div>

                        <label className="mb-1.5 block text-[12px] font-semibold text-[#55617a]">
                            {t("vndWorkCalendarPage.fields.date")}
                        </label>
                        <DatePickerInput
                            value={isoToDDMMYYYY(draft.date)}
                            onChange={(value) => {
                                const parsed = parseDDMMYYYY(value);
                                if (parsed) {
                                    const iso = isoOf(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
                                    setDraft({...draft, date: iso});
                                }
                            }}
                            className="mb-1 w-full"
                        />
                        <div className="mb-4 text-[11.5px] capitalize text-[#8b97ab]">{formatDay(draft.date)}</div>

                        <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-[#fdf4f3] px-3 py-2 text-[11.5px] leading-[1.45] text-[#a8463d]">
                            <span className={`mt-[5px] h-2 w-2 flex-none rounded-full ${HOLIDAY_STYLE.dot}`}/>
                            {t("vndWorkCalendarPage.holidayHint")}
                        </div>

                        <label className="mb-1.5 block text-[12px] font-semibold text-[#55617a]">
                            {t("vndWorkCalendarPage.fields.title")}
                        </label>
                        <input
                            type="text"
                            value={draft.title}
                            maxLength={200}
                            autoFocus
                            placeholder={t("vndWorkCalendarPage.titlePlaceholder")}
                            onChange={(e) => setDraft({...draft, title: e.target.value})}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !saving) void save();
                            }}
                            className="mb-4 h-10 w-full rounded-[10px] border border-[#e5e9f0] px-3 text-[13px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                        />

                        {saveError && (
                            <div className="mb-4 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                                {saveError}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {draft.id && (
                                <button type="button" onClick={() => remove(draft.id!)} disabled={saving}
                                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#f2c2c2] bg-white px-3.5 text-[12.5px] font-semibold text-[#c0392b] hover:bg-[#fdf1f1] disabled:opacity-60">
                                    <Trash2 className="h-[14px] w-[14px]"/>
                                    {t("general.delete")}
                                </button>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                                <button type="button" onClick={() => setDraft(null)} disabled={saving}
                                        className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-60">
                                    {t("general.cancel")}
                                </button>
                                <button type="button" onClick={save} disabled={saving}
                                        className="h-9 cursor-pointer rounded-[9px] border-none bg-[#4e57d6] px-4 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60">
                                    {saving ? t("general.saving") : t("general.save")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
