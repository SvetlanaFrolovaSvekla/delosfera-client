// Обычный чекбокс: нативный input + та же галочка-квадратик, что в CheckBoxOne, но без плашки-кнопки
import type {ReactNode} from "react";
import {Check} from "lucide-react";

interface PlainCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    children?: ReactNode;
    disabled?: boolean;
    className?: string;
}

export function PlainCheckbox({checked, onChange, children, disabled, className = ""}: PlainCheckboxProps) {
    return (
        <label
            className={`inline-flex items-center gap-2 cursor-pointer select-none text-[12.5px] text-[#3a4560] ${
                disabled ? "opacity-60 cursor-default" : ""
            } ${className}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only peer"
            />
            <span
                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#cbddff]"
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
        </label>
    );
}