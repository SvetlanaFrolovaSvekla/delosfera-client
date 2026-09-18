// Пролистываемая "карусель" схем маршрута согласования одного процесса (Попытки) - одна
// страница на каждый этап/круг: "Первичное согласование", затем по одной странице на каждый
// ЗАВЕРШЁННЫЙ круг "Согласование после внесённых изменений" (если замечания устраняли
// несколько раз подряд - process.phaseRounds, см. VndApprovalPhaseRound на бэке) плюс одна
// страница на ТЕКУЩИЙ/последний такой круг, и аналогично для "Финальной выдержки" (тоже может
// повториться, если на ней снова оставили замечание).
//
// Каждая страница показывает либо ТЕКУЩЕЕ состояние (если это активный сейчас этап процесса -
// isCurrent), либо КОНЕЧНОЕ состояние круга, каким оно было на момент, когда все согласующие
// этого круга уже отправили резолюции (или когда круг был перезаписан следующим) - именно то,
// что просила Светлана: "либо текущее состояние (если этап - сейчас), либо конечное состояние
// схемы - когда все согласующие отправили свои резолюции".
import {useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {getInitials} from "@/utils/namingUsers/getInitials.ts";
import {
    FormattedResolutionComment
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";
import type {
    ApprovalPhaseRoundResponse,
    ApprovalProcessResponse,
    ApprovalStageDecisionResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";

const DECISION_COLORS: Record<ApprovalStageDecisionResponse, { color: string; bg: string }> = {
    pending: {color: "#8b97ab", bg: "#f1f3f6"},
    approved: {color: "#1f9d55", bg: "#e8f8ee"},
    approved_with_comment: {color: "#c9820a", bg: "#fdf3e2"},
    rejected: {color: "#d1453b", bg: "#fdeceb"},
    auto_approved_timeout: {color: "#5c6b8a", bg: "#eef1f6"},
    removed_by_editor: {color: "#9aa1ac", bg: "#f4f5f7"},
};

interface SchemaStageDecision {
    stageId: number;
    decision: ApprovalStageDecisionResponse;
    comment: string | null;
    decidedAt: string | null;
}

interface SchemaPage {
    key: string;
    phaseLabel: string;
    roundLabel: string | null;
    isCurrent: boolean;
    completedAt: string | null;
    initiatorComment: string | null;
    decisions: SchemaStageDecision[];
}

function buildPrimaryPage(t: TFunction, process: ApprovalProcessResponse): SchemaPage {
    const isCurrent = process.status === "primary";
    return {
        key: "primary",
        phaseLabel: t("openVndPage.historyTab.processStatuses.primary"),
        roundLabel: null,
        isCurrent,
        completedAt: isCurrent ? null : (process.repeatStartedAt ?? process.finalHoldStartedAt ?? process.completedAt),
        initiatorComment: null,
        decisions: process.stages.map((s) => ({
            stageId: s.id, decision: s.primaryDecision, comment: s.primaryComment, decidedAt: s.primaryDecidedAt,
        })),
    };
}

function roundToPage(round: ApprovalPhaseRoundResponse, phaseLabel: string, roundLabel: string | null): SchemaPage {
    return {
        key: `${round.phase}-${round.roundNumber}`,
        phaseLabel,
        roundLabel,
        isCurrent: false,
        completedAt: round.completedAt,
        initiatorComment: round.initiatorComment,
        decisions: round.stageDecisions,
    };
}

function buildCurrentRepeatPage(t: TFunction, process: ApprovalProcessResponse, roundLabel: string | null): SchemaPage | null {
    if (!process.repeatStartedAt) return null;
    const isCurrent = process.status === "repeated";
    return {
        key: "repeat-current",
        phaseLabel: t("openVndPage.historyTab.carousel.repeatPhaseLabel"),
        roundLabel,
        isCurrent,
        completedAt: isCurrent ? null : (process.finalHoldStartedAt ?? process.completedAt),
        initiatorComment: process.repeatInitiatorComment,
        decisions: process.stages
            .filter((s) => s.participatesInRepeat)
            .map((s) => ({
                stageId: s.id, decision: s.repeatDecision ?? "pending", comment: s.repeatComment, decidedAt: s.repeatDecidedAt,
            })),
    };
}

function buildCurrentFinalHoldPage(t: TFunction, process: ApprovalProcessResponse, roundLabel: string | null): SchemaPage | null {
    if (!process.finalHoldStartedAt) return null;
    const isCurrent = process.status === "final_hold";
    return {
        key: "finalHold-current",
        phaseLabel: t("openVndPage.historyTab.processStatuses.final_hold"),
        roundLabel,
        isCurrent,
        completedAt: isCurrent ? null : process.completedAt,
        initiatorComment: null,
        decisions: process.stages.map((s) => ({
            stageId: s.id, decision: s.finalHoldDecision ?? "pending", comment: s.finalHoldComment, decidedAt: s.finalHoldDecidedAt,
        })),
    };
}

function buildSchemaPages(t: TFunction, process: ApprovalProcessResponse): SchemaPage[] {
    const pages: SchemaPage[] = [buildPrimaryPage(t, process)];

    const repeatRounds = [...process.phaseRounds]
        .filter((r) => r.phase === "repeat")
        .sort((a, b) => a.roundNumber - b.roundNumber);
    const finalHoldRounds = [...process.phaseRounds]
        .filter((r) => r.phase === "finalHold")
        .sort((a, b) => a.roundNumber - b.roundNumber);

    // Круг нумеруется только если их реально больше одного - незачем подписывать "Круг 1",
    // когда доработка была только одна.
    const repeatTotal = repeatRounds.length + (process.repeatStartedAt ? 1 : 0);
    repeatRounds.forEach((r) => pages.push(
        roundToPage(r, t("openVndPage.historyTab.carousel.repeatPhaseLabel"), repeatTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: r.roundNumber}) : null),
    ));
    const currentRepeat = buildCurrentRepeatPage(t, process, repeatTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: repeatTotal}) : null);
    if (currentRepeat) pages.push(currentRepeat);

    const finalHoldTotal = finalHoldRounds.length + (process.finalHoldStartedAt ? 1 : 0);
    finalHoldRounds.forEach((r) => pages.push(
        roundToPage(r, t("openVndPage.historyTab.processStatuses.final_hold"), finalHoldTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: r.roundNumber}) : null),
    ));
    const currentFinalHold = buildCurrentFinalHoldPage(t, process, finalHoldTotal > 1 ? t("openVndPage.historyTab.carousel.roundLabel", {number: finalHoldTotal}) : null);
    if (currentFinalHold) pages.push(currentFinalHold);

    return pages;
}

