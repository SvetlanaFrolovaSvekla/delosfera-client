// Read-only маршрут уже запущенного/завершённого согласования
import {useMemo} from "react";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {useApprovalRouteLines} from "@/hooks/coordinationHooks/useApprovalRouteLines.ts";
import {StageCardView} from "./StageCardView";
import {NormBlockView, type NormPhaseStatus} from "./NormBlockView";
import {ArrowDown, ArrowLeft, MessageSquareText} from "lucide-react";
import {getElapsedLabel} from "@/utils/dateUtils.ts";
import {getInitials} from "@/utils/getInitials.ts";

interface VndApprovalRouteViewProps {
    process: ApprovalProcessResponse;
    highlightStageId?: number;
    /** true — не рисовать собственную внешнюю рамку/скругление/фон (используется, когда
     * компонент вложен как тело под цветной шапкой-баннером, и рамку рисует родитель) */
    frameless?: boolean;
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

// Сколько времени осталось до дедлайна (дни, часы, минуты)
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
    if (minutes > 0) parts.push(`${minutes} мин`);

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
            <ArrowLeft size={16} className="flex-none"/>
            <div className="flex flex-col text-[11.5px] leading-[1.5]">
                <span className="font-semibold">Текущий этап</span>
                <span className="text-[#8b97ab]">Прошло с начала этапа: {startedAt ? getElapsedLabel(startedAt) : "—"}</span>
                <span className="text-[#8b97ab]">Осталось до дедлайна: {getRemainingLabel(deadlineAt)}</span>
            </div>
        </div>
    );
}

export function VndApprovalRouteView({process, highlightStageId, frameless}: VndApprovalRouteViewProps) {
    const stagesWithLocalId = useMemo(
        () => process.stages.map((s) => ({...s, localId: String(s.id)})),
        [process.stages],
    );

    const primaryPhaseStatus = useMemo(() => getPrimaryPhaseStatus(process), [process]);
    const repeatPhaseStatus = useMemo(() => getRepeatPhaseStatus(process), [process]);
    const finalHoldPhaseStatus = useMemo(() => getFinalHoldPhaseStatus(process), [process]);

    // Процесс завершён без результата (отклонён/отозван) - этапы, на которых решение так и не
    // было принято, больше не "В ожидании": ждать уже нечего, весь процесс прекращён.
    const isProcessEnded = process.status === "rejected" || process.status === "cancelled";

    const {funnelWrapperRef, targetRef, cardsScrollRef, paths, recomputePaths, registerStageRef} =
        useApprovalRouteLines(stagesWithLocalId);

    return (
        <div
            ref={funnelWrapperRef}
            className={
                frameless
                    ? "relative bg-[#fbfcfe] bg-[radial-gradient(#e4e9f1_1px,transparent_1px)] bg-[length:18px_18px] p-6"
                    : "relative rounded-[16px] border border-[#e5e9f0] bg-[#fbfcfe] bg-[radial-gradient(#e4e9f1_1px,transparent_1px)] bg-[length:18px_18px] p-6"
            }
        >
            {/* Комментарий инициатора о внесённых исправлениях (см. "Комментарий о внесённых
                исправлениях" в VndRevisionNeededPanel - отправляется вместе с повторной подачей
                редакции после устранения замечаний). Раньше приходил с бэка, но нигде не
                отображался - согласующие не видели, что именно исправил инициатор. Показываем
                один раз для всего маршрута (не привязан к конкретному этапу), если он есть. */}
            {process.repeatInitiatorComment && (
                <div className="mx-auto mb-5 flex w-fit max-w-[640px] flex-col gap-1.5 rounded-[12px] border border-[#d4d6f8] bg-[#f5f6fd] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                            {getInitials(process.initiatorName)}
                        </span>
                        <span className="text-[11.5px] font-semibold text-[#26324a]">
                            {process.initiatorName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4e57d6]">
                            <MessageSquareText size={12} className="flex-none"/>
                            комментарий к исправлениям
                        </span>
                    </div>
                    <div className="whitespace-pre-wrap text-[12px] leading-snug text-[#3c424a]">
                        {process.repeatInitiatorComment}
                    </div>
                </div>
            )}

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
                        isProcessEnded={isProcessEnded}
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
                        startedAt={process.primaryStartedAt}
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
                        startedAt={process.repeatStartedAt}
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
                        startedAt={process.finalHoldStartedAt}
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