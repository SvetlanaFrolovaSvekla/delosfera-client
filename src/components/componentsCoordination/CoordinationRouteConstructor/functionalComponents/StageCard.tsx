// Карточка этапа при согласовании
import {ApprovalStageKind} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {STAGE_ICONS, STAGE_LABELS} from "@/constants/coordinationParams.ts";
import {ChevronDown, X} from "lucide-react";
import type {StageDraft} from "@/hooks/coordinationHooks/useStageDrafts.ts";

interface StageCardProps {
    stage: StageDraft;
    onOpenPicker: () => void;
    onRemove?: () => void;
    cardRef: (el: HTMLDivElement | null) => void;
}

function getInitials(fullName: string): string {
    return fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function StageCard({stage, onOpenPicker, onRemove, cardRef}: StageCardProps) {
    const Icon = STAGE_ICONS[stage.kind];
    const isCustom = stage.kind === ApprovalStageKind.Custom;

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[220px] flex-none flex-col gap-3 rounded-2xl p-4 ${
                isCustom
                    ? "border border-slate-200 bg-white shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]"
                    : "border border-[#c9b6f5] bg-gradient-to-b from-[#faf8ff] to-white shadow-[0_2px_5px_-2px_rgba(122,92,224,0.28)]"
            }`}
        >
            {isCustom && onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="cursor-pointer absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#e0473e] text-white shadow-sm transition-transform hover:scale-110"
                >
                    <X size={11} strokeWidth={3}/>
                </button>
            )}

            <div className="flex items-center gap-2">
                <div
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${
                        isCustom ? "bg-[#f0f1fb] text-[#4e57d6]" : "bg-[#efeafe] text-[#7a5ce0]"
                    }`}
                >
                    <Icon size={16}/>
                </div>
                <span className="text-[12.5px] font-semibold leading-tight text-[#26324a]">
                    {STAGE_LABELS[stage.kind]}
                </span>
            </div>

            <button
                type="button"
                onClick={onOpenPicker}
                className="flex h-[36px] w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2 text-left text-[12px] outline-none hover:border-[#4e57d6]/50 focus:border-[#4e57d6]"
            >
                {stage.approverName ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                            {getInitials(stage.approverName)}
                        </span>
                        <span className="truncate text-[#26324a]">{stage.approverName}</span>
                    </span>
                ) : (
                    <span className="text-[#a3adbd] text-[12px]">Выбрать согласующего…</span>
                )}
                <ChevronDown size={14} className="flex-none text-[#8b97ab]"/>
            </button>
        </div>
    );
}