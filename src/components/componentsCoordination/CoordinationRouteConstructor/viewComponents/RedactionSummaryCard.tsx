// Панель с редакциями (панель ниже "Данная редакция:")
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {RedactionViewTarget} from "@/utils/redactionLanguagePanelUtils.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {
    RedactionDocumentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionDocumentsPanel.tsx";
import {FileText, Calendar} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

interface RedactionSummaryCardProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    previousRedaction?: VndRedactionResponse;
    downloadingId: number | null;
    downloadError: string | null;
    onDownload: (fileId: number, name: string) => void;
    /*Открыть просмотр конкретной редакции (новой или предыдущей) на выбранном языке, либо ТИД*/
    onView?: (redaction: VndRedactionResponse, target: RedactionViewTarget) => void;
}

export function RedactionSummaryCard({
                                         vnd,
                                         redaction,
                                         previousRedaction,
                                         downloadingId,
                                         downloadError,
                                         onDownload,
                                         onView,
                                     }: RedactionSummaryCardProps) {
    return (
        <div
            className="mx-auto mb-5 w-full max-w-[1240px] overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            {downloadError && (
                <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                    {downloadError}
                </div>
            )}

            {previousRedaction ? (
                <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-[#eef2f7]">
                    <RedactionColumn
                        vnd={vnd}
                        redaction={redaction}
                        label="Новая редакция"
                        labelEmphasis=" (необходимо согласовать)"
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        onView={onView ? (lang) => onView(redaction, lang) : undefined}
                        className="border-b border-[#eef2f7] md:border-b-0"
                    />
                    <RedactionColumn
                        vnd={vnd}
                        redaction={previousRedaction}
                        label="Предыдущая редакция"
                        downloadingId={downloadingId}
                        onDownload={onDownload}
                        onView={onView ? (lang) => onView(previousRedaction, lang) : undefined}
                    />
                </div>
            ) : (
                <RedactionColumn
                    vnd={vnd}
                    redaction={redaction}
                    downloadingId={downloadingId}
                    onDownload={onDownload}
                    onView={onView ? (lang) => onView(redaction, lang) : undefined}
                />
            )}
        </div>
    );
}

/* Если редакция является первой для этого ВНД */
function RedactionColumn({
                             vnd, redaction, label, labelEmphasis, downloadingId, onDownload, onView, className = "",
                         }: {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    label?: string;
    labelEmphasis?: string;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onView?: (target: RedactionViewTarget) => void;
    className?: string;
}) {
    return (
        <div className={className}>
            {/* Шапка: код редакции и дата создания */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                    <FileText size={16} strokeWidth={1.8}/>
                </span>
                <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[#1c2740]">{redaction.code}</div>
                    {label && (
                        <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                            {label} {/* Новая редакция/ Предыдущая редакция */}
                            {labelEmphasis && (
                                /* Необходимо согласовать */
                                <span className="font-bold text-[#1c2740]">{labelEmphasis}</span>
                            )}
                        </div>
                    )}
                    <Tooltip content="Дата создания редакции" side="top">
                        <div className="mt-[2px] flex items-center gap-[5px] text-[11.5px] text-[#8b97ab]">
                            <Calendar size={12} className="flex-none"/>
                            {formatDate(redaction.createdAt)} {/* Дата создания */}
                        </div>
                    </Tooltip>
                </div>
            </div>

            {redaction.description && (
                <div className="border-b border-[#eef2f7] px-5 py-4">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        Описание редакции
                    </div>
                    <p className="text-[13px] leading-[1.6] text-[#3c424a]">{redaction.description}</p>
                </div>
            )}

            <RedactionDocumentsPanel
                vnd={vnd}
                selected={redaction}
                downloadingId={downloadingId}
                onDownload={onDownload}
                onView={onView}
            />
        </div>
    );
}