// Чекбокс-плашка с самодельным квадратиком-галочкой
import type {ReactNode} from "react";
import {Check} from "lucide-react";

interface CheckBoxOneProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /* Подпись рядом с чекбоксом */
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    /** "danger" - красная галочка и красноватая плашка во включённом состоянии
     * (фильтры вроде "Только с просрочкой"). "brand" - фирменный синий #2f68f5 (как у кнопок
     * и вкладок реестров). По умолчанию - прежний акцентный цвет. */
    tone?: "accent" | "danger" | "brand";
}

const TONE = {
    accent: {
        box: "#4e57d6",
        plateOn: "",
    },
    brand: {
        box: "#2f68f5",
        plateOn: "",
    },
    danger: {
        box: "#c0392b",
        plateOn: "!border-[#f3c9c2] !bg-[#fdf6f5] !text-[#c0392b] hover:!bg-[#fbeeec]",
    },
} as const;

export function CheckBoxOne({
                                checked,
                                onChange,
                                children,
                                className = "",
                                disabled,
                                tone = "accent",
                            }: CheckBoxOneProps) {
    const color = TONE[tone];

    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            disabled={disabled}
            className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] select-none disabled:opacity-60 disabled:cursor-default disabled:hover:bg-white ${
                checked ? color.plateOn : ""
            } ${className}`}
        >
            <span
                className="w-5 h-5 flex-none rounded-md grid place-items-center border-[1.5px]"
                style={{
                    borderColor: checked ? color.box : "#cbd3df",
                    background: checked ? color.box : "white",
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
