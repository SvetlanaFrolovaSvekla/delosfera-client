// Чекбокс-плашка с самодельным квадратиком-галочкой (не нативный input) — вид как у
// "Только связанные со мной" на странице ВНД (VndFilters). Целиком кликабельная кнопка,
// поэтому удобна там, где нужен явный hover/focus на всей плашке, а не только на квадратике.
import type {ReactNode} from "react";
import {Check} from "lucide-react";

interface CheckBoxOneProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Подпись рядом с чекбоксом — текст и/или иконки (например, HelpTooltip) */
    children: ReactNode;
    className?: string;
    disabled?: boolean;
}

export function CheckBoxOne({checked, onChange, children, className = "", disabled}: CheckBoxOneProps) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            disabled={disabled}
            className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] select-none disabled:opacity-60 disabled:cursor-default disabled:hover:bg-white ${className}`}
        >
            <span
                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                style={{
                    borderColor: checked ? "#4e57d6" : "#cbd3df",
                    background: checked ? "#4e57d6" : "white",
                }}
            >
                <Check
                    className="w-[13px] h-[13px] text-white"
                    strokeWidth={3}
                    style={{opacity: checked ? 1 : 0}}
                />
            </span>
            {children}
        </button>
    );
}
