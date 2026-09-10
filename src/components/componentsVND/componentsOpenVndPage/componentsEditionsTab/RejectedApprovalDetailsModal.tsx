// Модалка "Подробнее" по ссылке из подсказки "Эта редакция была отклонена при согласовании..."
// (см. RedactionsSidebar/RedactionListItem, wasRejected) - показывает весь маршрут отклонённого
// процесса согласования, зафиксированный на момент отклонения (сам процесс уже завершён, поэтому
// это чистый read-only снимок): кто на каком этапе что решил, с полными текстами резолюций/
// замечаний и вложениями - переиспользует ту же карточку маршрута (VndApprovalRouteView +
// StageCardView), что и вкладка "Ход согласования" для активного процесса.
import {useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle, X} from "lucide-react";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import type {RedactionViewTarget} from "@/utils/redactionLanguagePanelUtils.ts";
import {
    VndApprovalRouteView
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/VndApprovalRouteView.tsx";
import {
    RedactionViewModal
} from "@/components/componentsCoordination/CoordinationRouteConstructor/viewComponents/RedactionViewModal.tsx";

interface RejectedApprovalDetailsModalProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    process: ApprovalProcessResponse;
    onClose: () => void;
}

/** Просмотр документа, открытый кнопкой-лупой "Показать в тексте" рядом с цитатой (см.
 * StageCardView/VndApprovalRouteView.onShowQuoteInText) - тот же приём, что и в
 * VndCoordinationTab.handleShowQuoteInText, только здесь речь о завершённом (отклонённом)
 * процессе, а не о текущем ходе согласования. */
interface QuoteViewState {
    language: RedactionViewTarget;
    initialSearchQuery: string;
}

export function RejectedApprovalDetailsModal({vnd, redaction, process, onClose}: RejectedApprovalDetailsModalProps) {
    const [quoteView, setQuoteView] = useState<QuoteViewState | null>(null);

    const handleShowQuoteInText = (quote: {documentTarget: string; text: string}) => {
        setQuoteView({language: quote.documentTarget as RedactionViewTarget, initialSearchQuery: quote.text});
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1400px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none items-center gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#fdf1f1] text-[#c0392b]">
                        <AlertTriangle size={19} strokeWidth={1.8}/>
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                            Отклонённое согласование
                        </h2>
                        <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                            Инициатор: {process.initiatorName}
                            {process.initiatorPosition ? ` (${process.initiatorPosition})` : ""}
                            {process.completedAt ? ` · отклонено ${formatDateTime(process.completedAt)}` : ""}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto bg-[#fbfcfe] px-6 py-5">
                    <VndApprovalRouteView process={process} frameless onShowQuoteInText={handleShowQuoteInText}/>
                </div>
            </div>

            {quoteView && (
                <RedactionViewModal
                    vnd={vnd}
                    redaction={redaction}
                    initialLanguage={quoteView.language}
                    initialSearchQuery={quoteView.initialSearchQuery}
                    downloadingId={null}
                    onDownload={() => {}}
                    onClose={() => setQuoteView(null)}
                />
            )}
        </div>,
        document.body,
    );
}
