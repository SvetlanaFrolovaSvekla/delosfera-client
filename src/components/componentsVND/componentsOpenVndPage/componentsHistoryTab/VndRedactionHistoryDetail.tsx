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
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {ArrowLeft, Download, Route as RouteIcon} from "lucide-react";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {approvalSheetCaption, getRedactionApprovalSheets} from "@/utils/vndProcess/approvalSheets.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {
    ApprovalProcessResponse,
    ApprovalProcessStatus,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    VndApprovalSummary
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalSummary.tsx";
import {
    FormattedResolutionComment
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";
import {ApprovalRouteHistoryCarousel} from "./ApprovalRouteHistoryCarousel.tsx";
import type {RedactionDisplayStatus} from "@/utils/vndProcess/redactionStatus.ts";
import {REDACTION_STATUS_META} from "@/utils/vndProcess/redactionStatus.ts";

interface VndRedactionHistoryDetailProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    displayStatus: RedactionDisplayStatus;
    /** Все процессы согласования этой редакции (в любом порядке — сортируются здесь) — если
     * редакцию отзывали и запускали заново, циклов может быть несколько. */
    processes: ApprovalProcessResponse[];
    onBack: () => void;
}

interface TimelineEvent {
    id: string;
    at: string;
    title: string;
    detail?: string | null;
}

/** Разворачивает один процесс согласования в плоский список событий по времени — ровно то
 * место, где "что-то менялось": старт этапа, каждое решение согласующего на каждой фазе,
 * переход на повторное согласование, начало финальной выдержки, итог процесса.
 *
 * Принимает t() снаружи (а не вызывает useTranslation здесь) — это обычная функция, а не
 * компонент/хук, ей нельзя пользоваться хуками напрямую. */
