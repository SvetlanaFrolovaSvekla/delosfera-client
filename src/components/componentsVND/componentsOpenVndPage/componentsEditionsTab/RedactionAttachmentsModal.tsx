// Модалка со списком вложений выбранной редакции
import {createPortal} from "react-dom";
import {Download, Loader2, Paperclip, X} from "lucide-react";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

interface RedactionAttachmentsModalProps {
    redaction: VndRedactionResponse;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

export function RedactionAttachmentsModal({
                                              redaction,
                                              downloadingId,
                                              onDownload,
                                              onClose,
                                          }: RedactionAttachmentsModalProps) {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-[460px] rounded-[16px] bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <Paperclip size={19} strokeWidth={1.8}/>
                        </span>
                        <h2 className="text-[16px] font-bold text-[#1c2740]">
                            Вложения редакции {redaction.code}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    {redaction.attachmentFileIds.map((fid) => (
                        <button
                            key={fid}
                            type="button"
                            disabled={downloadingId === fid}
                            onClick={() => onDownload(fid, `Вложение_${fid}`)}
                            className="cursor-pointer flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] px-3 py-[10px] text-left text-[13px] text-[#3a4560] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb] disabled:opacity-60"
                        >
                            <Paperclip size={16} className="flex-none text-[#8b97ab]"/>
                            <span className="flex-1">Вложение #{fid}</span>
                            {downloadingId === fid ? (
                                <Loader2 size={14} className="flex-none animate-spin text-[#8b97ab]"/>
                            ) : (
                                <Download size={14} className="flex-none text-[#8b97ab]"/>
                            )}
                        </button>
                    ))}
                </div>

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