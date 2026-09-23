// Утилиты для работы с версиями документа ОДНОЙ редакции в рамках процесса согласования -
// "Р1" (версия 0, исходная), "Р1.1" (версия 1, после первого исправления замечаний), "Р1.2" и
// т.д. Каждая версия, кроме самой последней/живой, зафиксирована снимком файлов (см.
// VndRedactionRevisionSnapshot на бэке, process.redactionSnapshots) - та же нумерация версий
// используется для цитат/замечаний (см. ApprovalStageQuoteResponse.revisionIndex).
import type {
    ApprovalProcessResponse,
    ApprovalProcessStatus,
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
    // По ПОРЯДКУ снимков процесса, а не по равенству snapshotNumber === revisionIndex + 1: у
    // процессов, запущенных повторно по той же редакции (актуализация без изменений), сервер
    // раньше нумеровал снимки сквозь все процессы редакции - и версия "Р1.1" нового процесса не
    // находила свой снимок. Порядок снимков внутри процесса от этого не зависит.
    if (revisionIndex < 0) return null;
    const ordered = [...process.redactionSnapshots].sort((a, b) => a.snapshotNumber - b.snapshotNumber);
    return ordered[revisionIndex] ?? null;
}

/** Номер версии документа (см. revisionIndex), которую зафиксировал снимок - обратная к
 * findSnapshotForRevision операция. -1, если снимка нет в этом процессе. */
export function getSnapshotRevisionIndex(
    process: ApprovalProcessResponse, snapshotId: number,
): number {
    const ordered = [...process.redactionSnapshots].sort((a, b) => a.snapshotNumber - b.snapshotNumber);
    return ordered.findIndex((s) => s.id === snapshotId);
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

const SNAPSHOT_PHASE_LABEL: Record<string, string> = {
    primary: "замечания первичного согласования",
    repeat: "замечания повторного согласования",
    finalHold: "замечания финальной выдержки",
};

/** Синтетический id "редакции"-версии для списков выбора (RedactionCompareModal различает
 * варианты по id) - отрицательный, чтобы никогда не совпасть с настоящим id редакции. */
export function revisionOptionId(redactionId: number, revisionIndex: number): number {
    return -(redactionId * 1000 + revisionIndex + 1);
}

/** Все версии документа этой редакции ("Р1", "Р1.1", "Р1.2"...) в виде "редакций" для окна
 * сравнения (RedactionCompareModal) - чтобы проверяющие могли сравнить версию, к которой
 * относились их замечания, с исправленной. number подобран так, чтобы более поздняя версия
 * считалась "новее" (подписи "Новая"/"Предыдущая" в окне сравнения), description - что это за
 * версия. */
export function buildRevisionCompareOptions(
    process: ApprovalProcessResponse, redaction: VndRedactionResponse,
): VndRedactionResponse[] {
    const live = getLiveRevisionIndex(process);
    return Array.from({length: live + 1}, (_, revisionIndex) => {
        const base = buildRevisionRedaction(process, redaction, revisionIndex);
        const snapshot = revisionIndex < live ? findSnapshotForRevision(process, revisionIndex) : null;
        const phaseLabel = snapshot ? SNAPSHOT_PHASE_LABEL[snapshot.phase] ?? "" : "";
        const round = snapshot?.roundNumber && snapshot.roundNumber > 1 ? `, круг ${snapshot.roundNumber}` : "";
        const description = revisionIndex === live
            ? "Текущая версия"
            : `Прошлая версия — на неё получены ${phaseLabel}${round}`;
        return {
            ...base,
            id: revisionOptionId(redaction.id, revisionIndex),
            code: getRevisionLabel(redaction, revisionIndex),
            number: redaction.number + revisionIndex / 1000,
            description,
        };
    });
}

/** Процессы согласования, в которых у редакции появлялись промежуточные версии ("Р2", "Р2.1",
 * ...) - по одному (самому свежему) процессу на редакцию. */
function pickRevisionProcessByRedaction(
    processes: (ApprovalProcessResponse | null | undefined)[],
): Map<number, ApprovalProcessResponse> {
    const byRedaction = new Map<number, ApprovalProcessResponse>();
    for (const p of processes) {
        if (!p || !p.redactionSnapshots || p.redactionSnapshots.length === 0) continue;
        const prev = byRedaction.get(p.redactionId);
        if (!prev || p.id > prev.id) byRedaction.set(p.redactionId, p);
    }
    return byRedaction;
}

/** Статусы процесса, при которых он ещё идёт (живая версия - "текущая", а не "итоговая"). */
const ACTIVE_PROCESS_STATUSES: ApprovalProcessStatus[] = ["primary", "repeated", "final_hold", "revision_needed"];

/** Список редакций для окна сравнения (RedactionCompareModal), дополненный промежуточными
 * версиями документа, которые появлялись при согласовании с замечаниями: у редакции Р2 вместо
 * одной строки - "Р2" (исходная), "Р2.1", "Р2.2"... Живая/последняя версия остаётся САМОЙ
 * редакцией (тот же id - чтобы initialLeft/initialRight и выбор по id продолжали работать),
 * только с подписью версии ("Р2.2") и пояснением; прошлые версии - синтетические "редакции"
 * со снимками файлов (см. buildRevisionCompareOptions). Порядок - как у входного списка,
 * версии внутри редакции - от новой к старой. Редакции без промежуточных версий не меняются. */
export function expandRedactionsWithRevisions(
    redactions: VndRedactionResponse[],
    processes: (ApprovalProcessResponse | null | undefined)[],
): VndRedactionResponse[] {
    const byRedaction = pickRevisionProcessByRedaction(processes);
    if (byRedaction.size === 0) return redactions;

    return redactions.flatMap((redaction) => {
        const process = byRedaction.get(redaction.id);
        if (!process) return [redaction];

        const live = getLiveRevisionIndex(process);
        const liveOptionId = revisionOptionId(redaction.id, live);
        const isActive = ACTIVE_PROCESS_STATUSES.includes(process.status);
        return buildRevisionCompareOptions(process, redaction)
            .map((option) => option.id === liveOptionId
                ? {
                    ...redaction,
                    code: option.code,
                    number: option.number,
                    description: isActive
                        ? "Текущая версия"
                        : `Итоговая версия редакции ${redaction.code}`,
                }
                : option)
            .reverse();
    });
}

/** Самая свежая промежуточная (прошлая) версия редакции - для правой стороны окна сравнения по
 * умолчанию ("что исправили в ответ на последние замечания"). undefined, если версий не было. */
export function findPreviousRevisionOption(
    expanded: VndRedactionResponse[], redactionId: number,
): VndRedactionResponse | undefined {
    // Прошлые версии идут сразу за живой (см. порядок в expandRedactionsWithRevisions), их id -
    // revisionOptionId(redactionId, i) - отрицательные.
    const candidates = expanded.filter((r) =>
        r.id < 0 && Math.floor((-r.id - 1) / 1000) === redactionId);
    return candidates[0];
}
