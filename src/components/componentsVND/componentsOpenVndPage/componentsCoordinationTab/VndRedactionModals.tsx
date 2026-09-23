// Модалки "Сравнение редакций" и "Просмотр одной редакции" - общие для видов согласующего и
// инициатора в VndCoordinationTab. Стартовая модалка запуска согласования (kind: "startApproval")
// сюда не входит - она показывается только пока process ещё не существует, до разделения на
// эти два вида (см. ветку "!process" в VndCoordinationTab).
import {
    RedactionCompareModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionCompareModal.tsx";
import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {CoordinationModal} from "./coordinationModalTypes.ts";
import type {QuoteMarkInfo} from "@/utils/vndProcess/redactionQuoteMarks.ts";
import {
    expandRedactionsWithRevisions, findPreviousRevisionOption,
} from "@/utils/vndProcess/redactionRevisions.ts";

interface VndRedactionModalsProps {
    vnd: VndResponse;
    redactions: VndRedactionResponse[];
    redaction: VndRedactionResponse | undefined;
    previousRedaction: VndRedactionResponse | undefined;
    modal: CoordinationModal | null;
    onClose: () => void;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    process: ApprovalProcessResponse;
    isProcessActive: boolean;
    /** Черновые (ещё не отправленные) замечания текущего согласующего - для подсветки в тексте
     * (см. RedactionViewModal.draftQuotes). */
    draftQuotes?: QuoteMarkInfo[];
}

export function VndRedactionModals({
    vnd, redactions, redaction, previousRedaction, modal, onClose, downloadingId, onDownload, process, isProcessActive,
    draftQuotes,
}: VndRedactionModalsProps) {
    // Редакции + промежуточные версии согласуемой редакции ("Р2", "Р2.1", "Р2.2"...), которые
    // появились при согласовании с замечаниями - чтобы их можно было сравнить между собой. По
    // умолчанию справа - предыдущая версия этой же редакции (что исправили в ответ на последние
    // замечания), а если версий ещё не было - предыдущая редакция, как раньше.
    const compareRedactions = modal?.kind === "compare"
        ? expandRedactionsWithRevisions(redactions, [process])
        : redactions;
    const compareLeft = redaction
        ? compareRedactions.find((r) => r.id === redaction.id) ?? redaction
        : undefined;
    const compareRight = redaction
        ? findPreviousRevisionOption(compareRedactions, redaction.id) ?? previousRedaction
        : undefined;

    return (
        <>
            {modal?.kind === "compare" && compareLeft && compareRight && (
                <RedactionCompareModal
                    vnd={vnd}
                    redactions={compareRedactions}
                    initialLeft={compareLeft}
                    initialRight={compareRight}
                    reviewedRedactionId={compareLeft.id}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onClose={onClose}
                />
            )}
            {modal?.kind === "view" && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={modal.redaction}
                    initialLanguage={modal.language}
                    initialSearchQuery={modal.initialSearchQuery}
                    initialRevisionIndex={modal.initialRevisionIndex}
                    initialFocusQuoteId={modal.initialFocusQuoteId}
                    draftQuotes={draftQuotes}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onClose={onClose}
                    onInsertQuote={modal.onInsertQuote}
                    approvalProcess={process}
                    quoteMarksClickable={isProcessActive}
                />
            )}
        </>
    );
}
