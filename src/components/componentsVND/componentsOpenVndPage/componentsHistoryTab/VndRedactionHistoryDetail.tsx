// Подробный лог одной редакции + история её маршрута согласования — открывается кнопкой
// "Смотреть подробно" на панели "Редакции и юридическая значимость" (см. VndHistoryTab), и
// занимает на вкладке "История" место, где обычно стоят панели "Журнал аудита" и "Редакции
// и юридическая значимость" (см. use-сайт).
//
// Строится целиком из уже загруженных на вкладке "История" процессов согласования
// (coordinationService.getHistory) — отдельного запроса к серверу не делает. У технического
// журнала аудита (activityLogService) нет привязки к конкретной редакции (только к ВНД в
// целом), поэтому как основа для "лога редакции" не годится — вместо этого лог строится из
// самих процессов согласования этой редакции, которые уже и есть подробная, привязанная
// именно к ней история: кто и когда что решил, на какой фазе, с каким комментарием.
import {ArrowLeft, Route as RouteIcon} from "lucide-react";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {
    ApprovalProcessResponse,
    ApprovalProcessStatus,
    ApprovalStageDecisionResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    VndApprovalSummary
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalSummary.tsx";
import {ApprovalRouteHistoryCarousel} from "./ApprovalRouteHistoryCarousel.tsx";
import type {RedactionDisplayStatus} from "@/utils/redactionStatus.ts";
import {REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";

interface VndRedactionHistoryDetailProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    displayStatus: RedactionDisplayStatus;
    /** Все процессы согласования этой редакции (в любом порядке — сортируются здесь) — если
     * редакцию отзывали и запускали заново, циклов может быть несколько. */
    processes: ApprovalProcessResponse[];
    onBack: () => void;
}

const DECISION_VERB: Record<ApprovalStageDecisionResponse, string> = {
    pending: "в ожидании",
    approved: "согласовал(а)",
    approved_with_comment: "согласовал(а) с замечаниями",
    rejected: "отклонил(а)",
    auto_approved_timeout: "согласовано автоматически (истёк срок ожидания)",
};

const PROCESS_STATUS_LABEL: Record<ApprovalProcessStatus, string> = {
    primary: "Первичное согласование",
    revision_needed: "На доработке",
    repeated: "Повторное согласование",
    final_hold: "Финальная выдержка",
    approved: "Согласовано",
    cancelled: "Отозвано",
    rejected: "Отклонено",
};

const PROCESS_COMPLETION_LABEL: Partial<Record<ApprovalProcessStatus, string>> = {
    approved: "Редакция согласована — процесс завершён",
    cancelled: "Согласование отозвано",
    rejected: "Редакция отклонена",
};

interface TimelineEvent {
    id: string;
    at: string;
    title: string;
    detail?: string | null;
}

/** Разворачивает один процесс согласования в плоский список событий по времени — ровно то
 * место, где "что-то менялось": старт этапа, каждое решение согласующего на каждой фазе,
 * переход на повторное согласование, начало финальной выдержки, итог процесса. */
function buildProcessTimeline(process: ApprovalProcessResponse, attemptPrefix: string): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    events.push({
        id: `${process.id}-start`,
        at: process.primaryStartedAt,
        title: `${attemptPrefix}Запущено первичное согласование`,
        detail: `Инициатор: ${process.initiatorName}${process.initiatorPosition ? ` (${process.initiatorPosition})` : ""}`,
    });

    for (const stage of process.stages) {
        if (stage.primaryDecidedAt) {
            events.push({
                id: `${stage.id}-primary`,
                at: stage.primaryDecidedAt,
                title: `${stage.approverName} (${stage.orgUnitName}) — ${DECISION_VERB[stage.primaryDecision]}`,
                detail: stage.primaryComment,
            });
        }
    }

    // Круги, которые уже завершились и были перезаписаны следующими (см. VndApprovalPhaseRound
    // на бэке) - без них при нескольких кругах доработки подряд в одном и том же процессе в
    // журнале был бы виден только самый последний круг, промежуточные "пропадали" бы, хотя на
    // самом деле происходили.
    const stageLookup = new Map(process.stages.map((s) => [s.id, s]));
    const roundEvents = (phase: "repeat" | "finalHold", phaseLabel: string) => {
        const rounds = [...process.phaseRounds]
            .filter((r) => r.phase === phase)
            .sort((a, b) => a.roundNumber - b.roundNumber);
        const multiple = rounds.length > 1 || (phase === "repeat" ? !!process.repeatStartedAt : !!process.finalHoldStartedAt);

        for (const round of rounds) {
            const roundSuffix = multiple ? ` (круг ${round.roundNumber})` : "";
            if (round.startedAt) {
                events.push({
                    id: `${round.id}-start`,
                    at: round.startedAt,
                    title: `${attemptPrefix}${phaseLabel}${roundSuffix}`,
                    detail: round.initiatorComment,
                });
            }
            for (const decision of round.stageDecisions) {
                const stage = stageLookup.get(decision.stageId);
                if (!stage || !decision.decidedAt) continue;
                events.push({
                    id: `${round.id}-${decision.stageId}`,
                    at: decision.decidedAt,
                    title: `${stage.approverName} (${stage.orgUnitName}) — ${DECISION_VERB[decision.decision]}${roundSuffix}`,
                    detail: decision.comment,
                });
            }
        }
    };
    roundEvents("repeat", "Направлено на повторное согласование после устранения замечаний");
    roundEvents("finalHold", "Начата финальная выдержка");

    if (process.repeatStartedAt) {
        const repeatRoundNumber = process.phaseRounds.filter((r) => r.phase === "repeat").length + 1;
        const roundSuffix = repeatRoundNumber > 1 ? ` (круг ${repeatRoundNumber})` : "";
        events.push({
            id: `${process.id}-repeat-start`,
            at: process.repeatStartedAt,
            title: `${attemptPrefix}Направлено на повторное согласование после устранения замечаний${roundSuffix}`,
            detail: process.repeatInitiatorComment,
        });
    }

    for (const stage of process.stages) {
        if (stage.repeatDecidedAt && stage.repeatDecision) {
            events.push({
                id: `${stage.id}-repeat`,
                at: stage.repeatDecidedAt,
                title: `${stage.approverName} (${stage.orgUnitName}) — ${DECISION_VERB[stage.repeatDecision]} (повторно)`,
                detail: stage.repeatComment,
            });
        }
    }

    if (process.finalHoldStartedAt) {
        const finalHoldRoundNumber = process.phaseRounds.filter((r) => r.phase === "finalHold").length + 1;
        const roundSuffix = finalHoldRoundNumber > 1 ? ` (круг ${finalHoldRoundNumber})` : "";
        events.push({
            id: `${process.id}-hold-start`,
            at: process.finalHoldStartedAt,
            title: `${attemptPrefix}Начата финальная выдержка${roundSuffix}`,
        });
    }

    for (const stage of process.stages) {
        if (stage.finalHoldDecidedAt && stage.finalHoldDecision) {
            events.push({
                id: `${stage.id}-hold`,
                at: stage.finalHoldDecidedAt,
                title: `${stage.approverName} (${stage.orgUnitName}) — ${DECISION_VERB[stage.finalHoldDecision]} (финальная выдержка)`,
                detail: stage.finalHoldComment,
            });
        }
    }

    if (process.completedAt) {
        events.push({
            id: `${process.id}-completed`,
            at: process.completedAt,
            title: `${attemptPrefix}${PROCESS_COMPLETION_LABEL[process.status] ?? "Процесс завершён"}`,
        });
    }

    return events;
}

