// Блок с нормативными значениями для согласования в модалке конструктора маршрутов
import React from "react";

interface NormBlockProps {
    label: string;
    value: number | "";
    onChange: (value: number | "") => void;
    blockRef?: React.Ref<HTMLDivElement>;
}

export function NormBlock({label, value, onChange, blockRef}: NormBlockProps) {
    return (
        <div
            ref={blockRef}
            className="flex w-[280px] flex-none items-center justify-between gap-3 rounded-[12px] border border-[#e5e9f0] bg-[#f9fafc] px-4 py-3"
        >
            <span className="text-[12px] font-medium leading-tight text-[#6b7488]">{label}</span>
            <div className="flex flex-none items-center gap-1">
                <input
                    type="number"
                    min={1}
                    value={value}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
                    className="h-[32px] w-[64px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">ч.</span>
            </div>
        </div>
    );
}