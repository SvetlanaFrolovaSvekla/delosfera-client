import {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {calendarService, type CalendarEvent} from "@/service/analyticsService/calendarService.ts";

/**
 * Календарь сроков (ЗС-13): датированные задачи по всем контурам на сетке месяца.
 * Реестр отвечает «что есть», календарь — «когда что»: видно загрузку и заторы во
 * времени. Данные те же, что в «Мои задачи», разложенные по дням.
 */

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function eventLink(e: CalendarEvent): string {
    if (e.documentType === "Acknowledgement") return "/hr-ack";
    if (e.entityId === null) return "/tasks";
    switch (e.documentType) {
        case "Sz": return `/sz/${e.entityId}`;
        case "Procurement": return `/prc/${e.entityId}`;
        case "Vnd": return `/base-vnd/${e.entityId}`;
        case "Meeting": return `/meetings/${e.entityId}`;
        // Письмо и обязательство открываются на своих реестрах: отдельной карточки-роута
        // у них нет, книга и реестр открываются на записи по клику внутри страницы.
        case "Letter": return "/correspondence";
        case "Obligation": return "/obligations";
        default: return "/tasks";
    }
}

/** YYYY-MM-DD в местном представлении даты. */
function keyOf(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [error, setError] = useState(false);
    const [view, setView] = useState(() => {
        const n = new Date();
        return {y: n.getFullYear(), m: n.getMonth()};
    });

    useEffect(() => {
        calendarService.get().then(setEvents).catch(() => setError(true));
    }, []);

    const byDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const e of events) {
            const arr = map.get(e.date) ?? [];
            arr.push(e);
            map.set(e.date, arr);
        }
        return map;
    }, [events]);

    // 6 недель по 7 дней от понедельника недели, в которую попадает 1-е число.
    const cells = useMemo(() => {
        const first = new Date(view.y, view.m, 1);
        const offset = (first.getDay() + 6) % 7; // 0 = понедельник
        const start = new Date(view.y, view.m, 1 - offset);
        return Array.from({length: 42}, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [view]);

    const todayKey = keyOf(new Date());

    function shift(delta: number) {
        setView(v => {
            const m = v.m + delta;
            return {y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12};
        });
    }

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Календарь сроков</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => shift(-1)} className="w-9 h-9 grid place-items-center rounded-[9px] border border-[#e5e9f0] bg-white cursor-pointer hover:bg-[#f6f8fb]">
                        <ChevronLeft className="w-4 h-4 text-[#55617a]"/>
                    </button>
                    <span className="text-[14px] font-semibold text-[#0f1b2d] min-w-[150px] text-center capitalize">
                        {MONTHS[view.m]} {view.y}
                    </span>
                    <button onClick={() => shift(1)} className="w-9 h-9 grid place-items-center rounded-[9px] border border-[#e5e9f0] bg-white cursor-pointer hover:bg-[#f6f8fb]">
                        <ChevronRight className="w-4 h-4 text-[#55617a]"/>
                    </button>
                </div>
            </div>

            {error && <div className="text-[13px] text-[#c0392b]">Не удалось загрузить календарь</div>}

            <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                    <div className="grid grid-cols-7 gap-px mb-px">
                        {WEEKDAYS.map(w => (
                            <div key={w} className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd] px-2 py-1.5">{w}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-[#e5e9f0] border border-[#e5e9f0] rounded-[10px] overflow-hidden">
                        {cells.map((d, i) => {
                            const k = keyOf(d);
                            const inMonth = d.getMonth() === view.m;
                            const evs = byDay.get(k) ?? [];
                            const isToday = k === todayKey;
                            return (
                                <div key={i} className="bg-white min-h-[92px] p-1.5" style={{opacity: inMonth ? 1 : 0.45}}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[12px] font-semibold ${isToday ? "bg-[#2f68f5] text-white rounded-full w-[20px] h-[20px] grid place-items-center" : "text-[#55617a]"}`}>
                                            {d.getDate()}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-col gap-1">
                                        {evs.slice(0, 3).map((e, j) => (
                                            <Link
                                                key={j}
                                                to={eventLink(e)}
                                                title={`${e.documentTypeTitle}: ${e.title} · ${e.taskType}`}
                                                className="block rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-medium no-underline truncate"
                                                style={{
                                                    background: e.isOverdue ? "#fdecea" : "#eef3ff",
                                                    color: e.isOverdue ? "#c0392b" : "#2f68f5",
                                                }}
                                            >
                                                {e.regNumber ?? e.documentTypeTitle}: {e.title}
                                            </Link>
                                        ))}
                                        {evs.length > 3 && (
                                            <span className="text-[10.5px] text-[#8b97ab] px-1.5">+{evs.length - 3} ещё</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-3 text-[12px] text-[#8b97ab]">
                Просроченные сроки выделены красным. Клик по событию открывает документ.
            </div>
        </div>
    );
}
