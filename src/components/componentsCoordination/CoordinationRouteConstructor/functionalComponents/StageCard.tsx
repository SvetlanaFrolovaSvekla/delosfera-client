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

export function StageCard({stage, onOpenPicker, onRemove, cardRef}: StageCardProps) {
    const Icon = STAGE_ICONS[stage.kind];
    const isCustom = stage.kind === ApprovalStageKind.Custom;

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[210px] flex-none flex-col gap-3 rounded-[14px] bg-white px-4  py-8 shadow-[0_1px_3px_rgba(20,25,45,0.05)] ${
                isCustom ? "border border-[#e5e9f0]" : "border-2 border-[#34a853]"
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
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#f0f1fb] text-[#4e57d6]">
                    <Icon size={16}/>
                </div>
                <span className="text-[12.5px] font-semibold leading-tight text-[#26324a]">
                    {STAGE_LABELS[stage.kind]}
                </span>
            </div>

            <button
                type="button"
                onClick={onOpenPicker}
                className="flex h-[36px] w-full cursor-pointer items-center justify-between rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2 text-left text-[12px] outline-none hover:border-[#4e57d6]/50 focus:border-[#4e57d6]"
            >
                <span className={`truncate ${stage.approverName ? "text-[#26324a]" : "text-[#a3adbd]"}`}>
                    {stage.approverName ?? "Выбрать согласующего…"}
                </span>
                <ChevronDown size={14} className="flex-none text-[#8b97ab]"/>
            </button>
        </div>
    );
}