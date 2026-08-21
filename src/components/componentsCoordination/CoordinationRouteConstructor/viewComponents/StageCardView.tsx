// Read-only карточка этапа уже построенного маршрута согласования
import type {ApprovalStageResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    STAGE_DECISION_META,
    STAGE_ICONS,
    STAGE_KIND_RESPONSE_TO_REQUEST,
    STAGE_LABELS,
} from "@/constants/coordinationParams.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

function getInitials(fullName: string): string {
    return fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

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

    // Показываем самое актуальное решение по фазам: финальная выдержка > повторное > первичное
    const decision = stage.finalHoldDecision ?? stage.repeatDecision ?? stage.primaryDecision;
    const decisionMeta = STAGE_DECISION_META[decision];
    const comment = stage.finalHoldDecision
        ? stage.finalHoldComment
        : stage.repeatDecision
            ? stage.repeatComment
            : stage.primaryComment;
    const decidedAt = stage.finalHoldDecision
        ? stage.finalHoldDecidedAt
        : stage.repeatDecision
            ? stage.repeatDecidedAt
            : stage.primaryDecidedAt;

    // Пока решение не принято, а это этап текущего пользователя — показываем отдельный жёлтый статус
    const isPendingForCurrentUser = isCurrentUserStage && decision === "pending";
    const isAutoTimeout = decision === "auto_approved_timeout";

    const badgeLabel = isPendingForCurrentUser ? "В рассмотрении (мой этап)" : decisionMeta.label;
    const badgeClass = isPendingForCurrentUser
        ? "bg-[#fdf3dc] text-[#a97313]"
        : decisionMeta.badgeClass;

    // Фиксированные этапы — всегда зелёная рамка, доп. этапы — серая,
    // но если это этап текущего пользователя и решение ещё не принято — перекрываем жёлтой
    const borderClass = isPendingForCurrentUser
        ? "border-[#e3b23c]"
        : isCustom
            ? "border-slate-200"
            : "border-[#34a853]";

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[220px] flex-none flex-col gap-3 rounded-2xl border-2 bg-white p-4 shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)] ${borderClass} ${
                isPendingForCurrentUser ? "bg-[#fffdf7]" : ""
            }`}
        >
            <div className="flex items-center gap-2">
                <div
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${
                        isCustom ? "bg-[#f0f1fb] text-[#4e57d6]" : "bg-[#efeafe] text-[#7a5ce0]"
                    }`}
                >
                    <Icon size={16}/>
                </div>
                <span className="text-[12.5px] font-semibold leading-tight text-[#26324a]">
                    {STAGE_LABELS[kind]}
                </span>
            </div>

            <div className="flex h-[36px] w-full items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2 text-[12px]">
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                        {getInitials(stage.approverName)}
                    </span>
                    <span className="truncate text-[#26324a]">{stage.approverName}</span>
                </span>
            </div>

            <span className={`inline-flex w-fit items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                {badgeLabel}
            </span>

            {isAutoTimeout && decidedAt && (
                <div className="text-[11px] text-[#8b97ab]">
                    Автоматически {formatDateTime(decidedAt)} — согласующий не отреагировал в срок
                </div>
            )}

            {comment && (
                <div className="text-[11.5px] leading-snug text-[#6b7488]">
                    {comment}
                </div>
            )}
        </div>
    );
}