function buildProcessTimeline(t: TFunction, process: ApprovalProcessResponse, attemptPrefix: string): TimelineEvent[] {
    const decisionVerb = (key: string) => t(`openVndPage.historyTab.timeline.decisionVerbs.${key}`);
    const events: TimelineEvent[] = [];

    events.push({
        id: `${process.id}-start`,
        at: process.primaryStartedAt,
        title: `${attemptPrefix}${t("openVndPage.historyTab.timeline.primaryStartedTitle")}` +
            (process.isNoChangesActualization ? ` (${t("approvalSheets.noChanges")})` : ""),
        detail: t("openVndPage.historyTab.timeline.initiatorDetailLabel", {
            name: `${process.initiatorName}${process.initiatorPosition ? ` (${process.initiatorPosition})` : ""}`,
        }),
    });

    for (const stage of process.stages) {
        if (stage.primaryDecidedAt) {
            events.push({
                id: `${stage.id}-primary`,
                at: stage.primaryDecidedAt,
                title: `${stage.approverName} (${stage.orgUnitName}) — ${decisionVerb(stage.primaryDecision)}`,
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
            const roundSuffix = multiple ? t("openVndPage.historyTab.timeline.roundSuffix", {number: round.roundNumber}) : "";
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
                    title: `${stage.approverName} (${stage.orgUnitName}) — ${decisionVerb(decision.decision)}${roundSuffix}`,
                    detail: decision.comment,
                });
            }
        }
    };
    roundEvents("repeat", t("openVndPage.historyTab.timeline.repeatPhaseLabel"));
    roundEvents("finalHold", t("openVndPage.historyTab.timeline.finalHoldPhaseLabel"));

    if (process.repeatStartedAt) {
        const repeatRoundNumber = process.phaseRounds.filter((r) => r.phase === "repeat").length + 1;
        const roundSuffix = repeatRoundNumber > 1 ? t("openVndPage.historyTab.timeline.roundSuffix", {number: repeatRoundNumber}) : "";
        events.push({
            id: `${process.id}-repeat-start`,
            at: process.repeatStartedAt,
            title: `${attemptPrefix}${t("openVndPage.historyTab.timeline.repeatPhaseLabel")}${roundSuffix}`,
            detail: process.repeatInitiatorComment,
        });
    }

    for (const stage of process.stages) {
        if (stage.repeatDecidedAt && stage.repeatDecision) {
            events.push({
                id: `${stage.id}-repeat`,
                at: stage.repeatDecidedAt,
                title: `${stage.approverName} (${stage.orgUnitName}) — ${decisionVerb(stage.repeatDecision)}${t("openVndPage.historyTab.timeline.repeatedSuffix")}`,
                detail: stage.repeatComment,
            });
        }
    }

    if (process.finalHoldStartedAt) {
        const finalHoldRoundNumber = process.phaseRounds.filter((r) => r.phase === "finalHold").length + 1;
        const roundSuffix = finalHoldRoundNumber > 1 ? t("openVndPage.historyTab.timeline.roundSuffix", {number: finalHoldRoundNumber}) : "";
        events.push({
            id: `${process.id}-hold-start`,
            at: process.finalHoldStartedAt,
            title: `${attemptPrefix}${t("openVndPage.historyTab.timeline.finalHoldPhaseLabel")}${roundSuffix}`,
        });
    }

    for (const stage of process.stages) {
        if (stage.finalHoldDecidedAt && stage.finalHoldDecision) {
            events.push({
                id: `${stage.id}-hold`,
                at: stage.finalHoldDecidedAt,
                title: `${stage.approverName} (${stage.orgUnitName}) — ${decisionVerb(stage.finalHoldDecision)}${t("openVndPage.historyTab.timeline.finalHoldSuffix")}`,
                detail: stage.finalHoldComment,
            });
        }
    }

    if (process.completedAt) {
        const completionLabel = ["approved", "cancelled", "rejected"].includes(process.status)
            ? t(`openVndPage.historyTab.timeline.processCompletionLabels.${process.status as "approved" | "cancelled" | "rejected"}`)
            : t("openVndPage.historyTab.timeline.processCompletedDefault");
        events.push({
            id: `${process.id}-completed`,
            at: process.completedAt,
            title: `${attemptPrefix}${completionLabel}`,
        });

        if (process.approvalSheetFileId) {
            events.push({
                id: `${process.id}-sheet`,
                at: process.completedAt,
                title: `${attemptPrefix}${t("approvalSheets.timelineSheetGenerated")}` +
                    (process.isNoChangesActualization ? ` (${t("approvalSheets.noChanges")})` : ""),
                detail: process.approvalSheetFileName ?? null,
            });
        }
    }

    return events;
}

