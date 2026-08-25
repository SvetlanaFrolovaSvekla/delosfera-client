// Карточка редакции, вынесенной на согласование
import {FileText, Calendar} from "lucide-react";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {
    RedactionDocumentsPanel
} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionDocumentsPanel.tsx";

interface RedactionSummaryCardProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    downloadError: string | null;
    onDownload: (fileId: number, name: string) => void;
}

export function RedactionSummaryCard({
                                         vnd, redaction, downloadingId, downloadError, onDownload,
                                     }: RedactionSummaryCardProps) {
    return (
        <div className="mx-auto mb-5 w-full max-w-[1240px] overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] bg-[#fbfcfe] px-5 py-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                    <FileText size={16} strokeWidth={1.8}/>
                </span>
                <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[#1c2740]">{redaction.code}</div>
                    <div className="mt-[2px] flex items-center gap-[5px] text-[11.5px] text-[#8b97ab]">
                        <Calendar size={12} className="flex-none"/>
                        {formatDate(redaction.createdAt)}
                    </div>
                </div>
                <span className="flex-none rounded-full bg-[#ececfc] px-[11px] py-[3px] text-[11px] font-semibold text-[#4e57d6]">
                    На согласовании
                </span>
            </div>

            {redaction.description && (
                <div className="border-b border-[#eef2f7] px-5 py-4">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        Описание редакции
                    </div>
                    <p className="text-[13px] leading-[1.6] text-[#3c424a]">{redaction.description}</p>
                </div>
            )}

            {downloadError && (
                <div className="border-b border-[#f2c2c2] bg-[#fdf1f1] px-5 py-[10px] text-[12px] text-[#c0392b]">
                    {downloadError}
                </div>
            )}

            <RedactionDocumentsPanel
                vnd={vnd}
                selected={redaction}
                downloadingId={downloadingId}
                onDownload={onDownload}
            />
        </div>
    );
}