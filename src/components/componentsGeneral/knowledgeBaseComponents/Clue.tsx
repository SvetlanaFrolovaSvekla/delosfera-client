// Компонента для подсказок, модуля База знаний
import type {ReactNode} from "react";
import {Info, type LucideIcon} from "lucide-react";

interface ClueProps {
    children: ReactNode;
    className?: string;
    icon?: boolean | LucideIcon; // true/false — показать дефолтную (Info) или скрыть; либо своя иконка
}

export function Clue({children, className = "", icon = true}: ClueProps) {
    const IconComponent = icon === true ? Info : icon === false ? null : icon;

    return (
        <div
            className={`flex items-start gap-2 p-[11px_13px] bg-[#f6f8fb] border border-[#eef2f7] rounded-[10px] text-[11.5px] text-[#55617a] leading-[1.5] ${className}`}
        >
            {IconComponent && (
                <IconComponent className="w-[14px] h-[14px] flex-none mt-[1px] text-[#a3adbd]" strokeWidth={2}/>
            )}
            <span>{children}</span>
        </div>
    );
}