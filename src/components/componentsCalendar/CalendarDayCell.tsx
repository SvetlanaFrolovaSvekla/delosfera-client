// Ячейка одного дня в сетке календаря
import {useTranslation} from "react-i18next";
import type {CalendarEvent} from "@/service/analyticsService/calendarService.ts";
import {MAX_VISIBLE} from "@/constants/calendarPageConst.ts";
import {eventKey} from "@/utils/calendar/calendarUtils.ts";
import {EventChip} from "@/components/componentsCalendar/EventChip.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

interface Props {
    date: Date;
    inMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
    /** Форматтер «день месяц» для aria-label (создаётся один раз на страницу). */
    dayFormat: Intl.DateTimeFormat;
    onOpenDay: (d: Date) => void;
}

export function CalendarDayCell({date, inMonth, isToday, events, dayFormat, onOpenDay}: Props) {
    const {t} = useTranslation();
    const weekend = (date.getDay() + 6) % 7 >= 5;
    const dateClass = `text-[12px] font-semibold ${isToday ? "bg-[#2f68f5] text-white rounded-full w-[20px] h-[20px] grid place-items-center" : "text-[#55617a]"}`;

    return (
        <div className={`min-h-[120px] p-1.5 ${weekend ? "bg-[#fafbfd]" : "bg-white"}`}
             style={{opacity: inMonth ? 1 : 0.45}}>
            <div className="flex items-center justify-between">
                {events.length > 0 ? (
                    <button
                        onClick={() => onOpenDay(date)}
                        aria-label={`${dayFormat.format(date)}: ${events.length}`}
                        className={`${dateClass} cursor-pointer hover:underline`}
                    >
                        {date.getDate()}
                    </button>
                ) : (
                    <span className={dateClass}>{date.getDate()}</span>
                )}
            </div>
            <div className="mt-1 flex flex-col gap-1">
                {events.slice(0, MAX_VISIBLE).map((e, j) => (
                    <Tooltip key={eventKey(e, j)}
                             content={`${e.documentTypeTitle}: ${e.title} · ${e.taskType}`}
                             side="top">
                        <EventChip e={e} compact/>
                    </Tooltip>
                ))}
                {events.length > MAX_VISIBLE && (
                    <button
                        onClick={() => onOpenDay(date)}
                        className="text-[11px] text-[#8b97ab] px-1.5 py-0.5 text-left hover:text-[#4e57d6] hover:underline cursor-pointer"
                    >
                        +{events.length - MAX_VISIBLE} {t("calendar.more")}
                    </button>
                )}
            </div>
        </div>
    );
}
