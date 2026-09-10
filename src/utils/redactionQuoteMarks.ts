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
    /** ВСЕ цитаты этой же резолюции (фазы) - в порядке вставки, для кнопок-луп "Показать в
     * тексте" рядом с каждой строкой "Цитата: «...»" внутри CommentViewModal (см.
     * FormattedResolutionComment) - одна резолюция может ссылаться на несколько мест в тексте,
     * а не только на то первое, что попало в text/documentTarget выше. */
    allQuotes: {id: number; documentTarget: string; text: string}[];
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
        allQuotes: quotes,
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

/** Один комментарий/резолюция конкретного согласующего на конкретной фазе - для панели
 * "Комментарии" в RedactionViewModal (см. collectAllStageComments ниже). Структурно совпадает
 * с QuoteMarkInfo (переиспользует CommentViewModal/quoteMarkModalProps без изменений) - "text" и
 * "documentTarget" берутся из первой цитаты резолюции, если она есть, иначе "text" - пустая
 * строка (нет цитаты, значит и подсвечивать/искать в тексте нечего - такой комментарий в панели
 * открывается сразу целиком, а не подсказкой "показать в тексте", см. RedactionViewModal). */
function allCommentsForPhase(
    stage: ApprovalStageResponse,
    phaseLabel: string,
    decision: ApprovalStageDecisionResponse | null,
    comment: string | null,
    decidedAt: string | null,
    attachments: ApprovalStageAttachmentResponse[],
    quotes: {id: number; documentTarget: string; text: string}[],
): QuoteMarkInfo[] {
    if (!decision || !comment) return [];
    const first = quotes[0];
    return [{
        id: first?.id ?? -stage.id * 10 - phaseLabel.length, // синтетический, но стабильный id для комментариев без цитаты
        documentTarget: (first?.documentTarget as RedactionViewTarget) ?? "ru",
        text: first?.text ?? "",
        stageId: stage.id,
        approverName: stage.approverName,
        approverUserId: stage.approverUserId,
        phaseLabel,
        decision,
        decidedAt,
        comment,
        attachments,
        allQuotes: quotes,
    }];
}

/** ВСЕ комментарии/резолюции согласования (по всем этапам и фазам) - в отличие от
 * collectQuoteMarks выше, не ограничено только теми резолюциями, где согласующий сослался на
 * конкретный текст через "+ Сослаться на текст редакции", и не фильтруется по текущей вкладке
 * документа - использовать для панели "Комментарии" (список), а не для подсветки в самом
 * тексте (для неё по-прежнему нужен collectQuoteMarks - подсветить можно только то, что
 * процитировано и относится к открытой вкладке). Раньше эта панель строилась на
 * collectQuoteMarks и поэтому пропускала любого согласующего, оставившего резолюцию БЕЗ цитаты -
 * то есть подавляющее большинство обычных комментариев (баг "отображаются не все
 * комментарии согласующих"). */
export function collectAllStageComments(process: ApprovalProcessResponse): QuoteMarkInfo[] {
    const comments: QuoteMarkInfo[] = [];

    for (const stage of process.stages) {
        comments.push(
            ...allCommentsForPhase(
                stage, "Первичное согласование", stage.primaryDecision, stage.primaryComment,
                stage.primaryDecidedAt, stage.primaryAttachments, stage.primaryQuotes,
            ),
            ...allCommentsForPhase(
                stage, "Повторное согласование", stage.repeatDecision, stage.repeatComment,
                stage.repeatDecidedAt, stage.repeatAttachments, stage.repeatQuotes,
            ),
            ...allCommentsForPhase(
                stage, "Финальная выдержка", stage.finalHoldDecision, stage.finalHoldComment,
                stage.finalHoldDecidedAt, stage.finalHoldAttachments, stage.finalHoldQuotes,
            ),
        );
    }

    return comments;
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
        quotes: mark.allQuotes,
    };
}
