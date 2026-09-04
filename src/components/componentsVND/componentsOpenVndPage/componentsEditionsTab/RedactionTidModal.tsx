// Модалка "Просмотр ТИД" — похожа на одиночную модалку просмотра редакции
// (RedactionViewModal), но без языковых вкладок — один файл ТИД на редакцию.
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {RedactionTextView} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionTextView.tsx";
import {createPortal} from "react-dom";
import {Download, Loader2, Table2, X} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

interface RedactionTidModalProps {
    vnd: VndResponse;
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

export function RedactionTidModal({vnd, redaction, downloadingId, onDownload, onClose}: RedactionTidModalProps) {
    const tidFileId = redaction.tidFileId;
    const tidFileName = `${redaction.code}_ТИД.docx`;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Table2 size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {redaction.code}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                Просмотр ТИД (Таблица изменений и дополнений)
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Tooltip content="Скачать документ" side="bottom">
                            <button
                                type="button"
                                disabled={tidFileId === null || downloadingId === tidFileId}
                                onClick={() => tidFileId !== null && onDownload(tidFileId, tidFileName)}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === tidFileId ? (
                                    <Loader2 size={16} className="animate-spin"/>
                                ) : (
                                    <Download size={16}/>
                                )}
                            </button>
                        </Tooltip>

                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-4">
                    {tidFileId === null ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                            <Table2 size={22} className="text-[#c3ccd8]"/>
                            Для этой редакции ТИД не требовался.
                        </div>
                    ) : (
                        <RedactionTextView
                            vnd={vnd}
                            selected={redaction}
                            activeLanguage="tid"
                            downloadingId={downloadingId}
                            onDownload={onDownload}
                            scrollX
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
