/**
 * Календарь сроков (ЗС-13): датированные задачи по всем контурам на сетке месяца.
 * Реестр отвечает «что есть», календарь — «когда что»: видно загрузку и заторы во
 * времени. Данные те же, что в «Мои задачи», разложенные по дням.
 */
import {useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {COLORS} from "@/constants/calendarPageConst.ts";
import {buildMonthCells, currentView, groupByDay, shiftMonth, type CalendarView} from "@/utils/calendar/calendarUtils.ts";
import {asStringArray} from "@/utils/stringUtils.ts";
import {keyOf} from "@/utils/dateUtils.ts";
import {useTodayKey} from "@/hooks/useTodayKey.ts";
import {useCalendarEvents} from "@/hooks/useCalendarEvents.ts";
import {CalendarHeader} from "@/components/componentsCalendar/CalendarHeader.tsx";
import {CalendarDayCell} from "@/components/componentsCalendar/CalendarDayCell.tsx";
import {DayEventsModal} from "@/components/componentsCalendar/DayEventsModal.tsx";
import {AlertCircle} from "lucide-react";

export function CalendarPage() {
    const {t, i18n} = useTranslation();
    const {events, loading, error, reload} = useCalendarEvents();
    const todayKey = useTodayKey();

    const [view, setView] = useState<CalendarView>(currentView);
    const [modalDay, setModalDay] = useState<Date | null>(null);
    const closeModal = useCallback(() => setModalDay(null), []);

    const weekdays = asStringArray(t("calendar.weekdays", {returnObjects: true}));

    // Форматтеры создаются один раз на язык, а не на каждую ячейку
    const dayFormat = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, {day: "numeric", month: "long"}),
        [i18n.language]
    );
    const fullDateFormat = useMemo(
        () => new Intl.DateTimeFormat(i18n.language, {day: "numeric", month: "long", year: "numeric"}),
        [i18n.language]
    );

    const byDay = useMemo(() => groupByDay(events), [events]);
    const cells = useMemo(() => buildMonthCells(view), [view]);

    const monthIsEmpty = !loading && !error
        && !cells.some(d => d.getMonth() === view.m && byDay.has(keyOf(d)));

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <CalendarHeader
                view={view}
                onShift={delta => setView(v => shiftMonth(v, delta))}
                onMonthChange={m => setView(v => ({...v, m}))}
                onYearChange={y => setView(v => ({...v, y}))}
                onToday={() => setView(currentView())}
            />

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
                        onClick={reload}
                        className="h-7 px-2.5 rounded-[7px] border border-[#e5e9f0] bg-white text-[12px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        {t("calendar.retry", {defaultValue: "Повторить"})}
                    </button>
                </div>
            )}

            {monthIsEmpty && (
                <div className="mb-3 text-[12.5px] text-[#8b97ab]">
                    {t("calendar.empty", {defaultValue: "В этом месяце сроков нет"})}
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
                            return (
                                <CalendarDayCell
                                    key={k}
                                    date={d}
                                    inMonth={d.getMonth() === view.m}
                                    isToday={k === todayKey}
                                    events={byDay.get(k) ?? []}
                                    dayFormat={dayFormat}
                                    onOpenDay={setModalDay}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {modalDay && (
                <DayEventsModal
                    day={modalDay}
                    events={byDay.get(keyOf(modalDay)) ?? []}
                    title={fullDateFormat.format(modalDay)}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}
