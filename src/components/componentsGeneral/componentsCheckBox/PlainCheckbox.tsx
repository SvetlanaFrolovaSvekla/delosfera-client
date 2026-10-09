// Обычный чекбокс: нативный input + та же галочка-квадратик, что в CheckBoxOne, но без плашки-кнопки
import type {ReactNode} from "react";
import {Check} from "lucide-react";

interface PlainCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    children?: ReactNode;
    disabled?: boolean;
    className?: string;
    /** "accent" (по умолчанию) - прежний индиго; "brand" - фирменный синий #2f68f5, как у CheckBoxOne. */
    tone?: "accent" | "brand";
    /** Подпись для скринридера, когда у чекбокса нет видимого текста (чекбоксы в строках таблиц). */
    ariaLabel?: string;
}

const TONE_COLOR = {
    accent: "#4e57d6",
    brand: "#2f68f5",
} as const;

export function PlainCheckbox({checked, onChange, children, disabled, className = "", tone = "accent", ariaLabel}: PlainCheckboxProps) {
    const color = TONE_COLOR[tone];
    return (
        <label
            className={`relative  inline-flex items-center gap-2 cursor-pointer select-none text-[12.5px] text-[#3a4560] ${
                disabled ? "opacity-60 cursor-default" : ""
            } ${className}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                aria-label={ariaLabel}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only peer"
            />
            <span
                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#cbddff]"
                style={{
                    borderColor: checked ? color : "#cbd3df",
                    background: checked ? color : "white",
                }}
            >
                <Check
                    className="w-[13px] h-[13px] text-white"
                    strokeWidth={3}
                    style={{opacity: checked ? 1 : 0}}
                />
            </span>
            {children}
        </label>
    );
}