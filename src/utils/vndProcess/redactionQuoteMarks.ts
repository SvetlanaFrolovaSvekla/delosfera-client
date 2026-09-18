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
import type {RedactionViewTarget} from "@/utils/vndProcess/redactionLanguagePanelUtils.ts";
import {findSnapshotForRevision, getLiveRevisionIndex} from "@/utils/vndProcess/redactionRevisions.ts";

/** "primary"/"repeat"/"finalHold" -> подпись фазы, как в PHASE_ORDER (RedactionViewModal) и
 * phaseLabel у collectQuoteMarks/collectAllStageComments ниже. */
const PHASE_LABEL_BY_KEY: Record<string, string> = {
    primary: "Первичное согласование",
    repeat: "Повторное согласование",
    finalHold: "Финальная выдержка",
};

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
    /** Версия документа редакции, к которой относится эта резолюция/цитата (см.
     * ApprovalStageQuoteResponse.revisionIndex, utils/vndProcess/redactionRevisions.ts) - нужна
     * при переходе "Показать в тексте" (см. VndCoordinationTab.handleShowQuoteInText), чтобы
     * открыть именно ту версию документа, к которой относилась цитата, а не текущую живую. */
    revisionIndex: number;
}

function marksForPhase(
    stage: ApprovalStageResponse,
    phaseLabel: string,
    decision: ApprovalStageDecisionResponse | null,
    comment: string | null,
    decidedAt: string | null,
    attachments: ApprovalStageAttachmentResponse[],
    quotes: {id: number; documentTarget: string; text: string}[],
    revisionIndex: number,
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
        revisionIndex,
    }));
}

/** Все маркеры процесса согласования, по всем этапам и фазам, для указанной "вкладки"
 * документа (язык/ТИД/лист согласования/матрица разногласий) - см. RedactionViewTarget.
 * ТОЛЬКО текущая/живая версия документа (process.stages.*Quotes сервер уже отфильтровал по
 * ней - см. VndApprovalService.ToQuoteResponses) - для произвольной прошлой версии используйте
 * collectQuoteMarksForRevision ниже. */
