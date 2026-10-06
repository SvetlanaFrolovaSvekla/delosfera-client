// Модалка со всеми событиями одного дня
import {useEffect, useRef} from "react";
import {useTranslation} from "react-i18next";
import type {CalendarEvent} from "@/service/analyticsService/calendarService.ts";
import {keyOf} from "@/utils/dateUtils.ts";
import {eventKey} from "@/utils/calendar/calendarUtils.ts";
import {COLORS} from "@/constants/calendarPageConst.ts";
import {EventChip} from "@/components/componentsCalendar/EventChip.tsx";
import {X} from "lucide-react";

export function DayEventsModal({day, events, title, onClose}: {
    day: Date;
    events: CalendarEvent[];
    title: string;
    onClose: () => void;
}) {
    const {t} = useTranslation();
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const prev = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            prev?.focus?.();
        };
    }, [onClose]);

    const overdueCount = events.filter(e => e.isOverdue).length;
    const titleId = `calendar-day-${keyOf(day)}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="bg-white rounded-[12px] w-full max-w-[480px] max-h-[80vh] flex flex-col shadow-xl"
                onClick={(ev) => ev.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e9f0]">
                    <div>
                        <div id={titleId} className="text-[14px] font-bold text-[#0f1b2d]">{title}</div>
                        {overdueCount > 0 && (
                            <div className="mt-0.5 text-[11.5px]" style={{color: COLORS.overdue.fg}}>
                                {t("calendar.legendOverdue")}: {overdueCount}
                            </div>
                        )}
                    </div>
                    <button
                        ref={closeRef}
                        onClick={onClose}
                        aria-label={t("calendar.close", {defaultValue: "Закрыть"})}
                        className="w-7 h-7 grid place-items-center rounded-[7px] hover:bg-[#f6f8fb] cursor-pointer"
                    >
                        <X className="w-4 h-4 text-[#8b97ab]" aria-hidden="true"/>
                    </button>
                </div>
                <div className="overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
                    {events.map((e, j) => (
                        <EventChip key={eventKey(e, j)} e={e} onClick={onClose}/>
                    ))}
                </div>
            </div>
        </div>
    );
}
