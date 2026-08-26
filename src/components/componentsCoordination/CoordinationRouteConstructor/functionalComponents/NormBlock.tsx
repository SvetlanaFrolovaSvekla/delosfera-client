// Блок с нормативными значениями для согласования в модалке конструктора маршрутов
import React from "react";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {MAX_DEADLINE_MINUTES} from "@/constants/coordinationParams.ts";

interface NormBlockProps {
    label: string;
    /** Суммарное значение норматива в минутах */
    value: number | "";
    onChange: (value: number | "") => void;
    blockRef?: React.Ref<HTMLDivElement>;
    helpText?: string;
}

const MAX_DAYS = Math.floor(MAX_DEADLINE_MINUTES / (24 * 60)); // 90

export function NormBlock({label, value, onChange, blockRef, helpText}: NormBlockProps) {
    const totalMinutes = value === "" ? 0 : value;
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    // Верхняя граница - MAX_DEADLINE_MINUTES (90 дней), см. constants/coordinationParams.ts.
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
        emit(clampTotal(newDays * 24 * 60 + hours * 60 + minutes));
    };

    const handleHoursChange = (raw: string) => {
        if (raw === "") {
            emit(clampTotal(days * 24 * 60 + minutes));
            return;
        }
        // Не ограничиваем сверху 23 - если ввели 30 часов, normalize произойдёт
        // сам собой на следующем рендере (days/hours пересчитаются из totalMinutes).
        const parsed = Math.floor(Number(raw));
        const newHours = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
        emit(clampTotal(days * 24 * 60 + newHours * 60 + minutes));
    };

    const handleMinutesChange = (raw: string) => {
        if (raw === "") {
            emit(clampTotal(days * 24 * 60 + hours * 60));
            return;
        }
        // Аналогично - не ограничиваем сверху 59, normalize сам пересчитает при рендере.
        const parsed = Math.floor(Number(raw));
        const newMinutes = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
        emit(clampTotal(days * 24 * 60 + hours * 60 + newMinutes));
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

            <span className="text-[12px] font-medium leading-tight text-[#26324a]">{label}</span>
            <div className="flex flex-none items-center gap-1">
                <input
                    type="number"
                    min={0}
                    max={MAX_DAYS}
                    value={days || ""}
                    onChange={(e) => handleDaysChange(e.target.value)}
                    placeholder="0"
                    className="h-[32px] w-[42px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">д.</span>
                <input
                    type="number"
                    min={0}
                    max={23}
                    value={hours || ""}
                    onChange={(e) => handleHoursChange(e.target.value)}
                    placeholder="0"
                    className="h-[32px] w-[42px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">ч.</span>
                <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes || ""}
                    onChange={(e) => handleMinutesChange(e.target.value)}
                    placeholder="0"
                    className="h-[32px] w-[42px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">м.</span>
            </div>
        </div>
    );
}