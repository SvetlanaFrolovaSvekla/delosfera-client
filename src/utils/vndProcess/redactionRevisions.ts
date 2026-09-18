// Утилиты для работы с версиями документа ОДНОЙ редакции в рамках процесса согласования -
// "Р1" (версия 0, исходная), "Р1.1" (версия 1, после первого исправления замечаний), "Р1.2" и
// т.д. Каждая версия, кроме самой последней/живой, зафиксирована снимком файлов (см.
// VndRedactionRevisionSnapshot на бэке, process.redactionSnapshots) - та же нумерация версий
// используется для цитат/замечаний (см. ApprovalStageQuoteResponse.revisionIndex).
import type {
    ApprovalProcessResponse,
    ApprovalStageQuoteResponse,
    VndRedactionRevisionSnapshotResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

/** Номер живой/текущей версии - совпадает с количеством уже сделанных снимков (каждый снимок
 * фиксирует версию ПЕРЕД тем, как её вытесняет следующая отправка после замечаний). */
export function getLiveRevisionIndex(process: ApprovalProcessResponse): number {
    return process.redactionSnapshots.length;
}

/** Сколько всего версий документа было в рамках этой редакции (включая живую/текущую). */
export function getRevisionCount(process: ApprovalProcessResponse): number {
    return getLiveRevisionIndex(process) + 1;
}

/** Подпись версии - "10296-Р1" для версии 0 (живая версия, если исправлений ещё не было),
 * "10296-Р1.1" для версии 1 и т.д. */
export function getRevisionLabel(redaction: VndRedactionResponse, revisionIndex: number): string {
    return revisionIndex === 0 ? redaction.code : `${redaction.code}.${revisionIndex}`;
}

/** Снимок, соответствующий версии revisionIndex - null для живой/текущей версии (для неё пока
 * нет снимка, она ещё не вытеснена следующей отправкой) или если снимок не найден. */
export function findSnapshotForRevision(
    process: ApprovalProcessResponse, revisionIndex: number,
): VndRedactionRevisionSnapshotResponse | null {
    return process.redactionSnapshots.find((s) => s.snapshotNumber === revisionIndex + 1) ?? null;
}

/** "Эффективная" редакция для просмотра версии revisionIndex - копия redaction с файловыми
 * полями, подменёнными на снимок (для прошлых версий) либо как есть (для живой/текущей) -
 * позволяет скормить произвольную версию напрямую в RedactionTextView/RedactionViewModal/
 * RedactionCompareModal без каких-либо изменений в них (они читают файлы документа прямо из
 * полей VndRedactionResponse). approvalSheetFileId всегда убираем у прошлых версий - лист
 * согласования формируется только для итоговой согласованной редакции и ни к одной из
 * промежуточных версий отношения не имеет. */
export function buildRevisionRedaction(
    process: ApprovalProcessResponse, redaction: VndRedactionResponse, revisionIndex: number,
): VndRedactionResponse {
    if (revisionIndex >= getLiveRevisionIndex(process)) return redaction;

    const snapshot = findSnapshotForRevision(process, revisionIndex);
    if (!snapshot) return redaction;

    return {
        ...redaction,
        code: getRevisionLabel(redaction, revisionIndex),
        docFileRuId: snapshot.docFileRuId ?? redaction.docFileRuId,
        docFileKgId: snapshot.docFileKgId,
        docFileEnId: snapshot.docFileEnId,
        tidFileId: snapshot.tidFileId,
        disagreementMatrixFileId: snapshot.disagreementMatrixFileId,
        approvalSheetFileId: null,
    };
}

/** Цитаты/замечания, относящиеся именно к версии revisionIndex (см.
 * ApprovalStageQuoteResponse.revisionIndex). Без documentTarget - все цитаты этой версии по
 * всем вкладкам документа сразу. */
export function getQuotesForRevision(
    process: ApprovalProcessResponse, revisionIndex: number, documentTarget?: string,
): ApprovalStageQuoteResponse[] {
    return process.allQuotes.filter((q) =>
        q.revisionIndex === revisionIndex && (documentTarget === undefined || q.documentTarget === documentTarget));
}

/** Список версий для селектора в UI - от самой старой (0) до живой/текущей, с готовыми
 * подписями. */
export function listRevisions(
    process: ApprovalProcessResponse, redaction: VndRedactionResponse,
): {revisionIndex: number; label: string; isLive: boolean}[] {
    const live = getLiveRevisionIndex(process);
    return Array.from({length: live + 1}, (_, revisionIndex) => ({
        revisionIndex,
        label: getRevisionLabel(redaction, revisionIndex),
        isLive: revisionIndex === live,
    }));
}
