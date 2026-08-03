// Read-only карточка этапа уже построенного маршрута согласования
import type {ApprovalStageResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    STAGE_DECISION_META,
    STAGE_ICONS,
    STAGE_KIND_RESPONSE_TO_REQUEST,
    STAGE_LABELS,
} from "@/constants/coordinationParams.ts";

interface StageCardViewProps {
    stage: ApprovalStageResponse;
    cardRef: (el: HTMLDivElement | null) => void;
    /** true, если это этап текущего залогиненного пользователя — подсвечивает карточку и статус */
    isCurrentUserStage?: boolean;
}

export function StageCardView({stage, cardRef, isCurrentUserStage}: StageCardViewProps) {
    const kind = STAGE_KIND_RESPONSE_TO_REQUEST[stage.kind];
    const Icon = STAGE_ICONS[kind];
    const isCustom = kind === "Custom";

    // Показываем актуальное решение: если есть повторное — берём его, иначе первичное
    const decision = stage.repeatDecision ?? stage.primaryDecision;
    const decisionMeta = STAGE_DECISION_META[decision];
    const comment = stage.repeatDecision ? stage.repeatComment : stage.primaryComment;

    // Пока решение не принято, а это этап текущего пользователя — показываем отдельный жёлтый статус
    const isPendingForCurrentUser = isCurrentUserStage && decision === "pending";

    const badgeLabel = isPendingForCurrentUser ? "В рассмотрении (мой этап)" : decisionMeta.label;
    const badgeClass = isPendingForCurrentUser
        ? "bg-[#fdf3dc] text-[#a97313]"
        : decisionMeta.badgeClass;

    // Фиксированные этапы — всегда зелёная рамка, доп. этапы — серая,
    // но если это этап текущего пользователя и решение ещё не принято — перекрываем жёлтой
    const borderClass = isPendingForCurrentUser
        ? "border-[#e3b23c]"
        : isCustom
            ? "border-[#e5e9f0]"
            : "border-[#34a853]";

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[210px] flex-none flex-col gap-3 rounded-[14px] border-2 bg-white px-4 py-6 shadow-[0_1px_3px_rgba(20,25,45,0.05)] ${borderClass} ${
                isPendingForCurrentUser ? "bg-[#fffdf7]" : ""
            }`}
        >
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#f0f1fb] text-[#4e57d6]">
                    <Icon size={16}/>
                </div>
                <span className="text-[12.5px] font-semibold leading-tight text-[#26324a]">
                    {STAGE_LABELS[kind]}
                </span>
            </div>

            <div className="text-[12px] text-[#26324a] truncate">
                {stage.approverName}
            </div>

            <span className={`inline-flex w-fit items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                {badgeLabel}
            </span>

            {comment && (
                <div className="text-[11.5px] leading-snug text-[#6b7488]">
                    {comment}
                </div>
            )}
        </div>
    );
}