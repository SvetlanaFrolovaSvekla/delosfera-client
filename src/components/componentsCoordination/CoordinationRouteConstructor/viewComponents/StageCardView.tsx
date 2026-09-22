// Read-only карточка этапа уже построенного маршрута согласования
import {useLayoutEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {useAuth} from "@/context/AuthContext.ts";
import type {
    ApprovalPhaseRoundResponse,
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
import {getInitials} from "@/utils/namingUsers/getInitials.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";

import {
    CommentViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/CommentViewModal.tsx";
import {FormattedResolutionComment, type FormattedCommentQuoteRef} from "./FormattedResolutionComment.tsx";
import {
    AttachmentRow
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/AttachmentRow.tsx";
import {
    AttachmentDocxPreviewModal
} from "@/components/componentsGeneral/modal/AttachmentDocxPreviewModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

import {RefreshCw, X} from "lucide-react";

const COMMENT_TRUNCATE_LENGTH = 500; // Лимит обрезки комментария/замечания в карточке

/** Системные автосгенерированные тексты резолюций (см. AutoApproveInitiatorStages,
 * ResetFinalHoldDecisions в VndApprovalService.cs на бэке) — техническая пометка, а не
 * пояснение от реального согласующего. Не показываем их в истории комментариев (тот же список,
 * что и в VndRevisionNeededPanel.tsx). */
const AUTO_GENERATED_COMMENT_TEXTS = new Set([
    "Согласовано автоматически — инициатор является согласующим на этом этапе",
    "Согласовано автоматически",
]);

interface PhaseCommentEntry {
    phaseLabel: string;
    decision: ApprovalStageDecisionResponse;
    comment: string;
    decidedAt: string | null;
    attachments: ApprovalStageAttachmentResponse[];
    /** Цитаты, вставленные в этот комментарий на этой фазе (см. "+ Сослаться на текст
     * редакции") - для кнопок-луп "Показать в тексте" рядом с каждой цитатой. */
    quotes: FormattedCommentQuoteRef[];
}

/** Резолюции этого согласующего по ВСЕМ пройденным фазам (первичная/повторная/финальная
 * выдержка), у которых есть текст комментария/замечания — не только последняя. Раньше карточка
 * показывала комментарий только к самой последней фазе, из-за чего замечания/комментарии
 * из более ранних кругов согласования пропадали из вида, как только у этого же согласующего
 * появлялась резолюция следующей фазы — другие согласующие, решающие позже, их уже не видели.
 *
 * ⚠ 14.09.2026 (реальная причина исчезновения "Повторное согласование" с плиток маршрута):
 * stage.repeatComment/repeatDecision (и finalHold-аналоги) — ЖИВЫЕ поля, бэк перезаписывает их
 * на КАЖДЫЙ новый круг фазы (см. комментарий у ApprovalPhaseRoundResponse в
 * coordinationServiceTypes.ts) — в них всегда видно решение только ПОСЛЕДНЕГО круга. Если в
 * рамках одного процесса замечания на повторном согласовании устраняли несколько раз подряд,
 * предыдущие круги в этих полях уже стёрты новыми. process.phaseRounds — это как раз архив
 * ЗАВЕРШЁННЫХ (уже перезаписанных) кругов, специально заведённый на бэке для этого случая, но
 * карточка его до сих пор не читала. Теперь собираем полную историю: все круги из phaseRounds
 * (кроме текущего/последнего — он ещё не архивирован и лежит в живых полях) + сам живой круг. */
function collectPhaseComments(stage: ApprovalStageResponse, phaseRounds: ApprovalPhaseRoundResponse[], t: TFunction): PhaseCommentEntry[] {
    const entries: PhaseCommentEntry[] = [];

    if (stage.primaryComment && !AUTO_GENERATED_COMMENT_TEXTS.has(stage.primaryComment)) {
        entries.push({
            phaseLabel: t("stageCard.phasePrimary"), // Первичное согласование
            decision: stage.primaryDecision,
            comment: stage.primaryComment,
            decidedAt: stage.primaryDecidedAt,
            attachments: stage.primaryAttachments,
            quotes: stage.primaryQuotes,
        });
    }

    // Повторное согласование: сначала все УЖЕ ЗАВЕРШЁННЫЕ круги из архива (phaseRounds), потом
    // текущий/последний круг из живых полей стейджа — именно в этом порядке (архив всегда
    // старше живых полей, см. пояснение выше).
    const repeatRounds = phaseRounds
        .filter((r) => r.phase === "repeat")
        .sort((a, b) => a.roundNumber - b.roundNumber);
    const hasLiveRepeat = !!(stage.repeatComment && stage.repeatDecision && !AUTO_GENERATED_COMMENT_TEXTS.has(stage.repeatComment));
    const repeatTotalRounds = repeatRounds.length + (hasLiveRepeat ? 1 : 0);
    // Нумеруем круги в подписи, только если их реально больше одного - иначе (обычный случай,
    // без повторных доработок) подпись остаётся простой "Повторное согласование", как раньше.
    for (const round of repeatRounds) {
        const sd = round.stageDecisions.find((s) => s.stageId === stage.id);
        if (!sd || !sd.comment || AUTO_GENERATED_COMMENT_TEXTS.has(sd.comment)) continue;
        entries.push({
            phaseLabel: repeatTotalRounds > 1
                ? t("stageCard.phaseRepeatRound", {round: round.roundNumber})
                : t("stageCard.phaseRepeat"),
            decision: sd.decision,
            comment: sd.comment,
            decidedAt: sd.decidedAt,
            // Архивные круги (VndApprovalPhaseRound на бэке) не хранят вложения/цитаты этого
            // круга отдельно - только решение/комментарий/дату. Текущий (живой) круг ниже их
            // по-прежнему показывает.
            attachments: [],
            quotes: [],
        });
    }
    if (hasLiveRepeat) {
        entries.push({
            phaseLabel: repeatTotalRounds > 1
                ? t("stageCard.phaseRepeatRound", {round: repeatTotalRounds})
                : t("stageCard.phaseRepeat"),
            decision: stage.repeatDecision as ApprovalStageDecisionResponse,
            comment: stage.repeatComment as string,
            decidedAt: stage.repeatDecidedAt,
            attachments: stage.repeatAttachments,
            quotes: stage.repeatQuotes,
        });
    }

    // Финальная выдержка - тот же принцип: архивные круги, затем живой.
    const finalHoldRounds = phaseRounds
        .filter((r) => r.phase === "finalHold")
        .sort((a, b) => a.roundNumber - b.roundNumber);
    const hasLiveFinalHold = !!(stage.finalHoldComment && stage.finalHoldDecision && !AUTO_GENERATED_COMMENT_TEXTS.has(stage.finalHoldComment));
    const finalHoldTotalRounds = finalHoldRounds.length + (hasLiveFinalHold ? 1 : 0);
    for (const round of finalHoldRounds) {
        const sd = round.stageDecisions.find((s) => s.stageId === stage.id);
        if (!sd || !sd.comment || AUTO_GENERATED_COMMENT_TEXTS.has(sd.comment)) continue;
        entries.push({
            phaseLabel: finalHoldTotalRounds > 1
                ? t("stageCard.phaseFinalHoldRound", {round: round.roundNumber})
                : t("stageCard.phaseFinalHold"),
            decision: sd.decision,
            comment: sd.comment,
            decidedAt: sd.decidedAt,
            attachments: [],
            quotes: [],
        });
    }
    if (hasLiveFinalHold) {
        entries.push({
            phaseLabel: finalHoldTotalRounds > 1
                ? t("stageCard.phaseFinalHoldRound", {round: finalHoldTotalRounds})
                : t("stageCard.phaseFinalHold"),
            decision: stage.finalHoldDecision as ApprovalStageDecisionResponse,
            comment: stage.finalHoldComment as string,
            decidedAt: stage.finalHoldDecidedAt,
            attachments: stage.finalHoldAttachments,
            quotes: stage.finalHoldQuotes,
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
    /** Клик по кнопке-лупе "Показать в тексте" рядом с цитатой (см. FormattedResolutionComment) -
     * должен открыть просмотр соответствующей редакции на нужной вкладке с подсветкой этого
     * места. Сама карточка этапа не знает ни про редакцию, ни про просмотрщик документа - это
     * решает вызывающая сторона (см. VndCoordinationTab.handleShowQuoteInText/
     * RejectedApprovalDetailsModal). Без этого пропа кнопки-лупы не рисуются. */
    onShowQuoteInText?: (quote: FormattedCommentQuoteRef) => void;
    /** Архив завершённых кругов фаз "Повторное согласование"/"Финальная выдержка" за весь
     * процесс (см. ApprovalProcessResponse.phaseRounds) - нужен, чтобы восстановить полную
     * историю резолюций этого этапа (см. collectPhaseComments), а не только решение последнего
     * круга. Без этого пропа история кругов не восстанавливается (используется как раньше -
     * только живые поля стейджа). */
    phaseRounds?: ApprovalPhaseRoundResponse[];
    /** true, если у текущего пользователя есть право редактировать маршрут этого процесса
     * (главный редактор, см. PermissionCode.EditAnyVndApprovalRoute) — показывает кнопку "Убрать"
     * на карточке. Без onRemoveApprover кнопка не рисуется, даже если этот флаг true. */
    canEditRoute?: boolean;
    /** Убрать этого согласующего из маршрута (см. VndCoordinationTab) — вызывается по кнопке
     * "Убрать", саму карточку это не меняет, решение и подтверждение — на стороне вызывающего.
     * Кнопка "Убрать" рисуется только для custom-этапов (см. canRemove ниже) — для обязательных
     * этапов вместо неё используется onReplaceApprover. */
    onRemoveApprover?: (stageId: number) => void;
    /** Заменить согласующего на этом (обязательном) этапе, не убирая сам этап (см.
     * VndCoordinationTab) — вызывается по кнопке "Заменить", открывает выбор нового согласующего
     * на стороне вызывающего. Кнопка рисуется только для НЕ custom-этапов (см. canReplace ниже) —
     * для custom-этапов используется onRemoveApprover. */
    onReplaceApprover?: (stageId: number) => void;
}

export function StageCardView({
                                  stage, cardRef, isCurrentUserStage, isProcessEnded, onShowQuoteInText, phaseRounds,
                                  canEditRoute, onRemoveApprover, onReplaceApprover,
                              }: StageCardViewProps) {
    const {t} = useTranslation();
    const {user} = useAuth();

    const isCustom = isCustomStageKind(stage.kind);
    const Icon = isCustom ? CUSTOM_STAGE_ICON : FIXED_STAGE_ICON;

    const isMeApprover = stage.approverUserId === user?.id;
    // Чужой профиль живёт на /users/:id (см. App.tsx и тот же баг/фикс в VndApprovalSummary
    // рядом) - "/profile" без id это только собственный профиль текущего пользователя.
    const profileUrl = isMeApprover ? "/profile" : `/users/${stage.approverUserId}`;

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
    const phaseComments = collectPhaseComments(stage, phaseRounds ?? [], t);

    // Пока решение не принято, а это этап текущего пользователя — показываем отдельный жёлтый статус
    const isPendingForCurrentUser = isCurrentUserStage && decision === "pending" && !isProcessEnded;
    const isAutoTimeout = decision === "auto_approved_timeout";
    // Решение так и не было принято, а весь процесс уже прекращён (отклонён/отозван на другом
    // этапе) — этап не "в ожидании", он просто больше не актуален.
    const isStalePending = decision === "pending" && isProcessEnded;

    const [openCommentEntry, setOpenCommentEntry] = useState<PhaseCommentEntry | null>(null);
    const [previewAttachment, setPreviewAttachment] = useState<{ fileId: number; fileName: string } | null>(null);

    const badgeLabel = isPendingForCurrentUser
        ? t("stageCard.pendingCurrentUserBadge")
        : isStalePending
            ? t("stageCard.processEndedBadge")
            : decisionMeta.label;
    const badgeClass = isPendingForCurrentUser
        ? "bg-[#fdf3dc] text-[#a97313]"
        : isStalePending
            ? "bg-[#f1f2f5] text-[#7c8494]"
            : decisionMeta.badgeClass;

    const containerClass = stage.isRemovedByEditor
        ? "border border-dashed border-[#c7cad1] bg-[#f7f8fa] opacity-70"
        : isPendingForCurrentUser
            ? "border border-[#e3b23c] bg-gradient-to-b from-[#fffdf7] to-white shadow-[0_2px_5px_-2px_rgba(179,115,10,0.28)]"
            : isCustom
                ? "border border-slate-200 bg-white shadow-[0_3px_12px_-6px_rgba(15,27,45,0.14)]"
                : "border border-[#c9b6f5] bg-gradient-to-b from-[#faf8ff] to-white shadow-[0_2px_5px_-2px_rgba(122,92,224,0.28)]";

    // Кнопка "Убрать" видна только действующему главному редактору, только для действующего
    // (ещё не убранного) этапа, только пока процесс согласования не завершён - убрать
    // согласующего из уже прекращённого/согласованного маршрута смысла нет (см. те же проверки
    // на бэке в VndApprovalService.RemoveApproverAsync) - и только для custom-этапов: обязательные
    // этапы убрать целиком нельзя, для них вместо этого есть "Заменить" (canReplace ниже).
    const canRemove = canEditRoute && !!onRemoveApprover && isCustom && !stage.isRemovedByEditor && !isProcessEnded;
    // "Заменить" - тот же набор условий, что и у "Убрать" выше, но для обязательных
    // (не custom) этапов: сам этап остаётся в маршруте, меняется только исполнитель (см.
    // VndApprovalService.ReplaceApproverAsync).
    const canReplace = canEditRoute && !!onReplaceApprover && !isCustom && !stage.isRemovedByEditor && !isProcessEnded;

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[220px] flex-none flex-col gap-3 rounded-2xl p-4 ${containerClass}`}
        >
            {canRemove && (
                <Tooltip
                    content={t("stageCard.removeApproverTooltip")} // Убрать согласующего из маршрута
                    side="top"
                    className="!absolute right-2 top-2"
                >
                    <button
                        type="button"
                        onClick={() => onRemoveApprover!(stage.id)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#a3adbd] hover:bg-[#fdecec] hover:text-[#c0392b]"
                    >
                        <X size={14}/>
                    </button>
                </Tooltip>
            )}

            {canReplace && (
                <Tooltip
                    content={t("stageCard.replaceApproverTooltip")} // Заменить согласующего на этом этапе
                    side="top"
                    className="!absolute right-2 top-2"
                >
                    <button
                        type="button"
                        onClick={() => onReplaceApprover!(stage.id)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#a3adbd] hover:bg-[#eef0fd] hover:text-[#4e57d6]"
                    >
                        <RefreshCw size={13}/>
                    </button>
                </Tooltip>
            )}

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
                    <span
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#ececfc] text-[9px] font-bold text-[#4e57d6]">
                        {getInitials(stage.approverName)}
                    </span>
                    <Tooltip content={stage.approverName} disabled={!isNameTruncated} side="top"
                             className="min-w-0 flex-1">
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
                        {/* я */}
                        {t("stageCard.meBadge")}
                    </span>
                )}
            </Link>

            <span
                className={`inline-flex w-fit items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                {badgeLabel}
            </span>

            {isAutoTimeout && latestDecidedAt && (
                <div className="text-[11px] text-[#8b97ab]">
                    {/* Автоматически {formatDateTime(latestDecidedAt)} — согласующий не отреагировал в срок */}
                    {t("stageCard.autoTimeoutNote", {date: formatDateTime(latestDecidedAt)})}
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
                        const sectionTitle = entry.decision === "approved"
                            ? t("stageCard.viewFullComment")
                            : t("stageCard.viewFullRemarks");

                        return (
                            <div key={i}
                                 className="flex flex-col gap-1 border-t border-[#eef1f6] pt-2 first:border-t-0 first:pt-0">
                                {phaseComments.length > 1 && (
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <span
                                            className="text-[10px] font-semibold uppercase tracking-[0.03em] text-[#a3adbd]">
                                            {entry.phaseLabel}
                                        </span>
                                        <span
                                            className={`inline-flex w-fit flex-none items-center rounded-full px-[7px] py-0.5 text-[10px] font-semibold ${entryMeta.badgeClass}`}>
                                            {entryMeta.label}
                                        </span>
                                    </div>
                                )}
                                <div
                                    className="text-[11.5px] leading-snug text-[#6b7488] whitespace-pre-wrap break-words">
                                    <FormattedResolutionComment
                                        text={displayedComment}
                                        quotes={entry.quotes}
                                        onShowInText={onShowQuoteInText}
                                    />
                                </div>
                                {entry.attachments.length > 0 && (
                                    <div className="rounded-[10px] border border-[#e9edf3] bg-[#fbfcfe] p-2.5">
                                        <div className="mb-1.5 text-[10.5px] font-semibold text-[#8b97ab]">
                                            {/* Прикреплённые файлы: */}
                                            {t("stageCard.attachedFiles")}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {entry.attachments.map((a) => (
                                                <AttachmentRow
                                                    key={a.id}
                                                    fileId={a.fileId}
                                                    fileName={a.fileName}
                                                    onView={() => setPreviewAttachment({
                                                        fileId: a.fileId,
                                                        fileName: a.fileName
                                                    })}
                                                />
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

            {previewAttachment && (
                <AttachmentDocxPreviewModal
                    fileId={previewAttachment.fileId}
                    fileName={previewAttachment.fileName}
                    downloadingId={null}
                    onDownload={downloadWithToast}
                    onClose={() => setPreviewAttachment(null)}
                />
            )}

            {openCommentEntry && (
                <CommentViewModal
                    title={
                        openCommentEntry.decision === "approved"
                            ? t("stageCard.viewFullComment")
                            : t("stageCard.viewFullRemarks")
                    }
                    approverName={stage.approverName}
                    approverUserId={stage.approverUserId}
                    decidedAt={openCommentEntry.decidedAt}
                    comment={openCommentEntry.comment}
                    attachments={openCommentEntry.attachments}
                    decisionLabel={STAGE_DECISION_META[openCommentEntry.decision].label}
                    decisionBadgeClass={STAGE_DECISION_META[openCommentEntry.decision].badgeClass}
                    onClose={() => setOpenCommentEntry(null)}
                    quotes={openCommentEntry.quotes}
                    onShowInText={onShowQuoteInText}
                />
            )}
        </div>
    );
}