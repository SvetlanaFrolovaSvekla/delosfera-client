// Компонента плашка события календаря
import {useTranslation} from "react-i18next";
import type {CalendarEvent} from "@/service/analyticsService/calendarService.ts";
import {Link} from "react-router-dom";
import {eventColors, LINKS, STATIC_LINKS} from "@/constants/calendarPageConst.ts";
import {AlertCircle} from "lucide-react";

// STATIC_LINKS - когда нет конкретной записи у события
function eventLink(e: CalendarEvent): string {
    if (STATIC_LINKS[e.documentType]) return STATIC_LINKS[e.documentType];
    if (e.entityId === null) return "/tasks";
    return LINKS[e.documentType]?.(e.entityId) ?? "/tasks";
}

export function EventChip({e, compact, onClick}: { e: CalendarEvent; compact?: boolean; onClick?: () => void }) {
    const {t} = useTranslation();
    const c = eventColors(e);
    const label = `${e.regNumber ?? e.documentTypeTitle}: ${e.title}`;
    return (
        <Link
            to={eventLink(e)}
            onClick={onClick}
            aria-label={e.isOverdue ? `${t("calendar.legendOverdue")}: ${label}` : label}
            className={compact
                ? "flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium no-underline w-full"
                : "block rounded-[8px] px-3 py-2 text-[12.5px] font-medium no-underline"}
            style={{background: c.bg, color: c.fg}}
        >
            {compact ? (
                <>
                    {e.isOverdue && <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true"/>}
                    <span className="truncate">{label}</span>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-1.5 font-semibold">
                        {e.isOverdue && <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true"/>}
                        <span>{label}</span>
                    </div>
                    <div className="text-[11px] opacity-70 mt-0.5">{e.documentTypeTitle} · {e.taskType}</div>
                </>
            )}
        </Link>
    );
}