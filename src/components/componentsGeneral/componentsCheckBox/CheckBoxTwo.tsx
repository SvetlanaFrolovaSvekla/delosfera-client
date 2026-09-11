// Чекбокс-плашка на базе нативного <input type="checkbox"> (стилизован через accent-color) —
// вид как у "Только ни разу не актуализированные" на странице "Планирование актуализации"
// (ActualizationFilters). Проще CheckBoxOne и лучше подходит там, где важно оставить нативное
// поведение чекбокса (клавиатура, автозаполнение форм, тесты по role="checkbox").
import type {ReactNode} from "react";

interface CheckBoxTwoProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Подпись рядом с чекбоксом — текст и/или иконки (например, HelpTooltip) */
    children: ReactNode;
    className?: string;
    disabled?: boolean;
}

export function CheckBoxTwo({checked, onChange, children, className = "", disabled}: CheckBoxTwoProps) {
    return (
        <label
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] select-none ${
                disabled ? "opacity-60 cursor-default hover:bg-white" : ""
            } ${className}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="w-[15px] h-[15px] accent-[#4e57d6] cursor-pointer"
            />
            {children}
        </label>
    );
}
