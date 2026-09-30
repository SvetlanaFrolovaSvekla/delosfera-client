// Компонента выбора даты: ввод вручную, выбор из календаря
import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {createPortal} from "react-dom";
import {Calendar, Check, ChevronLeft, ChevronRight} from "lucide-react";
import {parseDDMMYYYY, formatDDMMYYYY, isSameDay} from "@/utils/dateUtils.ts";

interface DatePickerInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    modal?: boolean;
    modalTitle?: string;
    /** Дата + время: значение "дд.мм.гггг чч:мм", в календаре появляются поля часов и минут. */
    withTime?: boolean;
    /** Время, подставляемое при выборе дня, пока оно не задано ("00:00" для начала периода, "23:59" для конца). */
    defaultTime?: string;
}

interface DayCell {
    date: Date;
    current: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startWeekday);
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        cells.push({date: d, current: d.getMonth() === month});
    }
    return cells;
}

// Приводит произвольный ввод к маске дд.мм.гггг, оставляя только цифры
function maskDateInput(raw: string): string {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 8);
    let out = "";
    for (let i = 0; i < digitsOnly.length; i++) {
        out += digitsOnly[i];
        if (i === 1 || i === 3) out += ".";
    }
    return out;
}

// Маска дд.мм.гггг чч:мм. Разделитель ставится перед следующей цифрой, а не после
// последней: иначе Backspace на "01.02." возвращал бы точку и стереть её было бы нельзя.
function maskDateTimeInput(raw: string): string {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 12);
    let out = "";
    for (let i = 0; i < digitsOnly.length; i++) {
        if (i === 2 || i === 4) out += ".";
        else if (i === 8) out += " ";
        else if (i === 10) out += ":";
        out += digitsOnly[i];
    }
    return out;
}

type DateValidationErrorCode = "invalidMonth" | "invalidDay" | "invalidYear" | "dateNotExist" | "invalidTime";

// Полноценная проверка даты — отсекает и некорректные диапазоны (месяц 93),
// и несуществующие даты (30 февраля), которые формально прошли бы по диапазону
function validateDateString(s: string): { valid: boolean; errorCode?: DateValidationErrorCode; date?: Date; time?: string } {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (!match) return {valid: false};
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month < 1 || month > 12) return {valid: false, errorCode: "invalidMonth"};
    if (day < 1 || day > 31) return {valid: false, errorCode: "invalidDay"};
    if (year < 1900 || year > 2100) return {valid: false, errorCode: "invalidYear"};
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
        return {valid: false, errorCode: "dateNotExist"};
    }
    return {valid: true, date: d};
}

function validateDateTimeString(s: string): {
    valid: boolean; errorCode?: DateValidationErrorCode; date?: Date; time?: string
} {
    const match = /^(\d{2}\.\d{2}\.\d{4}) (\d{2}):(\d{2})$/.exec(s);
    if (!match) return {valid: false};
    const dateResult = validateDateString(match[1]);
    if (!dateResult.valid) return dateResult;
    if (Number(match[2]) > 23 || Number(match[3]) > 59) return {valid: false, errorCode: "invalidTime"};
    return {...dateResult, time: `${match[2]}:${match[3]}`};
}

const YEARS_PER_PAGE = 12;
const POPUP_WIDTH = 264;

