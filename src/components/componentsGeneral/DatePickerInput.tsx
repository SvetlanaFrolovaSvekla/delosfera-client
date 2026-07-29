import {useEffect, useRef, useState} from "react";
import {Calendar, ChevronLeft, ChevronRight} from "lucide-react";
import {parseDDMMYYYY, formatDDMMYYYY, isSameDay} from "@/utils/dateUtils.ts";

interface DatePickerInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    modal?: boolean;       // показывать календарь модалкой по центру экрана вместо попапа у поля
    modalTitle?: string;   // заголовок модалки (используется только если modal === true)
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

interface DayCell {
    date: Date;
    current: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Пн = 0
    const gridStart = new Date(year, month, 1 - startWeekday);
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        cells.push({date: d, current: d.getMonth() === month});
    }
    return cells;
}

const YEARS_PER_PAGE = 12;

export function DatePickerInput({
                                    value,
                                    onChange,
                                    placeholder = "дд.мм.гггг",
                                    className = "",
                                    disabled = false,
                                    modal = false,
                                    modalTitle = "Выбор даты",
                                }: DatePickerInputProps) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<"days" | "years">("days");
    const today = new Date();
    const [cursor, setCursor] = useState<Date>(parseDDMMYYYY(value) ?? today);
    const [yearPageStart, setYearPageStart] = useState<number>(
        Math.floor((parseDDMMYYYY(value) ?? today).getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE
    );
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setView("days");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const openCalendar = () => {
        if (disabled) return;
        const base = parseDDMMYYYY(value) ?? today;
        setCursor(base);
        setYearPageStart(Math.floor(base.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
        setView("days");
        setOpen((v) => !v);
    };

    const selectDay = (d: Date) => {
        onChange(formatDDMMYYYY(d));
        setOpen(false);
        setView("days");
    };

    const goToday = () => selectDay(today);

    const shiftMonth = (delta: number) =>
        setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

    const shiftYearPage = (delta: number) => setYearPageStart((prev) => prev + delta * YEARS_PER_PAGE);

    const pickYear = (year: number) => {
        setCursor((prev) => new Date(year, prev.getMonth(), 1));
        setView("days");
    };

    const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
    const selected = parseDDMMYYYY(value);

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => {
                        if (!open) openCalendar();
                    }}
                    className={`h-[36px] px-2.5 pr-7 rounded-[8px] border border-[#e5e9f0] bg-white text-[12.5px] text-[#1c2740] outline-none box-border focus:border-[#4e57d6] w-full disabled:bg-[#f6f8fb] disabled:text-[#8b97ab] disabled:cursor-not-allowed ${className}`}
                />
                <button
                    type="button"
                    onClick={openCalendar}
                    disabled={disabled}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a3adbd] hover:text-[#4e57d6] disabled:hover:text-[#a3adbd] disabled:cursor-not-allowed"
                >
                    <Calendar className="w-[13px] h-[13px]"/>
                </button>
            </div>

            {open && (() => {
                const calendarBody = view === "days" ? (
                    <>
                        <div className="flex items-center justify-between mb-2.5">
                            <button
                                type="button"
                                onClick={() => shiftMonth(-1)}
                                className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("years")}
                                className="cursor-pointer text-[12.5px] font-semibold text-[#1c2740] hover:text-[#4e57d6] px-1.5 py-0.5 rounded-md hover:bg-[#f6f8fb]"
                            >
                                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                            </button>
                            <button
                                type="button"
                                onClick={() => shiftMonth(1)}
                                className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-y-1 mb-1">
                            {WEEKDAYS.map((w) => (
                                <div key={w} className="text-[10.5px] text-[#a3adbd] text-center font-semibold">
                                    {w}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-1">
                            {cells.map(({date, current}, i) => {
                                const isSelected = selected ? isSameDay(date, selected) : false;
                                const isToday = isSameDay(date, today);
                                return (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => selectDay(date)}
                                        className={`cursor-pointer h-7 w-7 mx-auto grid place-items-center rounded-full text-[12px] transition-colors ${
                                            !current ? "text-[#c7cedb]" : "text-[#3a4560]"
                                        } ${
                                            isSelected
                                                ? "bg-[#4e57d6] text-white font-semibold"
                                                : isToday
                                                    ? "border border-[#4e57d6] text-[#4e57d6] font-semibold"
                                                    : "hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-[#eef2f7] flex justify-center">
                            <button
                                type="button"
                                onClick={goToday}
                                className="cursor-pointer h-8 px-3 rounded-[8px] text-[12px] font-semibold text-[#4e57d6] hover:bg-[#f6f8fb]"
                            >
                                Сегодня
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2.5">
                            <button
                                type="button"
                                onClick={() => shiftYearPage(-1)}
                                className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                            >
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            <span className="text-[12.5px] font-semibold text-[#1c2740]">
                                {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => shiftYearPage(1)}
                                className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                            >
                                <ChevronRight className="w-4 h-4"/>
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                            {Array.from({length: YEARS_PER_PAGE}, (_, i) => yearPageStart + i).map((year) => (
                                <button
                                    type="button"
                                    key={year}
                                    onClick={() => pickYear(year)}
                                    className={`cursor-pointer h-8 rounded-[8px] text-[12.5px] ${
                                        year === cursor.getFullYear()
                                            ? "bg-[#4e57d6] text-white font-semibold"
                                            : "text-[#3a4560] hover:bg-[#f6f8fb]"
                                    }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </>
                );

                if (modal) {
                    return (
                        <div
                            onClick={() => {
                                setOpen(false);
                                setView("days");
                            }}
                            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-[300px] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="m-0 text-[14px] font-semibold text-[#1c2740]">{modalTitle}</h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpen(false);
                                            setView("days");
                                        }}
                                        className="cursor-pointer w-6 h-6 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a]"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {calendarBody}
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-[264px] bg-white border border-[#e5e9f0] rounded-[12px] shadow-[0_8px_24px_rgba(28,39,64,0.12)] p-3">
                        {calendarBody}
                    </div>
                );
            })()}
        </div>
    );
}