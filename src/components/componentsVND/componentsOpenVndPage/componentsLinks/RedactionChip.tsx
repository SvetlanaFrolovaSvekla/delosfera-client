import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

export function RedactionChip({active, onClick, label, count, current, tooltip}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    current?: boolean;
    tooltip?: string;
}) {
    const chip = (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors ${
                active
                    ? "bg-white text-[#4e57d6] shadow-[0_1px_3px_rgba(15,27,45,.1)]"
                    : count > 0 ? "text-[#3a4560] hover:bg-white/70" : "text-[#a3adbd] hover:bg-white/70"
            }`}
        >
            {current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>}
            {label}
            <span className={`min-w-[18px] rounded-full px-1.5 text-center text-[10.5px] leading-[16px] ${
                active ? "bg-[#ececfc] text-[#4e57d6]" : count > 0 ? "bg-[#e9edf3] text-[#55617a]" : "bg-transparent text-[#c3ccd8]"
            }`}>
                {count}
            </span>
        </button>
    );
    return tooltip ? <Tooltip content={tooltip} side="top">{chip}</Tooltip> : chip;
}