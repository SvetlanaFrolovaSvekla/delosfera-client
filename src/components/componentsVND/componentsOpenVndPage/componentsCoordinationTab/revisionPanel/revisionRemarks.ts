// Сбор замечаний и комментариев согласующих для панели "На доработке".
import type {ApprovalProcessResponse, ApprovalStageAttachmentResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {FormattedCommentQuoteRef} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/FormattedResolutionComment.tsx";

export interface RemarkItem {
    stageId: number;
    approverName: string;
    approverUserId: number;
    phase: RevisionPhaseKey;
    comment: string;
    decidedAt: string | null;
    attachments: ApprovalStageAttachmentResponse[];
    /* Цитаты, вставленные в этот комментарий/замечание */
    quotes: FormattedCommentQuoteRef[];
}

export type RevisionPhaseKey = "primary" | "repeat" | "finalHold";

/** Каким этапом вызван ТЕКУЩИЙ статус "На доработке" - нужно, чтобы отделить ещё не устранённые
 * замечания (с этого этапа) от уже устранённых (с более раннего этапа - см. RemarkCard ниже,
 * блок "Устранённые замечания"). Согласование может возвращаться на доработку несколько раз
 * подряд (первичное → доработка → повторное → снова доработка → снова повторное → ... →
 * финальная выдержка → доработка и т.д. - см. CompleteRepeatPhaseAsync/
 * ReturnToRevisionFromFinalHoldAsync на бэке), и при каждой повторной отправке (resubmit)
 * комментарии предыдущего "своего" круга обнуляются (RepeatComment/FinalHoldComment) - то есть
 * непустой repeatComment/finalHoldComment у этапа всегда относится именно к последнему кругу.
 * Поэтому "последний начавшийся из двух" (по repeatStartedAt/finalHoldStartedAt) и есть источник
 * текущих активных замечаний; всё, что осталось непустым в более ранних этапах (чаще всего -
 * первичное согласование) - уже устранённая история. */
export function getActiveRevisionPhase(process: ApprovalProcessResponse): RevisionPhaseKey {
    const repeatTs = process.repeatStartedAt ? new Date(process.repeatStartedAt).getTime() : -1;
    const finalHoldTs = process.finalHoldStartedAt ? new Date(process.finalHoldStartedAt).getTime() : -1;
    if (finalHoldTs > -1 && finalHoldTs > repeatTs) return "finalHold";
    if (repeatTs > -1) return "repeat";
    return "primary";
}

/** Собираем замечания по редакции - с любого этапа (первичный / повторный / финальная
 * выдержка), т.к. RevisionNeeded может наступить после любого из них. Замечанием
 * считается комментарий именно к решению "approved_with_comment" (отправлено на
 * устранение замечаний) - комментарий к простому "approved" сюда не попадает. */
export function collectRemarks(process: ApprovalProcessResponse): RemarkItem[] {
    return process.stages.flatMap((stage) => {
        const remarks: RemarkItem[] = [];

        if (stage.primaryComment && stage.primaryDecision === "approved_with_comment") {
            remarks.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "primary",
                comment: stage.primaryComment,
                decidedAt: stage.primaryDecidedAt,
                attachments: stage.primaryAttachments,
                quotes: stage.primaryQuotes,
            });
        }
        if (stage.repeatComment && stage.repeatDecision === "approved_with_comment") {
            remarks.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "repeat",
                comment: stage.repeatComment,
                decidedAt: stage.repeatDecidedAt,
                attachments: stage.repeatAttachments,
                quotes: stage.repeatQuotes,
            });
        }
        if (stage.finalHoldComment && stage.finalHoldDecision === "approved_with_comment") {
            remarks.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "finalHold",
                comment: stage.finalHoldComment,
                decidedAt: stage.finalHoldDecidedAt,
                attachments: stage.finalHoldAttachments,
                quotes: stage.finalHoldQuotes,
            });
        }
        return remarks;
    });
}

/** Системные автосгенерированные тексты комментариев (см. AutoApproveInitiatorStages,
 * ResetFinalHoldDecisions в VndApprovalService.cs на бэке) - это не пояснение от
 * реального согласующего, а техническая пометка "решение проставлено автоматически".
 * В блоке "пришедшие комментарии" такие записи только сбивают с толку, поэтому
 * не показываем их там (сами решения/статусы этапов при этом никак не скрываются). */
const AUTO_GENERATED_COMMENT_TEXTS = new Set([
    "Согласовано автоматически — инициатор является согласующим на этом этапе",
    "Согласовано автоматически",
]);

/** Комментарии к простому согласованию ("approved") - не замечания, а просто
 * пояснения согласующего. Показываем отдельным блоком, и только если они есть. */
export function collectApprovalComments(process: ApprovalProcessResponse): RemarkItem[] {
    return process.stages.flatMap((stage) => {
        const comments: RemarkItem[] = [];

        if (
            stage.primaryComment &&
            stage.primaryDecision === "approved" &&
            !AUTO_GENERATED_COMMENT_TEXTS.has(stage.primaryComment)
        ) {
            comments.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "primary",
                comment: stage.primaryComment,
                decidedAt: stage.primaryDecidedAt,
                attachments: stage.primaryAttachments,
                quotes: stage.primaryQuotes,
            });
        }
        if (
            stage.repeatComment &&
            stage.repeatDecision === "approved" &&
            !AUTO_GENERATED_COMMENT_TEXTS.has(stage.repeatComment)
        ) {
            comments.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "repeat",
                comment: stage.repeatComment,
                decidedAt: stage.repeatDecidedAt,
                attachments: stage.repeatAttachments,
                quotes: stage.repeatQuotes,
            });
        }
        if (
            stage.finalHoldComment &&
            stage.finalHoldDecision === "approved" &&
            !AUTO_GENERATED_COMMENT_TEXTS.has(stage.finalHoldComment)
        ) {
            comments.push({
                stageId: stage.id,
                approverName: stage.approverName,
                approverUserId: stage.approverUserId,
                phase: "finalHold",
                comment: stage.finalHoldComment,
                decidedAt: stage.finalHoldDecidedAt,
                attachments: stage.finalHoldAttachments,
                quotes: stage.finalHoldQuotes,
            });
        }
        return comments;
    });
}
