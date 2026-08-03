// Сводка по процессу согласования: статус, инициатор, прогресс резолюций, дата запуска
import {useMemo} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {formatDate, getElapsedLabel} from "@/utils/dateUtils.ts";
import {PHASE_LABELS, PROCESS_STATUS_META, type ApprovalPhase} from "@/constants/coordinationParams.ts";
import {User, Calendar, CheckCircle2} from "lucide-react";

interface VndApprovalSummaryProps {
    process: ApprovalProcessResponse;
}

// Считаем, сколько согласующих уже поставили резолюцию на текущем круге
function getResolvedCount(process: ApprovalProcessResponse): { resolved: number; total: number } {
    const isRepeatRound = process.status === "repeated";

    if (isRepeatRound) {
        const participating = process.stages.filter((s) => s.participatesInRepeat);
        const resolved = participating.filter((s) => s.repeatDecision !== "pending" && s.repeatDecision !== null);
        return {resolved: resolved.length, total: participating.length};
    }

    const resolved = process.stages.filter((s) => s.primaryDecision !== "pending");
    return {resolved: resolved.length, total: process.stages.length};
}

// Определяем фазу, чьи даты нужно показать под сводкой, по статусу процесса
function getRelevantPhase(process: ApprovalProcessResponse): ApprovalPhase {
    switch (process.status) {
        case "primary":
            return "primary";
        case "revision_needed":
            // Повторный круг ещё не начат — показываем его как предстоящий (даты будут "—")
            return "repeat";
        case "repeated":
            return "repeat";
        case "final_hold":
        case "approved":
            return "finalHold";
        case "cancelled":
        case "rejected":
            // Согласование прервано — показываем ту фазу, до которой реально дошли
            if (process.finalHoldStartedAt) return "finalHold";
            if (process.repeatStartedAt) return "repeat";
            return "primary";
        default:
            return "primary";
    }
}

export function VndApprovalSummary({process}: VndApprovalSummaryProps) {
    const {user} = useAuth();
    const isMeInitiator = process.initiatorUserId === user?.id;

    const statusMeta = PROCESS_STATUS_META[process.status];
    const {resolved, total} = useMemo(() => getResolvedCount(process), [process]);
    const relevantPhase = useMemo(() => getRelevantPhase(process), [process]);
    const elapsedLabel = useMemo(() => getElapsedLabel(process.createdAt), [process.createdAt]);

    const phaseLabels = PHASE_LABELS[relevantPhase];
    const phaseStartedAt =
        relevantPhase === "primary"
            ? process.primaryStartedAt
            : relevantPhase === "repeat"
                ? process.repeatStartedAt
                : process.finalHoldStartedAt;
    const phaseDeadlineAt =
        relevantPhase === "primary"
            ? process.primaryDeadlineAt
            : relevantPhase === "repeat"
                ? process.repeatDeadlineAt
                : process.finalHoldDeadlineAt;

    return (
        <div className="mb-5 rounded-[14px] border border-[#e5e9f0] bg-white px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                    <div className="flex items-center gap-[7px] text-[12.5px] text-[#3a4560]">
                        <span className="text-[#8b97ab]"> Текущий статус согласования:</span>
                        <span
                            className={`inline-flex items-center rounded-full px-[11px] py-1 text-[12px] font-semibold ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-[7px] text-[12.5px] text-[#3a4560]">
                    <User size={15} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[#8b97ab]">Инициатор:</span>
                    {isMeInitiator ? (
                        <span
                            className="inline-flex items-center rounded-full px-[11px] py-1 text-[12px] font-semibold"
                            style={{color: "#2f68f5", backgroundColor: "#e9f0ff"}}
                        >
                            {process.initiatorName} (я)
                        </span>
                    ) : (
                        <span className="font-medium">{process.initiatorName}</span>
                    )}
                </div>

                <div className="flex items-center gap-[7px] text-[12.5px] text-[#3a4560]">
                    <CheckCircle2 size={15} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[#8b97ab]">Резолюций на данном этапе поставлено:</span>
                    <span className="font-medium">{resolved} из {total}</span>
                </div>

                <div className="flex items-center gap-[7px] text-[12.5px] text-[#3a4560]">
                    <Calendar size={15} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[#8b97ab]">Процесс согласования редакции запущен:</span>
                    <span className="font-medium">{formatDate(process.createdAt)}</span>
                    <span className="text-[#8b97ab]">({elapsedLabel} назад)</span>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#eef0f5] pt-3">
                <div className="flex items-center gap-[7px] text-[12.5px] text-[#3a4560]">
                    <span className="text-[#8b97ab]">{phaseLabels.started}:</span>
                    <span className="font-medium">{phaseStartedAt ? formatDate(phaseStartedAt) : "—"}</span>
                </div>
                <div className="flex items-center gap-[7px] text-[12.5px] text-[#3a4560]">
                    <span className="text-[#8b97ab]">{phaseLabels.deadline}:</span>
                    <span className="font-medium">{phaseDeadlineAt ? formatDate(phaseDeadlineAt) : "—"}</span>
                </div>
            </div>
        </div>
    );
}