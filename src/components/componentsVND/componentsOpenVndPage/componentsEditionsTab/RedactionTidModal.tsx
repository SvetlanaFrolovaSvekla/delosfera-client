// Модалка просмотра/скачивания ТИД выбранной редакции
import {createPortal} from "react-dom";
import {Download, Loader2, Table2, X} from "lucide-react";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

interface RedactionTidModalProps {
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

export function RedactionTidModal({redaction, downloadingId, onDownload, onClose}: RedactionTidModalProps) {
    const tidFileId = redaction.tidFileId;
    const tidFileName = `${redaction.code}_ТИД.docx`;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Table2 size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            ТИД редакции {redaction.code}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {tidFileId === null ? (
                    <p className="text-[13px] leading-[1.6] text-[#8b97ab]">
                        Для этой редакции ТИД не требовался.
                    </p>
                ) : (
                    <button
                        type="button"
                        disabled={downloadingId === tidFileId}
                        onClick={() => onDownload(tidFileId, tidFileName)}
                        className="cursor-pointer flex w-full items-center gap-2 rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-left text-[13px] text-[#3a4560] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        <Table2 size={16} className="flex-none text-[#8b97ab]"/>
                        <span className="flex-1">Таблица изменений и дополнений</span>
                        {downloadingId === tidFileId ? (
                            <Loader2 size={14} className="flex-none animate-spin text-[#8b97ab]"/>
                        ) : (
                            <Download size={14} className="flex-none text-[#8b97ab]"/>
                        )}
                    </button>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="cursor-pointer h-[38px] rounded-[10px] border border-[#e5e9f0] px-4 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}