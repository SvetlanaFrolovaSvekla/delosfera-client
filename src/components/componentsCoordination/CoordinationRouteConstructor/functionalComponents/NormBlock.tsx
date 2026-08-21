// Блок с нормативными значениями для согласования в модалке конструктора маршрутов
import React from "react";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";

interface NormBlockProps {
    label: string;
    /** Суммарное значение норматива в минутах */
    value: number | "";
    onChange: (value: number | "") => void;
    blockRef?: React.Ref<HTMLDivElement>;
    helpText?: string;
}

export function NormBlock({label, value, onChange, blockRef, helpText}: NormBlockProps) {
    const totalMinutes = value === "" ? 0 : value;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const handleHoursChange = (raw: string) => {
        if (raw === "") {
            onChange(minutes > 0 ? minutes : "");
            return;
        }
        const newHours = Math.max(0, Math.floor(Number(raw)));
        const next = newHours * 60 + minutes;
        onChange(next > 0 ? next : "");
    };

    const handleMinutesChange = (raw: string) => {
        if (raw === "") {
            onChange(hours > 0 ? hours * 60 : "");
            return;
        }
        // Специально не ограничиваем сверху 59 - если ввели 90, normalize произойдёт
        // сам собой на следующем рендере (hours/minutes пересчитаются из totalMinutes).
        const newMinutes = Math.max(0, Math.floor(Number(raw)));
        const next = hours * 60 + newMinutes;
        onChange(next > 0 ? next : "");
    };

    return (
        <div
            ref={blockRef}
            className="relative flex w-[280px] flex-none items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]"
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
                    value={hours || ""}
                    onChange={(e) => handleHoursChange(e.target.value)}
                    placeholder="0"
                    className="h-[32px] w-[46px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">ч.</span>
                <input
                    type="number"
                    min={0}
                    value={minutes || ""}
                    onChange={(e) => handleMinutesChange(e.target.value)}
                    placeholder="0"
                    className="h-[32px] w-[46px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">м.</span>
            </div>
        </div>
    );
}