export function collectQuoteMarks(
    process: ApprovalProcessResponse,
    documentTarget: RedactionViewTarget,
): QuoteMarkInfo[] {
    const marks: QuoteMarkInfo[] = [];
    const liveRevisionIndex = getLiveRevisionIndex(process);

    for (const stage of process.stages) {
        marks.push(
            ...marksForPhase(
                stage, "Первичное согласование", stage.primaryDecision, stage.primaryComment,
                stage.primaryDecidedAt, stage.primaryAttachments, stage.primaryQuotes, liveRevisionIndex,
            ),
            ...marksForPhase(
                stage, "Повторное согласование", stage.repeatDecision, stage.repeatComment,
                stage.repeatDecidedAt, stage.repeatAttachments, stage.repeatQuotes, liveRevisionIndex,
            ),
            ...marksForPhase(
                stage, "Финальная выдержка", stage.finalHoldDecision, stage.finalHoldComment,
                stage.finalHoldDecidedAt, stage.finalHoldAttachments, stage.finalHoldQuotes, liveRevisionIndex,
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
    revisionIndex: number,
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
        revisionIndex,
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
    const liveRevisionIndex = getLiveRevisionIndex(process);

    for (const stage of process.stages) {
        comments.push(
            ...allCommentsForPhase(
                stage, "Первичное согласование", stage.primaryDecision, stage.primaryComment,
                stage.primaryDecidedAt, stage.primaryAttachments, stage.primaryQuotes, liveRevisionIndex,
            ),
            ...allCommentsForPhase(
                stage, "Повторное согласование", stage.repeatDecision, stage.repeatComment,
                stage.repeatDecidedAt, stage.repeatAttachments, stage.repeatQuotes, liveRevisionIndex,
            ),
            ...allCommentsForPhase(
                stage, "Финальная выдержка", stage.finalHoldDecision, stage.finalHoldComment,
                stage.finalHoldDecidedAt, stage.finalHoldAttachments, stage.finalHoldQuotes, liveRevisionIndex,
            ),
        );
    }

    return comments;
}

/** Резолюция (решение/комментарий/вложения) этапа stage для фазы phase, действовавшая ИМЕННО
 * при версии документа revisionIndex - для Primary это всегда живые поля stage (первичное
 * согласование решается один раз и никогда не архивируется, у его цитат revisionIndex всегда
 * 0). Для Repeat/FinalHold: если revisionIndex - это текущий/незавершённый круг, тоже живые
 * поля; если более ранний (уже завершённый предыдущей повторной отправкой) - решение ищется в
 * архиве process.phaseRounds по кругу, соответствующему снимку версии revisionIndex (см.
 * findSnapshotForRevision) - вложения архивных кругов недоступны (физически удаляются, см.
 * ClearPreviousRoundArtifactsAsync на бэке), поэтому для них возвращается пустой список.
 * null, если для этой версии решения по этой фазе не было вовсе (фаза ещё не наступила). */
function resolvePhaseResolution(
    process: ApprovalProcessResponse, stage: ApprovalStageResponse, phase: string, revisionIndex: number,
): {
    decision: ApprovalStageDecisionResponse | null;
    comment: string | null;
    decidedAt: string | null;
    attachments: ApprovalStageAttachmentResponse[];
} | null {
    if (phase === "primary") {
        // Первичное согласование оценивало ровно версию 0 ("Р1", самую первую поданную) - ни
        // при какой другой версии его резолюция "не соответствует" (см. doc-комментарий выше).
        if (revisionIndex !== 0) return null;
        return {
            decision: stage.primaryDecision, comment: stage.primaryComment,
            decidedAt: stage.primaryDecidedAt, attachments: stage.primaryAttachments,
        };
    }

    const liveRevisionIndex = getLiveRevisionIndex(process);
    if (revisionIndex === liveRevisionIndex) {
        return phase === "repeat"
            ? {
                decision: stage.repeatDecision, comment: stage.repeatComment,
                decidedAt: stage.repeatDecidedAt, attachments: stage.repeatAttachments,
            }
            : {
                decision: stage.finalHoldDecision, comment: stage.finalHoldComment,
                decidedAt: stage.finalHoldDecidedAt, attachments: stage.finalHoldAttachments,
            };
    }

    const snapshot = findSnapshotForRevision(process, revisionIndex);
    if (!snapshot || snapshot.phase !== phase) return null;
    const round = process.phaseRounds.find((r) => r.phase === phase && r.roundNumber === snapshot.roundNumber);
    const entry = round?.stageDecisions.find((d) => d.stageId === stage.id);
    if (!entry) return null;
    return {decision: entry.decision, comment: entry.comment, decidedAt: entry.decidedAt, attachments: []};
}

/** Маркеры цитат КОНКРЕТНОЙ версии документа редакции (revisionIndex), для указанной "вкладки" -
 * аналог collectQuoteMarks выше, но не ограничен живой/текущей версией - используется при
 * просмотре прошлой версии ("Р1.1" и т.п.) во время активного согласования (см.
 * resolvePhaseResolution). */
export function collectQuoteMarksForRevision(
    process: ApprovalProcessResponse, documentTarget: RedactionViewTarget, revisionIndex: number,
): QuoteMarkInfo[] {
    const stageById = new Map(process.stages.map((s) => [s.id, s]));
    const quotesByKey = new Map<string, {id: number; documentTarget: string; text: string}[]>();
    for (const q of process.allQuotes) {
        if (q.revisionIndex !== revisionIndex) continue;
        const key = `${q.stageId}:${q.phase}`;
        const list = quotesByKey.get(key);
        if (list) list.push(q); else quotesByKey.set(key, [q]);
    }

    const marks: QuoteMarkInfo[] = [];
    for (const [key, quotes] of quotesByKey) {
        const [stageIdStr, phase] = key.split(":");
        const stage = stageById.get(Number(stageIdStr));
        if (!stage) continue;
        const resolved = resolvePhaseResolution(process, stage, phase, revisionIndex);
        if (!resolved) continue;
        marks.push(...marksForPhase(
            stage, PHASE_LABEL_BY_KEY[phase] ?? phase, resolved.decision, resolved.comment,
            resolved.decidedAt, resolved.attachments, quotes, revisionIndex,
        ));
    }
    return marks.filter((m) => m.documentTarget === documentTarget);
}

/** ВСЕ комментарии/резолюции, действовавшие ИМЕННО при версии документа revisionIndex - аналог
 * collectAllStageComments выше, для панели "Комментарии" при просмотре прошлой версии. */
export function collectAllStageCommentsForRevision(
    process: ApprovalProcessResponse, revisionIndex: number,
): QuoteMarkInfo[] {
    const quotesByKey = new Map<string, {id: number; documentTarget: string; text: string}[]>();
    for (const q of process.allQuotes) {
        if (q.revisionIndex !== revisionIndex) continue;
        const key = `${q.stageId}:${q.phase}`;
        const list = quotesByKey.get(key);
        if (list) list.push(q); else quotesByKey.set(key, [q]);
    }

    const comments: QuoteMarkInfo[] = [];
    for (const stage of process.stages) {
        for (const phase of ["primary", "repeat", "finalHold"]) {
            const resolved = resolvePhaseResolution(process, stage, phase, revisionIndex);
            if (!resolved) continue;
            const quotes = quotesByKey.get(`${stage.id}:${phase}`) ?? [];
            comments.push(...allCommentsForPhase(
                stage, PHASE_LABEL_BY_KEY[phase] ?? phase, resolved.decision, resolved.comment,
                resolved.decidedAt, resolved.attachments, quotes, revisionIndex,
            ));
        }
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
