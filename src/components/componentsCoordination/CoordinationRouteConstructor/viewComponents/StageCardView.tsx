// Read-only карточка этапа уже построенного маршрута согласования
import {useLayoutEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";
import type {
    ApprovalStageAttachmentResponse,
    ApprovalStageDecisionResponse,
    ApprovalStageResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    STAGE_DECISION_META,
    CUSTOM_STAGE_ICON,
    FIXED_STAGE_ICON,
    isCustomStageKind,
} from "@/constants/coordinationParams.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {
    CommentViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/CommentViewModal.tsx";
import {FormattedResolutionComment} from "./FormattedResolutionComment.tsx";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {getInitials} from "@/utils/getInitials.ts";

const COMMENT_TRUNCATE_LENGTH = 500; // Лимит обрезки комментария/замечания в карточке

/** Системные автосгенерированные тексты резолюций (см. AutoApproveInitiatorStages,
 * ResetFinalHoldDecisions в VndApprovalService.cs на бэке) — техническая пометка, а не
 * пояснение от реального согласующего. Не показываем их в истории комментариев (тот же список,
 * что и в VndRevisionNeededPanel.tsx). */
const AUTO_GENERATED_COMMENT_TEXTS = new Set([
    "Согласовано автоматически — инициатор является согласующим на этом этапе",
    "Согласовано автоматически — вы уже согласовали эту редакцию без замечаний ранее",
]);

interface PhaseCommentEntry {
    phaseLabel: string;
    decision: ApprovalStageDecisionResponse;
    comment: string;
    decidedAt: string | null;
    attachments: ApprovalStageAttachmentResponse[];
}

/** Резолюции этого согласующего по ВСЕМ пройденным фазам (первичная/повторная/финальная
 * выдержка), у которых есть текст комментария/замечания — не только последняя. Раньше карточка
 * показывала комментарий только к самой последней фазе, из-за чего замечания/комментарии
 * из более ранних кругов согласования пропадали из вида, как только у этого же согласующего
 * появлялась резолюция следующей фазы — другие согласующие, решающие позже, их уже не видели. */
function collectPhaseComments(stage: ApprovalStageResponse): PhaseCommentEntry[] {
    const entries: PhaseCommentEntry[] = [];

    if (stage.primaryComment && !AUTO_GENERATED_COMMENT_TEXTS.has(stage.primaryComment)) {
        entries.push({
            phaseLabel: "Первичное согласование",
            decision: stage.primaryDecision,
            comment: stage.primaryComment,
            decidedAt: stage.primaryDecidedAt,
            attachments: stage.primaryAttachments,
        });
    }
    if (stage.repeatComment && stage.repeatDecision && !AUTO_GENERATED_COMMENT_TEXTS.has(stage.repeatComment)) {
        entries.push({
            phaseLabel: "Повторное согласование",
            decision: stage.repeatDecision,
            comment: stage.repeatComment,
            decidedAt: stage.repeatDecidedAt,
            attachments: stage.repeatAttachments,
        });
    }
    if (stage.finalHoldComment && stage.finalHoldDecision && !AUTO_GENERATED_COMMENT_TEXTS.has(stage.finalHoldComment)) {
        entries.push({
            phaseLabel: "Финальная выдержка",
            decision: stage.finalHoldDecision,
            comment: stage.finalHoldComment,
            decidedAt: stage.finalHoldDecidedAt,
            attachments: stage.finalHoldAttachments,
        });
    }

    return entries;
}

interface StageCardViewProps {
    stage: ApprovalStageResponse;
    cardRef: (el: HTMLDivElement | null) => void;
    /** true, если это этап текущего залогиненного пользователя — подсвечивает карточку и статус */
    isCurrentUserStage?: boolean;
    /** true, если весь процесс согласования уже завершён без результата (отклонён/отозван) —
     * этапы, которые так и остались "pending", больше не значат "ждём решения", т.к. решения по
     * ним уже не будет: сам процесс прекращён. */
    isProcessEnded?: boolean;
}

export function StageCardView({stage, cardRef, isCurrentUserStage, isProcessEnded}: StageCardViewProps) {
    const {user} = useAuth();

    const isCustom = isCustomStageKind(stage.kind);
    const Icon = isCustom ? CUSTOM_STAGE_ICON : FIXED_STAGE_ICON;

    const isMeApprover = stage.approverUserId === user?.id;
    const profileUrl = isMeApprover ? "/profile" : `/profile/${stage.approverUserId}`;

    // Тултип с полным ФИО нужен, только если текст реально обрезан по ширине (truncate) —
    // проверяем через scrollWidth/clientWidth и пересчитываем при ресайзе карточки.
    const nameRef = useRef<HTMLSpanElement>(null);
    const [isNameTruncated, setIsNameTruncated] = useState(false);

    useLayoutEffect(() => {
        const el = nameRef.current;
        if (!el) return;

        const checkTruncation = () => setIsNameTruncated(el.scrollWidth > el.clientWidth);
        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(el);
        return () => observer.disconnect();
    }, [stage.approverName]);

    // Для верхнего бейджа статуса показываем самое актуальное решение по фазам: финальная
    // выдержка > повторное > первичное.
    const decision = stage.finalHoldDecision ?? stage.repeatDecision ?? stage.primaryDecision;
    const decisionMeta = STAGE_DECISION_META[decision];
    const latestDecidedAt = stage.finalHoldDecision
        ? stage.finalHoldDecidedAt
        : stage.repeatDecision
            ? stage.repeatDecidedAt
            : stage.primaryDecidedAt;

    // История резолюций/комментариев этого согласующего по ВСЕМ пройденным фазам - не только
    // самой последней (см. collectPhaseComments) - чтобы более ранние замечания/комментарии не
    // пропадали из вида для остальных согласующих, решающих позже.
    const phaseComments = collectPhaseComments(stage);

    // Пока решение не принято, а это этап текущего пользователя — показываем отдельный жёлтый статус
    const isPendingForCurrentUser = isCurrentUserStage && decision === "pending" && !isProcessEnded;
    const isAutoTimeout = decision === "auto_approved_timeout";
    // Решение так и не было принято, а весь процесс уже прекращён (отклонён/отозван на другом
    // этапе) — этап не "в ожидании", он просто больше не актуален.
    const isStalePending = decision === "pending" && isProcessEnded;

    const [openCommentEntry, setOpenCommentEntry] = useState<PhaseCommentEntry | null>(null);

    const badgeLabel = isPendingForCurrentUser
        ? "В рассмотрении (мой этап)"
        : isStalePending
            ? "Согласование прекращено"
            : decisionMeta.label;
    const badgeClass = isPendingForCurrentUser
        ? "bg-[#fdf3dc] text-[#a97313]"
        : isStalePending
            ? "bg-[#f1f2f5] text-[#7c8494]"
            : decisionMeta.badgeClass;

    const containerClass = isPendingForCurrentUser
        ? "border border-[#e3b23c] bg-gradient-to-b from-[#fffdf7] to-white shadow-[0_2px_5px_-2px_rgba(179,115,10,0.28)]"
        : isCustom
            ? "border border-slate-200 bg-white shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]"
            : "border border-[#c9b6f5] bg-gradient-to-b from-[#faf8ff] to-white shadow-[0_2px_5px_-2px_rgba(122,92,224,0.28)]";

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[220px] flex-none flex-col gap-3 rounded-2xl p-4 ${containerClass}`}
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
                    {stage.title}
                </span>
            </div>

            <Link
                to={profileUrl}
                className="flex h-[36px] w-full items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2 text-[12px] outline-none hover:border-[#4e57d6]/50 hover:bg-white"
            >
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                        {getInitials(stage.approverName)}
                    </span>
                    <Tooltip content={stage.approverName} disabled={!isNameTruncated} side="top" className="min-w-0 flex-1">
                        <span ref={nameRef} className="block w-full truncate text-[#26324a]">
                            {stage.approverName}
                        </span>
                    </Tooltip>
                </span>
                {isMeApprover && (
                    <span
                        className="flex-none rounded-full px-[7px] py-[1px] text-[10px] font-semibold"
                        style={{color: "#2f68f5", backgroundColor: "#e9f0ff"}}
                    >
                        я
                    </span>
                )}
            </Link>

            <span className={`inline-flex w-fit items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                {badgeLabel}
            </span>

            {isAutoTimeout && latestDecidedAt && (
                <div className="text-[11px] text-[#8b97ab]">
                    Автоматически {formatDateTime(latestDecidedAt)} — согласующий не отреагировал в срок
                </div>
            )}

            {/* История резолюций по фазам - каждая со своим текстом, если он есть, помеченная
                фазой (и меткой решения, если решений на разных фазах у этого согласующего было
                разное - например, "Согласовано с замечаниями" в первичном, затем "Согласовано"
                в повторном) - чтобы более ранние замечания/комментарии оставались видны и после
                того, как у согласующего появилась резолюция следующей фазы. */}
            {phaseComments.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {phaseComments.map((entry, i) => {
                        const entryMeta = STAGE_DECISION_META[entry.decision];
                        const isCommentLong = entry.comment.length > COMMENT_TRUNCATE_LENGTH;
                        const displayedComment = isCommentLong
                            ? entry.comment.slice(0, COMMENT_TRUNCATE_LENGTH).trimEnd() + "…"
                            : entry.comment;
                        // "Комментарий" — при согласовании, "Замечания" — во всех остальных
                        // решениях (отклонено/возвращено/на доработку и т.п.)
                        const sectionTitle = entryMeta.label === "Согласовано"
                            ? "См. комментарий полностью"
                            : "См. замечания полностью";

                        return (
                            <div key={i} className="flex flex-col gap-1 border-t border-[#eef1f6] pt-2 first:border-t-0 first:pt-0">
                                {phaseComments.length > 1 && (
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#a3adbd]">
                                            {entry.phaseLabel}
                                        </span>
                                        <span className={`inline-flex w-fit flex-none items-center rounded-full px-[7px] py-0.5 text-[10px] font-semibold ${entryMeta.badgeClass}`}>
                                            {entryMeta.label}
                                        </span>
                                    </div>
                                )}
                                <div className="text-[11.5px] leading-snug text-[#6b7488] whitespace-pre-wrap">
                                    <FormattedResolutionComment text={displayedComment}/>
                                </div>
                                {entry.attachments.length > 0 && (
                                    <div className="rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-2.5">
                                        <div className="mb-1.5 text-[10.5px] font-semibold text-[#8b97ab]">
                                            Прикреплённые файлы:
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {entry.attachments.map((a) => (
                                                <AttachmentRow key={a.id} fileId={a.fileId} fileName={a.fileName}/>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {isCommentLong && (
                                    <button
                                        type="button"
                                        onClick={() => setOpenCommentEntry(entry)}
                                        className="cursor-pointer flex-none self-center rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                                    >
                                        {sectionTitle}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {openCommentEntry && (
                <CommentViewModal
                    title={
                        STAGE_DECISION_META[openCommentEntry.decision].label === "Согласовано"
                            ? "См. комментарий полностью"
                            : "См. замечания полностью"
                    }
                    approverName={stage.approverName}
                    approverUserId={stage.approverUserId}
                    decidedAt={openCommentEntry.decidedAt}
                    comment={openCommentEntry.comment}
                    attachments={openCommentEntry.attachments}
                    decisionLabel={STAGE_DECISION_META[openCommentEntry.decision].label}
                    decisionBadgeClass={STAGE_DECISION_META[openCommentEntry.decision].badgeClass}
                    onClose={() => setOpenCommentEntry(null)}
                />
            )}
        </div>
    );
}