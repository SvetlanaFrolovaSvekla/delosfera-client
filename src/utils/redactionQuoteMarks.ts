// Собирает "маркеры" - цитаты из текста редакции, на которые согласующие сослались в своих
// резолюциях (см. "+ Сослаться на текст редакции" в VndApproverResolutionPanel), в единый
// плоский список для подсветки в тексте (см. useDocxQuoteMarks) и для панели "Комментарии"
// в RedactionViewModal. По устройству - тот же принцип, что и collectPhaseComments в
// StageCardView.tsx: цитаты собираются по ВСЕМ пройденным фазам (первичное/повторное/финальная
// выдержка) каждого этапа, а не только по последней.
import type {
    ApprovalProcessResponse,
    ApprovalStageAttachmentResponse,
    ApprovalStageDecisionResponse,
    ApprovalStageResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {STAGE_DECISION_META} from "@/constants/coordinationParams.ts";
import type {RedactionViewTarget} from "@/utils/redactionLanguagePanelUtils.ts";

/** Один маркер - цитата, привязанная к конкретной резолюции конкретного согласующего на
 * конкретной фазе. По клику на маркер в тексте показывается вся резолюция целиком (comment) -
 * отдельного текста "про это место" не хранится (см. решение в VndApprovalStageQuote на бэке). */
export interface QuoteMarkInfo {
    /** Id VndApprovalStageQuote на бэке - глобально уникален, годится как React key. */
    id: number;
    documentTarget: RedactionViewTarget;
    /** Текст цитаты для поиска/подсветки в тексте документа (без обёртки "Цитата: «...»"). */
    text: string;
    stageId: number;
    approverName: string;
    approverUserId: number;
    phaseLabel: string;
    decision: ApprovalStageDecisionResponse;
    decidedAt: string | null;
    /** Резолюция целиком - именно её открывает CommentViewModal по клику на маркер. */
    comment: string;
    attachments: ApprovalStageAttachmentResponse[];
}

function marksForPhase(
    stage: ApprovalStageResponse,
    phaseLabel: string,
    decision: ApprovalStageDecisionResponse | null,
    comment: string | null,
    decidedAt: string | null,
    attachments: ApprovalStageAttachmentResponse[],
    quotes: {id: number; documentTarget: string; text: string}[],
): QuoteMarkInfo[] {
    if (!decision || !comment || quotes.length === 0) return [];
    return quotes.map((q) => ({
        id: q.id,
        documentTarget: q.documentTarget as RedactionViewTarget,
        text: q.text,
        stageId: stage.id,
        approverName: stage.approverName,
        approverUserId: stage.approverUserId,
        phaseLabel,
        decision,
        decidedAt,
        comment,
        attachments,
    }));
}

/** Все маркеры процесса согласования, по всем этапам и фазам, для указанной "вкладки"
 * документа (язык/ТИД/лист согласования/матрица разногласий) - см. RedactionViewTarget. */
export function collectQuoteMarks(
    process: ApprovalProcessResponse,
    documentTarget: RedactionViewTarget,
): QuoteMarkInfo[] {
    const marks: QuoteMarkInfo[] = [];

    for (const stage of process.stages) {
        marks.push(
            ...marksForPhase(
                stage, "Первичное согласование", stage.primaryDecision, stage.primaryComment,
                stage.primaryDecidedAt, stage.primaryAttachments, stage.primaryQuotes,
            ),
            ...marksForPhase(
                stage, "Повторное согласование", stage.repeatDecision, stage.repeatComment,
                stage.repeatDecidedAt, stage.repeatAttachments, stage.repeatQuotes,
            ),
            ...marksForPhase(
                stage, "Финальная выдержка", stage.finalHoldDecision, stage.finalHoldComment,
                stage.finalHoldDecidedAt, stage.finalHoldAttachments, stage.finalHoldQuotes,
            ),
        );
    }

    return marks.filter((m) => m.documentTarget === documentTarget);
}

/** Заголовок и метаданные решения для CommentViewModal, открытой по клику на маркер -
 * та же логика, что у StageCardView при клике "См. комментарий/замечания полностью". */
export function quoteMarkModalProps(mark: QuoteMarkInfo) {
    const meta = STAGE_DECISION_META[mark.decision];
    const title = meta.label === "Согласовано" ? "См. комментарий полностью" : "См. замечания полностью";
    return {
        title,
        approverName: mark.approverName,
        approverUserId: mark.approverUserId,
        decidedAt: mark.decidedAt,
        comment: mark.comment,
        attachments: mark.attachments,
        decisionLabel: meta.label,
        decisionBadgeClass: meta.badgeClass,
    };
}