interface ApprovalRouteHistoryCarouselProps {
    process: ApprovalProcessResponse;
}

export function ApprovalRouteHistoryCarousel({process}: ApprovalRouteHistoryCarouselProps) {
    const {t} = useTranslation();
    const pages = buildSchemaPages(t, process);
    // По умолчанию открываем ПОСЛЕДНЮЮ страницу (текущий/самый свежий этап) - так сразу видно,
    // на чём процесс сейчас, а назад можно пролистать всю историю кругов.
    const [index, setIndex] = useState(pages.length - 1);
    const safeIndex = Math.min(Math.max(index, 0), pages.length - 1);
    const page = pages[safeIndex];

    if (!page) return null;

    const stageById = new Map(process.stages.map((s) => [s.id, s]));

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-[#26324a]">{page.phaseLabel}</span>
                    {page.roundLabel && (
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#8b97ab]">
                            {page.roundLabel}
                        </span>
                    )}
                    {page.isCurrent ? (
                        <span className="rounded-full bg-[#ececfc] px-2 py-0.5 text-[10px] font-bold text-[#4e57d6]">
                            {t("openVndPage.historyTab.carousel.currentStageLabel")}
                        </span>
                    ) : (
                        <span className="rounded-full bg-[#f1f3f6] px-2 py-0.5 text-[10px] font-bold text-[#8b97ab]">
                            {t("openVndPage.historyTab.carousel.completedLabel")}{page.completedAt ? ` · ${formatDateTime(page.completedAt)}` : ""}
                        </span>
                    )}
                </div>

                {pages.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={safeIndex === 0}
                            onClick={() => setIndex((i) => Math.max(0, i - 1))}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[#e5e9f0] text-[#6b7488] hover:bg-[#f5f6fa] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronLeft size={14}/>
                        </button>
                        <span className="text-[11px] tabular-nums text-[#8b97ab]">
                            {safeIndex + 1} / {pages.length}
                        </span>
                        <button
                            type="button"
                            disabled={safeIndex === pages.length - 1}
                            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[#e5e9f0] text-[#6b7488] hover:bg-[#f5f6fa] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronRight size={14}/>
                        </button>
                    </div>
                )}
            </div>

            {page.initiatorComment && (
                <div className="whitespace-pre-wrap break-words rounded-[10px] border border-[#d4d6f8] bg-[#f5f6fd] px-3 py-2 text-[11.5px] text-[#3c424a]">
                    <span className="font-semibold text-[#4e57d6]">{t("openVndPage.historyTab.carousel.correctionsCommentLabel")}</span>
                    <FormattedResolutionComment text={page.initiatorComment}/>
                </div>
            )}

            <div className="flex flex-wrap gap-2.5 rounded-[14px] border border-[#e5e9f0] bg-[#fbfcfe] p-3.5">
                {page.decisions.length === 0 ? (
                    <div className="py-2 text-[11.5px] text-[#a3adbd]">{t("openVndPage.historyTab.carousel.noDataForStage")}</div>
                ) : (
                    page.decisions.map((d) => {
                        const stage = stageById.get(d.stageId);
                        const colors = DECISION_COLORS[d.decision];
                        return (
                            <div
                                key={d.stageId}
                                className="flex min-w-[180px] max-w-[240px] flex-1 flex-col gap-1 rounded-[10px] border border-[#e9edf3] bg-white p-2.5"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded bg-[#ececfc] text-[8.5px] font-bold text-[#4e57d6]">
                                        {getInitials(stage?.approverName ?? "")}
                                    </span>
                                    <span className="truncate text-[11px] font-semibold text-[#26324a]">
                                        {stage?.approverName ?? "—"}
                                    </span>
                                </div>
                                <span
                                    className="w-fit rounded px-1.5 py-0.5 text-[9.5px] font-bold"
                                    style={{color: colors.color, background: colors.bg}}
                                >
                                    {t(`openVndPage.historyTab.carousel.decisionLabels.${d.decision}`)}
                                </span>
                                {d.comment && (
                                    <div className="whitespace-pre-wrap break-words text-[10.5px] text-[#6b7488]">
                                        <FormattedResolutionComment text={d.comment}/>
                                    </div>
                                )}
                                {d.decidedAt && (
                                    <div className="text-[10px] text-[#a3adbd]">{formatDateTime(d.decidedAt)}</div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