export function DatePickerInput({
                                    value,
                                    onChange,
                                    placeholder: placeholderProp,
                                    className = "",
                                    disabled = false,
                                    modal = false,
                                    modalTitle: modalTitleProp,
                                    withTime = false,
                                    defaultTime = "00:00",
                                }: DatePickerInputProps) {
    const {t} = useTranslation();

    // В режиме со временем value = "дд.мм.гггг чч:мм": дату и время разбираем отдельно.
    const dateStr = withTime ? value.split(" ")[0] : value;
    const timeStr = withTime ? (value.split(" ")[1] ?? "") : "";
    const fullLength = withTime ? 16 : 10;

    // дд.мм.гггг
    const dateFormatPlaceholder = withTime
        ? t("datePickerInput.dateTimeFormatPlaceholder") // дд.мм.гггг чч:мм
        : t("datePickerInput.dateFormatPlaceholder");
    const placeholder = placeholderProp ?? dateFormatPlaceholder;
    // Выбор даты
    const modalTitle = modalTitleProp ?? t("datePickerInput.modalTitle");
    // Пн, Вт, Ср, Чт, Пт, Сб, Вс
    const WEEKDAYS = t("datePickerInput.weekdays", {returnObjects: true}) as string[];
    // Январь, Февраль, Март, Апрель, Май, Июнь, Июль, Август, Сентябрь, Октябрь, Ноябрь, Декабрь
    const MONTHS = t("datePickerInput.months", {returnObjects: true}) as string[];

    const [open, setOpen] = useState(false);
    const [view, setView] = useState<"days" | "years">("days");
    const today = new Date();
    const [cursor, setCursor] = useState<Date>(parseDDMMYYYY(dateStr) ?? today);
    const [yearPageStart, setYearPageStart] = useState<number>(
        Math.floor((parseDDMMYYYY(dateStr) ?? today).getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE
    );
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    // ручной ввод внутри дропдауна
    const [manualInput, setManualInput] = useState(value);
    const [manualError, setManualError] = useState<string | null>(null);

    // часы и минуты — строками, чтобы можно было стереть поле и набрать заново
    const [hh, setHh] = useState("00");
    const [mm, setMm] = useState("00");

    const containerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                (!popupRef.current || !popupRef.current.contains(target))
            ) {
                setOpen(false);
                setView("days");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    // при каждом открытии — подтягиваем черновик ручного ввода из текущего value
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setManualInput(value);
            setManualError(null);
        }
    }, [open, value]);

    // Часы/минуты подтягиваем из значения только при открытии, а не при каждом изменении:
    // иначе "5" тут же превращалось бы в "05" под курсором и второй цифре некуда встать.
    useEffect(() => {
        if (open && withTime) {
            const [h = "00", m = "00"] = (timeStr || defaultTime).split(":");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHh(h);
            setMm(m);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const updateCoords = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const left = Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8);
        setCoords({top: rect.bottom + 6, left: Math.max(8, left)});
    };

    useLayoutEffect(() => {
        if (!open || modal) return;
        updateCoords();
        const handler = () => updateCoords();
        window.addEventListener("scroll", handler, true);
        window.addEventListener("resize", handler);
        return () => {
            window.removeEventListener("scroll", handler, true);
            window.removeEventListener("resize", handler);
        };
    }, [open, modal]);

    const openCalendar = () => {
        if (disabled) return;
        const base = parseDDMMYYYY(dateStr) ?? today;
        setCursor(base);
        setYearPageStart(Math.floor(base.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
        setView("days");
        setOpen((v) => !v);
    };

    const emit = (d: Date, time: string) =>
        onChange(withTime ? `${formatDDMMYYYY(d)} ${time}` : formatDDMMYYYY(d));

    const selectDay = (d: Date) => {
        if (withTime) {
            // выбор дня не закрывает календарь — ниже ещё нужно задать время
            emit(d, timeStr || defaultTime);
            setView("days");
            return;
        }
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

    const applyTime = (h: string, m: string) =>
        emit(parseDDMMYYYY(dateStr) ?? today, `${(h || "0").padStart(2, "0")}:${(m || "0").padStart(2, "0")}`);

    const handleHourChange = (raw: string) => {
        let v = raw.replace(/\D/g, "").slice(0, 2);
        if (v.length === 2 && Number(v) > 23) v = "23";
        setHh(v);
        applyTime(v, mm);
    };

    const handleMinuteChange = (raw: string) => {
        let v = raw.replace(/\D/g, "").slice(0, 2);
        if (v.length === 2 && Number(v) > 59) v = "59";
        setMm(v);
        applyTime(hh, v);
    };

    const validateManual = (v: string) => (withTime ? validateDateTimeString(v) : validateDateString(v));
    const manualValidation = manualInput.length === fullLength ? validateManual(manualInput) : null;
    const manualIsValid = !!manualValidation?.valid;

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = withTime ? maskDateTimeInput(e.target.value) : maskDateInput(e.target.value);
        setManualInput(masked);
        if (masked.length < fullLength) {
            setManualError(null);
            return;
        }
        const result = validateManual(masked);
        if (result.valid) {
            setManualError(null);
            return;
        }
        // Некорректный месяц / Некорректный день / Некорректный год / Такой даты не существует / Некорректная дата
        setManualError(
            result.errorCode
                ? t(`datePickerInput.errors.${result.errorCode}`)
                : t("datePickerInput.errors.invalidDate")
        );
    };

    const applyManualInput = () => {
        if (!manualValidation?.valid || !manualValidation.date) return;
        if (withTime) {
            emit(manualValidation.date, manualValidation.time ?? defaultTime);
            setOpen(false);
            setView("days");
            return;
        }
        selectDay(manualValidation.date);
    };

    const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && manualIsValid) applyManualInput();
    };

    const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
    const selected = parseDDMMYYYY(dateStr);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                {modal ? (
                    <button
                        type="button"
                        onClick={openCalendar}
                        disabled={disabled}
                        className={`h-[36px] px-2.5 pr-7 rounded-[8px] border border-[#e5e9f0] bg-white text-[12.5px] text-left outline-none box-border focus:border-[#4e57d6] w-full cursor-pointer disabled:bg-[#f6f8fb] disabled:text-[#8b97ab] disabled:cursor-not-allowed ${
                            value ? "text-[#1c2740]" : "text-[#a3adbd]"
                        } ${className}`}
                    >
                        {value || placeholder}
                    </button>
                ) : (
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={value}
                        disabled={disabled}
                        onChange={(e) => onChange(withTime ? maskDateTimeInput(e.target.value) : e.target.value)}
                        onFocus={() => {
                            if (!open) openCalendar();
                        }}
                        className={`h-[36px] px-2.5 pr-7 rounded-[8px] border border-[#e5e9f0] bg-white text-[12.5px] text-[#1c2740] outline-none box-border focus:border-[#4e57d6] w-full disabled:bg-[#f6f8fb] disabled:text-[#8b97ab] disabled:cursor-not-allowed ${className}`}
                    />
                )}

                <span
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-[#a3adbd] ${
                        modal ? "pointer-events-none" : ""
                    }`}
                >
                    {modal ? (
                        <Calendar className="w-[13px] h-[13px]"/>
                    ) : (
                        <button
                            type="button"
                            onClick={openCalendar}
                            disabled={disabled}
                            className="text-[#a3adbd] hover:text-[#4e57d6] disabled:hover:text-[#a3adbd] disabled:cursor-not-allowed"
                        >
                            <Calendar className="w-[13px] h-[13px]"/>
                        </button>
                    )}
                </span>
            </div>

            {open && (() => {
                const calendarBody = view === "days" ? (
                    <>
                        <div className="flex items-center justify-between mb-2.5">
                            <button type="button" onClick={() => shiftMonth(-1)}
                                    className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]">
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            <button type="button" onClick={() => setView("years")}
                                    className="cursor-pointer text-[12.5px] font-semibold text-[#1c2740] hover:text-[#4e57d6] px-1.5 py-0.5 rounded-md hover:bg-[#f6f8fb]">
                                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                            </button>
                            <button type="button" onClick={() => shiftMonth(1)}
                                    className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]">
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

                        {withTime && (
                            <div className="mt-2.5 pt-2.5 border-t border-[#eef2f7] flex items-center justify-between">
                                <span className="text-[10.5px] font-bold tracking-[.04em] uppercase text-[#a3adbd]">
                                    {t("datePickerInput.timeLabel")} {/* Время */}
                                </span>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={hh}
                                        onChange={(e) => handleHourChange(e.target.value)}
                                        onBlur={() => setHh((v) => v.padStart(2, "0"))}
                                        className="h-9 w-[46px] rounded-[8px] border border-[#e5e9f0] text-center text-[12.5px] text-[#1c2740] outline-none box-border focus:border-[#4e57d6]"
                                    />
                                    <span className="text-[#a3adbd]">:</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={mm}
                                        onChange={(e) => handleMinuteChange(e.target.value)}
                                        onBlur={() => setMm((v) => v.padStart(2, "0"))}
                                        className="h-9 w-[46px] rounded-[8px] border border-[#e5e9f0] text-center text-[12.5px] text-[#1c2740] outline-none box-border focus:border-[#4e57d6]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className={`mt-2.5 pt-2.5 border-t border-[#eef2f7] flex items-center ${
                            withTime ? "justify-between" : "justify-center"}`}>
                            <button type="button" onClick={goToday}
                                    className="cursor-pointer h-8 px-3 rounded-[8px] text-[12px] font-semibold text-[#4e57d6] hover:bg-[#f6f8fb]">
                                {t("datePickerInput.today")} {/* Сегодня */}
                            </button>
                            {withTime && (
                                <button type="button"
                                        onClick={() => {
                                            setOpen(false);
                                            setView("days");
                                        }}
                                        className="cursor-pointer h-8 px-3.5 rounded-[8px] border-none bg-[#4e57d6] text-white text-[12px] font-semibold hover:brightness-[1.06]">
                                    {t("datePickerInput.done")} {/* Готово */}
                                </button>
                            )}
                        </div>

                        {/* Ручной ввод даты */}
                        <div className="mt-2.5 pt-2.5 border-t border-[#eef2f7]">
                            <div className="text-[10.5px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-1.5">
                                {t("datePickerInput.manualEntryLabel")} {/* Ввести вручную */}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={manualInput}
                                    onChange={handleManualChange}
                                    onKeyDown={handleManualKeyDown}
                                    placeholder={dateFormatPlaceholder} // дд.мм.гггг
                                    maxLength={fullLength}
                                    className={`h-9 px-2.5 rounded-[8px] border text-[12.5px] text-[#1c2740] outline-none flex-1 box-border focus:border-[#4e57d6] ${
                                        manualError ? "border-[#e0525f] focus:border-[#e0525f]" : "border-[#e5e9f0]"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={applyManualInput}
                                    disabled={!manualIsValid}
                                    aria-label={t("datePickerInput.confirmDateAria")} // Подтвердить дату
                                    className={`w-9 h-9 flex-none grid place-items-center rounded-[8px] border-none transition-colors ${
                                        manualIsValid
                                            ? "bg-[#4e57d6] text-white cursor-pointer hover:brightness-105"
                                            : "bg-[#f0f2f6] text-[#c7cedb] cursor-not-allowed"
                                    }`}
                                >
                                    <Check className="w-4 h-4" strokeWidth={2.5}/>
                                </button>
                            </div>
                            {manualError && (
                                <div className="mt-1 text-[11px] text-[#e0525f]">{manualError}</div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2.5">
                            <button type="button" onClick={() => shiftYearPage(-1)}
                                    className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]">
                                <ChevronLeft className="w-4 h-4"/>
                            </button>
                            <span className="text-[12.5px] font-semibold text-[#1c2740]">
                                {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                            </span>
                            <button type="button" onClick={() => shiftYearPage(1)}
                                    className="cursor-pointer w-6 h-6 grid place-items-center rounded-md text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]">
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

                if (!coords) return null;
                return createPortal(
                    <div
                        ref={popupRef}
                        style={{top: coords.top, left: coords.left, width: POPUP_WIDTH}}
                        className="fixed z-50 bg-white border border-[#e5e9f0] rounded-[12px] shadow-[0_8px_24px_rgba(28,39,64,0.12)] p-3"
                    >
                        {calendarBody}
                    </div>,
                    document.body
                );
            })()}
        </div>
    );
}