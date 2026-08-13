// Значок вопросительного знака с тултипом (подсказка)
import {type Side, Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpCircle} from "lucide-react";

interface HelpTooltipProps {
    content: string;
    side?: Side;
    className?: string;
}

export function HelpTooltip({content, side = "bottom", className = ""}: HelpTooltipProps) {
    return (
        <Tooltip content={content} side={side}>
            <button
                type="button"
                className={`w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer ${className}`}
            >
                <HelpCircle className="w-[16px] h-[16px]" strokeWidth={2}/>
            </button>
        </Tooltip>
    );
}