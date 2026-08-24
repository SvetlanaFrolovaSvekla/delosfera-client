// Read-only маршрут уже запущенного/завершённого согласования
import {useMemo} from "react";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {useApprovalRouteLines} from "@/hooks/coordinationHooks/useApprovalRouteLines.ts";
import {StageCardView} from "./StageCardView";
import {NormBlockView, type NormPhaseStatus} from "./NormBlockView";
import {ArrowDown, ArrowLeft} from "lucide-react";
import {getElapsedLabel} from "@/utils/dateUtils.ts";

interface VndApprovalRouteViewProps {
    process: ApprovalProcessResponse;
    /** id этапа текущего пользователя — если задан, карточка этого этапа подсвечивается как "В рассмотрении" */
    highlightStageId?: number;
}

// Статус фазы «Первичное согласование»
function getPrimaryPhaseStatus(process: ApprovalProcessResponse): NormPhaseStatus {
    if (process.status === "primary") return "current";
    return "passed";
}

// Статус фазы «Повторное согласование»
function getRepeatPhaseStatus(process: ApprovalProcessResponse): NormPhaseStatus {
    if (process.status === "repeated") return "current";
    if (process.repeatStartedAt) return "passed";
    return "upcoming";
}

// Статус фазы «Финальная выдержка»
function getFinalHoldPhaseStatus(process: ApprovalProcessResponse): NormPhaseStatus {
    if (process.status === "final_hold") return "current";
    if (process.finalHoldStartedAt) return "passed";
    return "upcoming";
}

// Сколько времени осталось до дедлайна фазы (или "просрочено" / "—")
function getRemainingLabel(deadlineAt: string | null | undefined): string {
    if (!deadlineAt) return "—";

    const diffMs = new Date(deadlineAt).getTime() - Date.now();
    if (diffMs <= 0) return "просрочено";

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} дн`);
    if (hours > 0) parts.push(`${hours} ч`);
    if (days === 0 && minutes > 0) parts.push(`${minutes} мин`);

    return parts.length > 0 ? parts.join(" ") : "меньше минуты";
}

interface CurrentPhaseHintProps {
    startedAt: string | null | undefined;
    deadlineAt: string | null | undefined;
}

// Подсказка "Текущий этап" со стрелочкой, выводится правее блока активной фазы
function CurrentPhaseHint({startedAt, deadlineAt}: CurrentPhaseHintProps) {
    return (
        <div className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap">
            <ArrowLeft size={16} className="flex-none text-[#2f68f5]"/>
            <div className="flex flex-col text-[11.5px] leading-[1.5]">
                <span className="font-semibold text-[#2f68f5]">Текущий этап</span>
                <span className="text-[#8b97ab]">Прошло: {startedAt ? getElapsedLabel(startedAt) : "—"}</span>
                <span className="text-[#8b97ab]">Осталось: {getRemainingLabel(deadlineAt)}</span>
            </div>
        </div>
    );
}

export function VndApprovalRouteView({process, highlightStageId}: VndApprovalRouteViewProps) {
    const stagesWithLocalId = useMemo(
        () => process.stages.map((s) => ({...s, localId: String(s.id)})),
        [process.stages],
    );

    const primaryPhaseStatus = useMemo(() => getPrimaryPhaseStatus(process), [process]);
    const repeatPhaseStatus = useMemo(() => getRepeatPhaseStatus(process), [process]);
    const finalHoldPhaseStatus = useMemo(() => getFinalHoldPhaseStatus(process), [process]);

    const {funnelWrapperRef, targetRef, cardsScrollRef, paths, recomputePaths, registerStageRef} =
        useApprovalRouteLines(stagesWithLocalId);

    return (
        <div
            ref={funnelWrapperRef}
            className="relative rounded-[16px] border border-[#e5e9f0] bg-[#fbfcfe] bg-[radial-gradient(#e4e9f1_1px,transparent_1px)] bg-[length:18px_18px] p-6"
        >
            <div
                ref={cardsScrollRef}
                onScroll={recomputePaths}
                className="flex justify-center gap-6 overflow-x-auto"
            >
                {stagesWithLocalId.map((stage) => (
                    <StageCardView
                        key={stage.localId}
                        stage={stage}
                        cardRef={registerStageRef(stage.localId)}
                        isCurrentUserStage={stage.id === highlightStageId}
                    />
                ))}
            </div>

            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                {paths.map((d, i) => (
                    <path key={i} d={d} stroke="#d5dae3" strokeWidth={1.5} fill="none"/>
                ))}
            </svg>

            <div className="mx-auto mt-10 flex w-[280px] flex-col items-center gap-4">
                <div className="relative w-full">
                    <NormBlockView
                        label="Первичное согласование"
                        value={process.primaryDeadlineMinutes}
                        phaseStatus={primaryPhaseStatus}
                        blockRef={targetRef}
                    />
                    {primaryPhaseStatus === "current" && (
                        <CurrentPhaseHint
                            startedAt={process.primaryStartedAt}
                            deadlineAt={process.primaryDeadlineAt}
                        />
                    )}
                </div>

                <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>

                <div className="relative w-full">
                    <NormBlockView
                        label="Согласование после внесённых изменений"
                        value={process.repeatDeadlineMinutes}
                        phaseStatus={repeatPhaseStatus}
                    />
                    {repeatPhaseStatus === "current" && (
                        <CurrentPhaseHint
                            startedAt={process.repeatStartedAt}
                            deadlineAt={process.repeatDeadlineAt}
                        />
                    )}
                </div>

                <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>

                <div className="relative w-full">
                    <NormBlockView
                        label="Финальная выдержка"
                        value={process.finalHoldDeadlineMinutes}
                        phaseStatus={finalHoldPhaseStatus}
                    />
                    {finalHoldPhaseStatus === "current" && (
                        <CurrentPhaseHint
                            startedAt={process.finalHoldStartedAt}
                            deadlineAt={process.finalHoldDeadlineAt}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}