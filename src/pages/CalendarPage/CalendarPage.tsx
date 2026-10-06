/**
 * Календарь сроков (ЗС-13): датированные задачи по всем контурам на сетке месяца.
 * Реестр отвечает «что есть», календарь — «когда что»: видно загрузку и заторы во
 * времени. Данные те же, что в «Мои задачи», разложенные по дням.
 */
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {calendarService, type CalendarEvent} from "@/service/analyticsService/calendarService.ts";
import {COLORS, MAX_VISIBLE} from "@/constants/calendarPageConst.ts";
import {eventKey, sortEvents} from "@/utils/calendar/calendarUtils.ts";
import {asStringArray, capitalize} from "@/utils/stringUtils.ts";
import {keyOf} from "@/utils/dateUtils.ts";
import {useTodayKey} from "@/hooks/useTodayKey.ts";
import {EventChip} from "@/components/componentsCalendar/EventChip.tsx";
import {NavButton} from "@/components/componentsCalendar/NavButton.tsx";
import {DayEventsModal} from "@/components/componentsCalendar/DayEventsModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {AlertCircle, ChevronLeft, ChevronRight} from "lucide-react";

export function CalendarPage() {
    const {t, i18n} = useTranslation();
    const [modalDay, setModalDay] = useState<Date | null>(null);
    const closeModal = useCallback(() => setModalDay(null), []);

    const weekdays = asStringArray(t("calendar.weekdays", {returnObjects: true}));
    const translatedMonths = asStringArray(t("calendar.months", {returnObjects: true}));

    const monthOptions = useMemo(() => {
        const names = translatedMonths.length === 12
            ? translatedMonths
            : Array.from({length: 12}, (_, i) =>
                new Intl.DateTimeFormat(i18n.language, {month: "long"}).format(new Date(2000, i, 1)));
        return names.map((m, i) => ({value: String(i), label: capitalize(m)}));
        // eslint-disable-next-line react-hooks/exhaustive-deps,react-hooks/use-memo
    }, [translatedMonths.join("|"), i18n.language]);

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [view, setView] = useState(() => {
        const n = new Date();
        return {y: n.getFullYear(), m: n.getMonth()};
    });

    // Диапазон фиксирован вокруг текущего года и расширяется, только если view.y вышел за границы,
    // чтобы значения в списке не «ехали» при каждой смене года.
    const yearOptions = useMemo(() => {
        const cy = new Date().getFullYear();
        const from = Math.min(cy - 10, view.y);
        const to = Math.max(cy + 10, view.y);
        return Array.from({length: to - from + 1}, (_, i) => {
            const y = from + i;
            return {value: String(y), label: String(y)};
        });
    }, [view.y]);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(false);
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

    const byDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const e of events) {
            const arr = map.get(e.date) ?? [];
            arr.push(e);
            map.set(e.date, arr);
        }
        for (const [k, arr] of map) map.set(k, sortEvents(arr));
        return map;
    }, [events]);

    // До 6 недель по 7 дней от понедельника недели, в которую попадает 1-е число.
    // Последняя неделя целиком из соседнего месяца не рисуется.
    const cells = useMemo(() => {
        const first = new Date(view.y, view.m, 1);
        const offset = (first.getDay() + 6) % 7; // 0 = понедельник
        const start = new Date(view.y, view.m, 1 - offset);
        const all = Array.from({length: 42}, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
        return all[35].getMonth() === view.m ? all : all.slice(0, 35);
    }, [view]);

    const todayKey = useTodayKey();

    function shift(delta: number) {
        setView(v => {
            const m = v.m + delta;
            return {y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12};
        });
    }

    const goToday = () => {
        const n = new Date();
        setView({y: n.getFullYear(), m: n.getMonth()});
    };

    const modalTitle = modalDay
        ? new Intl.DateTimeFormat(i18n.language, {day: "numeric", month: "long", year: "numeric"}).format(modalDay)
        : "";

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("calendar.title")}</h1>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab] first-letter:uppercase">
                        {t("calendar.description")}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <NavButton label={t("calendar.prev", {defaultValue: "Предыдущий месяц"})} onClick={() => shift(-1)}>
                        <ChevronLeft className="w-4 h-4 text-[#55617a]" aria-hidden="true"/>
                    </NavButton>
                    <SelectDropdown
                        options={monthOptions}
                        value={String(view.m)}
                        onChange={(v) => setView(prev => ({...prev, m: Number(v)}))}
                        minWidth="128px"
                    />
                    <NavButton label={t("calendar.next", {defaultValue: "Следующий месяц"})} onClick={() => shift(1)}>
                        <ChevronRight className="w-4 h-4 text-[#55617a]" aria-hidden="true"/>
                    </NavButton>
                    <SelectDropdown
                        options={yearOptions}
                        value={String(view.y)}
                        onChange={(v) => setView(prev => ({...prev, y: Number(v)}))}
                        minWidth="88px"
                    />
                    <button onClick={goToday}
                            className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#f6f8fb]">
                        {t("calendar.today")}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-4 text-[11px] text-[#8b97ab]">
                <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" style={{color: COLORS.overdue.fg}} aria-hidden="true"/>
                    {t("calendar.legendOverdue")}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background: COLORS.upcoming.fg}}/>
                    {t("calendar.legendUpcoming")}
                </span>
            </div>

            {error && (
                <div role="alert" className="mb-3 flex items-center gap-3 text-[13px]"
                     style={{color: COLORS.overdue.fg}}>
                    {t("calendar.loadError")}
                    <button
                        onClick={() => setReloadKey(k => k + 1)}
                        className="h-7 px-2.5 rounded-[7px] border border-[#e5e9f0] bg-white text-[12px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        {t("calendar.retry", {defaultValue: "Повторить"})}
                    </button>
                </div>
            )}

            <div className="overflow-x-auto" aria-busy={loading}>
                <div className="min-w-[720px]">
                    <div className="grid grid-cols-7 gap-px mb-px">
                        {weekdays.map(w => (
                            <div key={w}
                                 className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd] px-2 py-1.5">{w}</div>
                        ))}
                    </div>
                    <div
                        className={`grid grid-cols-7 gap-px bg-[#e5e9f0] border border-[#e5e9f0] rounded-[10px] overflow-hidden transition-opacity ${loading ? "opacity-60 animate-pulse" : ""}`}>
                        {cells.map(d => {
                            const k = keyOf(d);
                            const inMonth = d.getMonth() === view.m;
                            const dow = (d.getDay() + 6) % 7;
                            const weekend = dow >= 5;
                            const evs = byDay.get(k) ?? [];
                            const isToday = k === todayKey;
                            const dateClass = `text-[12px] font-semibold ${isToday ? "bg-[#2f68f5] text-white rounded-full w-[20px] h-[20px] grid place-items-center" : "text-[#55617a]"}`;
                            return (
                                <div key={k}
                                     className={`min-h-[120px] p-1.5 ${weekend ? "bg-[#fafbfd]" : "bg-white"}`}
                                     style={{opacity: inMonth ? 1 : 0.45}}>
                                    <div className="flex items-center justify-between">
                                        {evs.length > 0 ? (
                                            <button
                                                onClick={() => setModalDay(d)}
                                                aria-label={`${new Intl.DateTimeFormat(i18n.language, {
                                                    day: "numeric",
                                                    month: "long"
                                                }).format(d)}: ${evs.length}`}
                                                className={`${dateClass} cursor-pointer hover:underline`}
                                            >
                                                {d.getDate()}
                                            </button>
                                        ) : (
                                            <span className={dateClass}>{d.getDate()}</span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-col gap-1">
                                        {evs.slice(0, MAX_VISIBLE).map((e, j) => (
                                            <Tooltip key={eventKey(e, j)}
                                                     content={`${e.documentTypeTitle}: ${e.title} · ${e.taskType}`}
                                                     side="top">
                                                <EventChip e={e} compact/>
                                            </Tooltip>
                                        ))}
                                        {evs.length > MAX_VISIBLE && (
                                            <button
                                                onClick={() => setModalDay(d)}
                                                className="text-[11px] text-[#8b97ab] px-1.5 py-0.5 text-left hover:text-[#4e57d6] hover:underline cursor-pointer"
                                            >
                                                +{evs.length - MAX_VISIBLE} {t("calendar.more")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {modalDay && (
                <DayEventsModal
                    day={modalDay}
                    events={byDay.get(keyOf(modalDay)) ?? []}
                    title={modalTitle}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}