export function VndRedactionHistoryDetail({
                                              redaction, displayStatus, processes, onBack,
                                          }: VndRedactionHistoryDetailProps) {
    const meta = REDACTION_STATUS_META[displayStatus];

    // Хронологический порядок попыток (старые → новые) — так понятнее читается история, чем
    // "по убыванию", в котором её отдаёт сервер для панели со сводкой последнего цикла.
    const sortedProcesses = [...processes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const timeline = sortedProcesses
        .flatMap((p, i) =>
            buildProcessTimeline(p, sortedProcesses.length > 1 ? `Попытка ${i + 1}. ` : ""),
        )
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return (
        <div className="flex flex-col gap-[18px]">
            <button
                type="button"
                onClick={onBack}
                className="flex w-fit cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-[#4e57d6] hover:underline"
            >
                <ArrowLeft size={15}/>
                Назад к истории
            </button>

            <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex flex-wrap items-center gap-[9px]">
                    <span className="font-mono text-[13px] font-bold text-[#1c2740]">{redaction.code}</span>
                    <span
                        className="inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={{color: meta.color, background: meta.bg}}
                    >
                        {meta.label}
                    </span>
                    <h2 className="m-0 text-sm font-semibold">Подробный журнал редакции</h2>
                </div>
                <div className="px-5 pt-1.5 pb-3.5">
                    {timeline.length === 0 ? (
                        <div className="py-4 text-[12.5px] text-[#a3adbd]">
                            Согласование по этой редакции не запускалось
                        </div>
                    ) : (
                        timeline.map((e) => (
                            <div key={e.id}
                                 className="flex gap-[11px] py-2.5 border-t border-[#f3f6f9] first:border-t-0">
                                <span className="w-[7px] h-[7px] flex-none rounded-full mt-1.5 bg-[#7a5ce0]"/>
                                <div className="min-w-0">
                                    <div className="text-[12.5px] text-[#26324a] leading-[1.4]">{e.title}</div>
                                    {e.detail && (
                                        <div
                                            className="whitespace-pre-wrap break-words text-[11.5px] text-[#6b7488] mt-0.5">
                                            {e.detail}
                                        </div>
                                    )}
                                    <div className="text-[11px] text-[#8b97ab] mt-0.5">{formatDateTime(e.at)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-[14px]">
                <div className="flex items-center gap-[9px] px-1">
                    <RouteIcon size={17} strokeWidth={1.8} className="text-[#8b97ab]"/>
                    <h2 className="m-0 text-sm font-semibold">История маршрута согласования</h2>
                </div>

                {sortedProcesses.length === 0 ? (
                    <div className="rounded-[16px] border border-[#e5e9f0] bg-white overflow-hidden">
                        <EmptyState
                            embedded
                            icon={RouteIcon}
                            title="Согласование не запускалось!"
                            description="Маршрут появится, когда по этой редакции будет запущено согласование."
                        />
                    </div>
                ) : (
                    sortedProcesses.map((p, i) => (
                        <div key={p.id} className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                            <div
                                className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex flex-wrap items-center gap-x-3 gap-y-1">
                                {sortedProcesses.length > 1 && (
                                    <span className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                        Попытка {i + 1}
                                    </span>
                                )}
                                <span className="text-[11.5px] text-[#8b97ab]">
                                    {PROCESS_STATUS_LABEL[p.status]}
                                    {p.completedAt ? ` · завершено ${formatDateTime(p.completedAt)}` : ""}
                                </span>
                            </div>
                            <div className="flex flex-col gap-4 p-4">
                                <VndApprovalSummary process={p}/>
                                <ApprovalRouteHistoryCarousel process={p}/>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
