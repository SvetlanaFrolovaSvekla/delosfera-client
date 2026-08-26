// Read-only карточка этапа уже построенного маршрута согласования
import {useLayoutEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";
import type {ApprovalStageResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {
    STAGE_DECISION_META,
    STAGE_ICONS,
    STAGE_KIND_RESPONSE_TO_REQUEST,
    STAGE_LABELS,
} from "@/constants/coordinationParams.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {
    CommentViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/CommentViewModal.tsx";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {getInitials} from "@/utils/getInitials.ts";

const COMMENT_TRUNCATE_LENGTH = 500; // Лимит обрезки комментария/замечания в карточке

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

    const kind = STAGE_KIND_RESPONSE_TO_REQUEST[stage.kind];
    const Icon = STAGE_ICONS[kind];
    const isCustom = kind === "Custom";

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
    // Вложения к той же фазе, что и показанный комментарий. Пропадают, как только редакция
    // становится согласованной (текст резолюции при этом остаётся).
    const attachments = stage.finalHoldDecision
        ? stage.finalHoldAttachments
        : stage.repeatDecision
            ? stage.repeatAttachments
            : stage.primaryAttachments;

    // Пока решение не принято, а это этап текущего пользователя — показываем отдельный жёлтый статус
    const isPendingForCurrentUser = isCurrentUserStage && decision === "pending" && !isProcessEnded;
    const isAutoTimeout = decision === "auto_approved_timeout";
    // Решение так и не было принято, а весь процесс уже прекращён (отклонён/отозван на другом
    // этапе) — этап не "в ожидании", он просто больше не актуален.
    const isStalePending = decision === "pending" && isProcessEnded;

    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

    const isCommentLong = !!comment && comment.length > COMMENT_TRUNCATE_LENGTH;
    const displayedComment = isCommentLong
        ? comment!.slice(0, COMMENT_TRUNCATE_LENGTH).trimEnd() + "…"
        : comment;
    // "Комментарий" — при согласовании, "Замечания" — во всех остальных решениях
    // (отклонено/возвращено/на доработку и т.п.)
    const commentSectionTitle = decisionMeta.label === "Согласовано" ? "См. комментарий полностью" : "См. замечания полностью";

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
                    {STAGE_LABELS[kind]}
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

            {isAutoTimeout && decidedAt && (
                <div className="text-[11px] text-[#8b97ab]">
                    Автоматически {formatDateTime(decidedAt)} — согласующий не отреагировал в срок
                </div>
            )}

            {comment && (
                <div className="flex flex-col gap-1">
                    <div className="text-[11.5px] leading-snug text-[#6b7488] whitespace-pre-wrap">
                        {displayedComment}
                    </div>
                    {isCommentLong && (
                        <button
                            type="button"
                            onClick={() => setIsCommentModalOpen(true)}
                            className="cursor-pointer flex-none self-center rounded-[7px] border border-[#d7dee8] bg-white px-2.5 py-[6px] text-[11.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                        >
                            {commentSectionTitle}
                        </button>
                    )}
                </div>
            )}

            {attachments.length > 0 && (
                <div className="rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-2.5">
                    <div className="mb-1.5 text-[10.5px] font-semibold text-[#8b97ab]">
                        Прикреплённые файлы:
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {attachments.map((a) => (
                            <AttachmentRow key={a.id} fileId={a.fileId} fileName={a.fileName}/>
                        ))}
                    </div>
                </div>
            )}

            {isCommentModalOpen && comment && (
                <CommentViewModal
                    title={commentSectionTitle}
                    approverName={stage.approverName}
                    approverUserId={stage.approverUserId}
                    decidedAt={decidedAt}
                    comment={comment}
                    attachments={attachments}
                    decisionLabel={badgeLabel}
                    decisionBadgeClass={badgeClass}
                    onClose={() => setIsCommentModalOpen(false)}
                />
            )}
        </div>
    );
}