export function VndRedactionHistoryDetail({
                                              vnd, redaction, displayStatus, processes, onBack,
                                          }: VndRedactionHistoryDetailProps) {
    const {t} = useTranslation();
    const meta = REDACTION_STATUS_META[displayStatus];

    // Хронологический порядок попыток (старые → новые) — так понятнее читается история, чем
    // "по убыванию", в котором её отдаёт сервер для панели со сводкой последнего цикла.
    const sortedProcesses = [...processes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const timeline = sortedProcesses
        .flatMap((p, i) =>
            buildProcessTimeline(t, p, sortedProcesses.length > 1 ? `${t("openVndPage.historyTab.attemptLabel", {number: i + 1})}. ` : ""),
        )
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const processStatusLabel = (status: ApprovalProcessStatus) => t(`openVndPage.historyTab.processStatuses.${status}`);

    // Все листы согласования этой редакции (от нового к старому) - у редакции, которую
    // актуализировали без изменений, их несколько.
    const approvalSheets = [...getRedactionApprovalSheets(redaction)].reverse();

    return (
        <div className="flex flex-col gap-[18px]">
            <button
                type="button"
                onClick={onBack}
                className="flex w-fit cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-[#4e57d6] hover:underline"
            >
                <ArrowLeft size={15}/>
                {t("openVndPage.historyTab.backToHistoryButton")}
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
                    <h2 className="m-0 text-sm font-semibold">{t("openVndPage.historyTab.detailedLogTitle")}</h2>
                </div>
                <div className="px-5 pt-1.5 pb-3.5">
                    {timeline.length === 0 ? (
                        <div className="py-4 text-[12.5px] text-[#a3adbd]">
                            {t("openVndPage.historyTab.notStartedForRedaction")}
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
                                            <FormattedResolutionComment text={e.detail}/>
                                        </div>
                                    )}
                                    <div className="text-[11px] text-[#8b97ab] mt-0.5">{formatDateTime(e.at)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {approvalSheets.length > 0 && (
                <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7]">
                        <h2 className="m-0 text-sm font-semibold">
                            {t("approvalSheets.sectionTitle")} ({approvalSheets.length})
                        </h2>
                    </div>
                    <div className="px-5 py-2">
                        {approvalSheets.map((sheet) => (
                            <div key={`${sheet.id}-${sheet.fileId}`}
                                 className="flex items-center gap-3 py-2 border-t border-[#f3f6f9] first:border-t-0">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[12.5px] text-[#26324a]">{approvalSheetCaption(t, sheet)}</div>
                                    <div className="truncate text-[11px] text-[#8b97ab]">{sheet.fileName}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void downloadWithToast(sheet.fileId, sheet.fileName).catch(() => undefined)}
                                    className="flex-none cursor-pointer grid h-8 w-8 place-items-center rounded-[8px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc]"
                                >
                                    <Download size={14}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-[14px]">
                <div className="flex items-center gap-[9px] px-1">
                    <RouteIcon size={17} strokeWidth={1.8} className="text-[#8b97ab]"/>
                    <h2 className="m-0 text-sm font-semibold">{t("openVndPage.historyTab.routeHistoryTitle")}</h2>
                </div>

                {sortedProcesses.length === 0 ? (
                    <div className="rounded-[16px] border border-[#e5e9f0] bg-white overflow-hidden">
                        <EmptyState
                            embedded
                            icon={RouteIcon}
                            title={t("openVndPage.historyTab.routeNotStartedTitle")}
                            description={t("openVndPage.historyTab.routeNotStartedDescription")}
                        />
                    </div>
                ) : (
                    sortedProcesses.map((p, i) => (
                        <div key={p.id} className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                            <div
                                className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex flex-wrap items-center gap-x-3 gap-y-1">
                                {sortedProcesses.length > 1 && (
                                    <span className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                        {t("openVndPage.historyTab.attemptLabel", {number: i + 1})}
                                    </span>
                                )}
                                <span className="text-[11.5px] text-[#8b97ab]">
                                    {processStatusLabel(p.status)}
                                    {p.completedAt ? t("openVndPage.historyTab.completedAtLabel", {date: formatDateTime(p.completedAt)}) : ""}
                                </span>
                                {p.isNoChangesActualization && (
                                    <span className="inline-block rounded bg-[#ececfc] px-1.5 py-0.5 text-[9.5px] font-bold text-[#4e57d6] whitespace-nowrap">
                                        {t("approvalSheets.noChangesBadge")}
                                    </span>
                                )}
                                {p.approvalSheetFileId && (
                                    <button
                                        type="button"
                                        onClick={() => void downloadWithToast(
                                            p.approvalSheetFileId as number,
                                            p.approvalSheetFileName ?? `${redaction.code}_Лист_согласования.docx`,
                                        ).catch(() => undefined)}
                                        className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e9f0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                                    >
                                        <Download size={12}/>
                                        {t("approvalSheets.processSheetButton")}
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-4 p-4">
                                <VndApprovalSummary process={p}/>
                                <ApprovalRouteHistoryCarousel
                                    process={p}
                                    vnd={vnd}
                                    redaction={redaction}
                                    isLatestProcess={i === sortedProcesses.length - 1}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
