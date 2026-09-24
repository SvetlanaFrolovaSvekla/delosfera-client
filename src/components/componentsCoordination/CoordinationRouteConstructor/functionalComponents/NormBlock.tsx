// Блок с нормативными значениями для согласования в модалке конструктора маршрутов
import React from "react";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {getMaxDeadlineMinutes, MAX_DEADLINE_WORK_DAYS} from "@/constants/coordinationParams.ts";
import {getWorkDayMinutes, useWorkCalendar} from "@/utils/workCalendar.ts";

interface NormBlockProps {
    label: string;
    /** Суммарное значение норматива в РАБОЧИХ минутах (1 д. = рабочий день банка, getWorkDayMinutes()) */
    value: number | "";
    onChange: (value: number | "") => void;
    blockRef?: React.Ref<HTMLDivElement>;
    helpText?: string;
    /** Только просмотр (например, в справочнике у пользователя без прав на изменение) */
    disabled?: boolean;
    /** Подпись под полями - например, "до пт, 03.10 в 15:00" (когда истечёт срок, если начать сейчас) */
    footnote?: React.ReactNode;
}

// Норматив в рабочем времени: "д." - рабочий день банка (по умолчанию 9 ч), "ч." - остаток
// меньше дня. Длина дня задаётся в справочнике "Производственный календарь".
const MAX_DAYS = MAX_DEADLINE_WORK_DAYS; // 90

export function NormBlock({label, value, onChange, blockRef, helpText, disabled = false, footnote}: NormBlockProps) {
    useWorkCalendar(); // перерисовать, когда подтянется длина рабочего дня из справочника
    const DAY = getWorkDayMinutes();
    const MAX_HOURS = Math.floor((DAY - 1) / 60); // 8 при 9-часовом дне
    const MAX_DEADLINE_MINUTES = getMaxDeadlineMinutes();
    const totalMinutes = value === "" ? 0 : value;
    const days = Math.floor(totalMinutes / DAY);
    const hours = Math.floor((totalMinutes % DAY) / 60);
    const minutes = totalMinutes % 60;

    // Верхняя граница - getMaxDeadlineMinutes() (90 рабочих дней), см. constants/coordinationParams.ts.
    // Без неё в поле можно вписать любое число, которое потом не проходит на бэкенде
    // и там же ломает расчёт дедлайна при переполнении DateTime.
    const clampTotal = (totalValue: number) => Math.min(Math.max(0, totalValue), MAX_DEADLINE_MINUTES);

    const emit = (next: number) => onChange(next > 0 ? next : "");

    const handleDaysChange = (raw: string) => {
        if (raw === "") {
            emit(clampTotal(hours * 60 + minutes));
            return;
        }
        const parsed = Math.floor(Number(raw));
        const newDays = Number.isFinite(parsed) ? Math.min(Math.max(0, parsed), MAX_DAYS) : 0;
        emit(clampTotal(newDays * DAY + hours * 60 + minutes));
    };

    const handleHoursChange = (raw: string) => {
        if (raw === "") {
            emit(clampTotal(days * DAY + minutes));
            return;
        }
        // Не ограничиваем сверху 8 - если ввели 12 часов, normalize произойдёт сам собой на
        // следующем рендере (days/hours пересчитаются из totalMinutes: 12 ч = 1 д. 3 ч.).
        const parsed = Math.floor(Number(raw));
        const newHours = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
        emit(clampTotal(days * DAY + newHours * 60 + minutes));
    };

    const handleMinutesChange = (raw: string) => {
        if (raw === "") {
            emit(clampTotal(days * DAY + hours * 60));
            return;
        }
        // Аналогично - не ограничиваем сверху 59, normalize сам пересчитает при рендере.
        const parsed = Math.floor(Number(raw));
        const newMinutes = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
        emit(clampTotal(days * DAY + hours * 60 + newMinutes));
    };

    return (
        <div
            ref={blockRef}
            className="relative flex w-[320px] flex-none items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]"
        >
            {helpText && (
                <div className="absolute -right-2 -top-2">
                    <HelpTooltip
                        content={helpText}
                        side="top"
                        className="h-6 w-6 bg-white shadow-sm border border-[#e5e9f0]"
                    />
                </div>
            )}

            <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[12px] font-medium leading-tight text-[#26324a]">{label}</span>
                {footnote && (
                    <span className="text-[10.5px] leading-tight text-[#8b97ab]">{footnote}</span>
                )}
            </span>
            <div className="flex flex-none items-center gap-1">
                <input
                    type="number"
                    min={0}
                    max={MAX_DAYS}
                    value={days || ""}
                    onChange={(e) => handleDaysChange(e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="h-[32px] w-[42px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6] disabled:bg-[#fafbfc] disabled:text-[#8b97ab]"
                />
                {/* "д." */}
                <span className="text-[11px] text-[#8b97ab]">д.</span>
                <input
                    type="number"
                    min={0}
                    max={MAX_HOURS}
                    value={hours || ""}
                    onChange={(e) => handleHoursChange(e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="h-[32px] w-[42px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6] disabled:bg-[#fafbfc] disabled:text-[#8b97ab]"
                />
                <span className="text-[11px] text-[#8b97ab]">ч.</span>
                <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes || ""}
                    onChange={(e) => handleMinutesChange(e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="h-[32px] w-[42px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6] disabled:bg-[#fafbfc] disabled:text-[#8b97ab]"
                />
                <span className="text-[11px] text-[#8b97ab]">м.</span>
            </div>
        </div>
    );
}