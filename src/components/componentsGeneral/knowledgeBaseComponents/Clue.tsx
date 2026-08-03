// Компонента для подсказок, модуля База знаний
import type {ReactNode} from "react";
import {Info} from "lucide-react";

interface ClueProps {
    children: ReactNode;
    className?: string;
    icon?: boolean; // показывать ли иконку слева
}

export function Clue({children, className = "", icon = true}: ClueProps) {
    return (
        <div
            className={`flex items-start gap-2 p-[11px_13px] bg-[#f6f8fb] border border-[#eef2f7] rounded-[10px] text-[11.5px] text-[#55617a] leading-[1.5] ${className}`}
        >
            {icon && (
                <Info className="w-[14px] h-[14px] flex-none mt-[1px] text-[#a3adbd]" strokeWidth={2}/>
            )}
            <span>{children}</span>
        </div>
    );
}