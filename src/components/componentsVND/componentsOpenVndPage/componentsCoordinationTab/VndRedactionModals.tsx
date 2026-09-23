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
    return (
        <>
            {modal?.kind === "compare" && redaction && previousRedaction && (
                <RedactionCompareModal
                    vnd={vnd}
                    redactions={redactions}
                    initialLeft={redaction}
                    initialRight={previousRedaction}
                    reviewedRedactionId={redaction.id}
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
