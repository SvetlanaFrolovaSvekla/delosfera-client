// Read-only блок норматива (уже установленное значение по запущенному согласованию)
import React from "react";

export type NormPhaseStatus = "passed" | "current" | "upcoming";

interface NormBlockViewProps {
    label: string;
    value: number;
    phaseStatus: NormPhaseStatus;
    blockRef?: React.Ref<HTMLDivElement>;
}

const PHASE_STYLES: Record<NormPhaseStatus, { border: string; bg: string; text: string }> = {
    passed: {
        border: "border-[#34a853]",
        bg: "bg-[#e8f6ec]",
        text: "text-[#1e8e3e]",
    },
    current: {
        border: "border-[#a3adbd]",
        bg: "bg-[#f1f2f6]",
        text: "text-[#3a4560]",
    },
    upcoming: {
        border: "border-[#e5e9f0]",
        bg: "bg-white",
        text: "text-[#8b97ab]",
    },
};

export function NormBlockView({label, value, phaseStatus, blockRef}: NormBlockViewProps) {
    const style = PHASE_STYLES[phaseStatus];

    return (
        <div
            ref={blockRef}
            className={`flex w-[280px] flex-none items-center justify-between gap-3 rounded-[12px] border-2 px-4 py-3 ${style.border} ${style.bg}`}
        >
            <span className={`text-[12px] font-medium leading-tight ${style.text}`}>{label}</span>
            <span className={`text-[12.5px] font-semibold ${style.text}`}>{value} ч.</span>
        </div>
    );
}