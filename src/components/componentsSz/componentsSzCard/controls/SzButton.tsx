// Кнопка карточки служебной записки: один набор вариантов вместо длинных строк классов в разметке.
import type {ButtonHTMLAttributes} from "react";

export type SzButtonVariant =
    | "primary" | "success" | "outline" | "muted" | "danger"
    | "dangerSolid" | "warning" | "warningSolid" | "brandSoft" | "successOutline";

export type SzButtonSize = "md" | "sm" | "xs";

const VARIANT: Record<SzButtonVariant, string> = {
    primary: "border-none bg-[#2f68f5] text-white hover:brightness-[1.06]",
    success: "border-none bg-[#1c7a4d] text-white hover:brightness-[1.06]",
    outline: "border border-[#e5e9f0] bg-white text-[#2f68f5] hover:bg-[#f6f8fb]",
    muted: "border border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]",
    danger: "border border-[#f1c9c2] bg-white text-[#c0392b] hover:bg-[#fbeae7]",
    dangerSolid: "border-none bg-[#c0392b] text-white hover:brightness-[1.06]",
    warning: "border border-[#f0dcae] bg-white text-[#b3730a] hover:bg-[#fdf3e0]",
    warningSolid: "border-none bg-[#8a5a00] text-white hover:brightness-[1.08]",
    brandSoft: "border border-[#cbddff] bg-[#f5f8ff] text-[#2f68f5] hover:bg-[#eaf1ff]",
    successOutline: "border border-[#e5e9f0] bg-white text-[#1c7a4d] hover:bg-[#e9f6ee]",
};

const SIZE: Record<SzButtonSize, string> = {
    md: "h-10 px-4 rounded-[10px] text-[13px]",
    sm: "h-9 px-4 rounded-[9px] text-[12.5px]",
    xs: "h-8 px-3 rounded-[8px] text-[12px] whitespace-nowrap",
};

// eslint-disable-next-line react-refresh/only-export-components
export function szButtonClass(variant: SzButtonVariant, size: SzButtonSize = "md"): string {
    return `inline-flex items-center justify-center font-semibold cursor-pointer disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]}`;
}

interface SzButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    variant?: SzButtonVariant;
    size?: SzButtonSize;
}

export function SzButton({variant = "muted", size = "md", className = "", ...rest}: SzButtonProps) {
    return <button type="button" className={`${szButtonClass(variant, size)} ${className}`} {...rest}/>;
}
