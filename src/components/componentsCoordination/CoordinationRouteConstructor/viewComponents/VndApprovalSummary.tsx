// Сводка по процессу согласования: статус, инициатор, прогресс резолюций, дата запуска
import {useMemo} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {formatDate, getElapsedLabel} from "@/utils/dateUtils.ts";
import {PHASE_LABELS, PROCESS_STATUS_META, type ApprovalPhase} from "@/constants/coordinationParams.ts";
import {User, Calendar, CheckCircle2, Hourglass} from "lucide-react";

interface VndApprovalSummaryProps {
    process: ApprovalProcessResponse;
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
    const navigate = useNavigate();
    const isMeInitiator = process.initiatorUserId === user?.id;

    const handleInitiatorClick = () => {
        if (isMeInitiator) {
            navigate("/profile");
        } else {
            navigate(`/profile/${process.initiatorUserId}`);
        }
    };

    const statusMeta = PROCESS_STATUS_META[process.status];
    const {resolved, total} = useMemo(() => getResolvedCount(process), [process]);
    const pending = total - resolved;
    const relevantPhase = useMemo(() => getRelevantPhase(process), [process]);
    const elapsedLabel = useMemo(() => getElapsedLabel(process.createdAt), [process.createdAt]);
    const initiatorInitials = useMemo(() => getInitials(process.initiatorName), [process.initiatorName]);

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
                <div className="flex items-center gap-2.5">
                    <User size={15} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[12.5px] text-[#8b97ab]">Инициатор:</span>
                    <button
                        type="button"
                        onClick={handleInitiatorClick}
                        className="flex items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white py-1 pl-1 pr-2.5 cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        <span
                            className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[var(--app-soft,_#ececfc)] text-[11px] font-bold text-[var(--app-accent,_#4e57d6)]">
                            {initiatorInitials}
                        </span>
                        <span className="flex flex-col items-start">
                            <span className="text-[12.5px] font-semibold text-[#0f1b2d]">
                                {process.initiatorName}
                            </span>
                            {process.initiatorPosition && (
                                <span className="text-[10.5px] text-[#8b97ab]">
                                    {process.initiatorPosition}
                                </span>
                            )}
                        </span>
                        {isMeInitiator && (
                            <span
                                className="ml-0.5 inline-flex items-center self-start rounded-full px-2 py-[2px] text-[10.5px] font-semibold"
                                style={{color: "#2f68f5", backgroundColor: "#e9f0ff"}}
                            >
                                я
                            </span>
                        )}
                    </button>
                </div>

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
                    <Calendar size={15} className="flex-none text-[#8b97ab]"/>
                    <span className="text-[#8b97ab]">Процесс согласования редакции запущен:</span>
                    <span className="font-medium">{formatDate(process.createdAt)}</span>
                    <span className="text-[#8b97ab]">({elapsedLabel} назад)</span>
                </div>
            </div>

            {/* Резолюции текущего этапа — сгруппированы в два мини-блока: поставленные и ожидающие */}
            <div className="mt-3 border-t border-[#eef0f5] pt-3">
                <div className="mb-2 text-[11.5px] font-medium text-[#8b97ab]">
                    Резолюций на данном этапе выставлено:
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2.5 rounded-[10px] bg-[#e2f4ea] px-3.5 py-2">
                        <CheckCircle2 size={16} className="flex-none text-[#1c7a4d]"/>
                        <span className="text-[14px] font-bold leading-none text-[#1c7a4d]">{resolved}</span>
                        <span className="text-[12px] font-medium text-[#1c7a4d]">согласовано</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#c3c9d4]">/</span>
                    <div className="flex items-center gap-2.5 rounded-[10px] bg-[#fbeecf] px-3.5 py-2">
                        <Hourglass size={16} className="flex-none text-[#b3730a]"/>
                        <span className="text-[14px] font-bold leading-none text-[#b3730a]">{pending}</span>
                        <span className="text-[12px] font-medium text-[#b3730a]">ожидает решения</span>
                    </div>
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