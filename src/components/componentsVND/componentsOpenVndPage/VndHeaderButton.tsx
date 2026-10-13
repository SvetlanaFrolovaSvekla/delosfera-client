// Маленькая кнопка в шапке открытого ВНД (глазик просмотра, звёздочка избранного,
// "+ Предложения по ВНД") - одна высота, скругление и рамка, отличаются только цветом.
import type {ReactNode} from "react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

export type VndHeaderButtonVariant = "accent" | "favorite" | "favoriteActive" | "proposal";

const VARIANT_CLASS: Record<VndHeaderButtonVariant, string> = {
    accent: "border-[#d7dee8] bg-white text-[#3a4560] hover:border-[#4e57d6]/40 hover:bg-[#ececfc] hover:text-[#4e57d6]",
    favorite: "border-[#d7dee8] bg-white text-[#55617a] hover:border-[#f3d48a] hover:bg-[#fffaf0] hover:text-[#a86b00]",
    favoriteActive: "border-[#f3d48a] bg-[#fff8e6] text-[#a86b00] hover:bg-[#fff1cc]",
    proposal: "border-[#f0dcae] bg-[#fffaf0] text-[#9a6408] hover:border-[#e0b95c] hover:bg-[#fff3d6]",
};

interface VndHeaderButtonProps {
    tooltip: string;
    icon: ReactNode;
    onClick: () => void;
    /** Текст рядом с иконкой; без него кнопка квадратная 28×28 */
    label?: ReactNode;
    variant?: VndHeaderButtonVariant;
    pressed?: boolean;
}

export function VndHeaderButton({tooltip, icon, onClick, label, variant = "accent", pressed}: VndHeaderButtonProps) {
    return (
        <Tooltip content={tooltip} side="bottom">
            <button
                type="button"
                onClick={onClick}
                aria-pressed={pressed}
                className={`shrink-0 inline-flex h-7 items-center justify-center gap-1.5 rounded-[9px] border text-[12px] font-semibold cursor-pointer transition-colors ${
                    label ? "px-2" : "w-7"
                } ${VARIANT_CLASS[variant]}`}
            >
                {icon}
                {label}
            </button>
        </Tooltip>
    );
}
