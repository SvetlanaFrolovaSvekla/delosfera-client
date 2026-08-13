// Верхняя часть рубрикатора
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import type {Side} from "@/components/componentsGeneral/Tooltip.tsx";
import {X} from "lucide-react";

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
    helpContent?: string;
    helpSide?: Side;
}

export function ModalHeader({title, onClose, helpContent, helpSide = "bottom"}: ModalHeaderProps) {
    return (
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-[#eef2f7] flex-none">
            {helpContent && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <HelpTooltip content={helpContent} side={helpSide}/>
                </div>
            )}

            <h3 className="m-0 text-[15px] font-semibold text-[#1c2740] text-center">{title}</h3>

            <button
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
            >
                <X className="w-[16px] h-[16px]" strokeWidth={2}/>
            </button>
        </div>
    );
}