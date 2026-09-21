import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {calendarService, type CalendarEvent} from "@/service/analyticsService/calendarService.ts";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";

/**
 * Календарь сроков (ЗС-13): датированные задачи по всем контурам на сетке месяца.
 * Реестр отвечает «что есть», календарь — «когда что»: видно загрузку и заторы во
 * времени. Данные те же, что в «Мои задачи», разложенные по дням.
 */

function eventLink(e: CalendarEvent): string {
    if (e.documentType === "Acknowledgement") return "/hr-ack";
    if (e.entityId === null) return "/tasks";
    switch (e.documentType) {
        case "Sz":
            return `/sz/${e.entityId}`;
        case "Procurement":
            return `/prc/${e.entityId}`;
        case "Vnd":
            return `/base-vnd/${e.entityId}`;
        case "Meeting":
            return `/meetings/${e.entityId}`;
        case "Letter":
            return "/correspondence";
        case "Obligation":
            return "/obligations";
        default:
            return "/tasks";
    }
}

/** YYYY-MM-DD в местном представлении даты. */
function keyOf(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarPage() {
    const {t} = useTranslation();
    const weekdays = t("calendar.weekdays", {returnObjects: true}) as string[];
    const months = t("calendar.months", {returnObjects: true}) as string[];

    const monthOptions = useMemo(
        () => months.map((m, i) => ({value: String(i), label: m.charAt(0).toUpperCase() + m.slice(1)})),
        [months]
    );

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [error, setError] = useState(false);
    const [view, setView] = useState(() => {
        const n = new Date();
        return {y: n.getFullYear(), m: n.getMonth()};
    });

    // Диапазон лет пересчитывается от текущего view.y, чтобы выбранный год
    // всегда попадал в список, даже если далеко пролистали стрелками
    const yearOptions = useMemo(() => {
        const start = view.y - 10;
        return Array.from({length: 21}, (_, i) => {
            const y = start + i;
            return {value: String(y), label: String(y)};
        });
    }, [view.y]);

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

    const goToday = () => {
        const n = new Date();
        setView({y: n.getFullYear(), m: n.getMonth()});
    };

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">

                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("calendar.title")}</h1>
                    {/* Календарь сроков */}
                    <div className="mt-1 text-[12.5px] text-[#8b97ab] first-letter:uppercase">
                        {t("calendar.description")}
                        {/* Просроченные сроки выделены красным. Клик по событию открывает документ. */}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => shift(-1)}
                            className="w-9 h-9 grid place-items-center rounded-[9px] border border-[#e5e9f0] bg-white cursor-pointer hover:bg-[#f6f8fb]">
                        <ChevronLeft className="w-4 h-4 text-[#55617a]"/>
                    </button>
                    <div className="flex items-center gap-1.5">
                        <SelectDropdown
                            options={monthOptions}
                            value={String(view.m)}
                            onChange={(v) => setView(prev => ({...prev, m: Number(v)}))}
                            minWidth="128px"
                        />
                    </div>
                    <button onClick={() => shift(1)}
                            className="w-9 h-9 grid place-items-center rounded-[9px] border border-[#e5e9f0] bg-white cursor-pointer hover:bg-[#f6f8fb]">
                        <ChevronRight className="w-4 h-4 text-[#55617a]"/>
                    </button>
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
                    <span className="w-2.5 h-2.5 rounded-full" style={{background: "#c0392b"}}/>
                    {t("calendar.legendOverdue")}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background: "#2f68f5"}}/>
                    {t("calendar.legendUpcoming")}
                </span>
            </div>

            {error && <div className="text-[13px] text-[#c0392b]">{t("calendar.loadError")}</div>}
            {/* Не удалось загрузить календарь */}

            <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                    <div className="grid grid-cols-7 gap-px mb-px">
                        {weekdays.map(w => (
                            <div key={w}
                                 className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd] px-2 py-1.5">{w}</div>
                        ))}
                    </div>
                    <div
                        className="grid grid-cols-7 gap-px bg-[#e5e9f0] border border-[#e5e9f0] rounded-[10px] overflow-hidden">
                        {cells.map((d, i) => {
                            const k = keyOf(d);
                            const inMonth = d.getMonth() === view.m;
                            const evs = byDay.get(k) ?? [];
                            const isToday = k === todayKey;
                            return (
                                <div key={i} className="bg-white min-h-[120px] p-1.5"
                                     style={{opacity: inMonth ? 1 : 0.45}}>
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`text-[12px] font-semibold ${isToday ? "bg-[#2f68f5] text-white rounded-full w-[20px] h-[20px] grid place-items-center" : "text-[#55617a]"}`}>
                                            {d.getDate()}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-col gap-1">
                                        {evs.slice(0, 3).map((e, j) => (
                                            <Tooltip key={j}
                                                     content={`${e.documentTypeTitle}: ${e.title} · ${e.taskType}`}
                                                     side="top">
                                                <Link
                                                    to={eventLink(e)}
                                                    className="block rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-medium no-underline truncate w-full"
                                                    style={{
                                                        background: e.isOverdue ? "#fdecea" : "#eef3ff",
                                                        color: e.isOverdue ? "#c0392b" : "#2f68f5",
                                                    }}
                                                >
                                                    {e.regNumber ?? e.documentTypeTitle}: {e.title}
                                                </Link>
                                            </Tooltip>
                                        ))}
                                        {evs.length > 3 && (
                                            <span
                                                className="text-[10.5px] text-[#8b97ab] px-1.5">+{evs.length - 3} {t("calendar.more")}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}