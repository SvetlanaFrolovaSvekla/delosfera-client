// Модалка "Просмотр документа" для произвольного вложения ВНД в формате .docx — упрощённый
// вариант RedactionTidModal/RedactionViewModal: один произвольный файл без языковых вкладок,
// без сравнения версий и разметки цитат — просто рендер содержимого через docx-preview
// (см. useDocxPreview). Вложения (в отличие от документов редакции/ТИД) не привязаны к
// конкретному "виду просмотра" (RedactionViewTarget), поэтому переиспользовать RedactionTextView
// здесь не получится — она принимает только эти виды.
import {createPortal} from "react-dom";
import {Download, FileText, Loader2, X} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";

interface AttachmentDocxPreviewModalProps {
    fileId: number;
    fileName: string;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
    onClose: () => void;
}

export function AttachmentDocxPreviewModal({
                                                fileId, fileName, downloadingId, onDownload, onClose,
                                            }: AttachmentDocxPreviewModalProps) {
    const {containerRef, loading, error} = useDocxPreview(fileId);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="flex h-full max-h-[calc(100vh-24px)] w-[95vw] max-w-[1500px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
                <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            <FileText size={19} strokeWidth={1.8}/>
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">
                                {fileName}
                            </h2>
                            <div className="mt-[2px] text-[11px] font-medium text-[#8b97ab]">
                                Просмотр вложения
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Tooltip content="Скачать документ" side="bottom">
                            <button
                                type="button"
                                disabled={downloadingId === fileId}
                                onClick={() => onDownload(fileId, fileName)}
                                className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {downloadingId === fileId ? (
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

                <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4">
                    {loading && (
                        <div className="flex flex-1 items-center justify-center gap-2 text-[13px] text-[#8b97ab]">
                            <Loader2 size={16} className="animate-spin"/>
                            Загрузка документа…
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-1 items-center justify-center text-[13px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                    <div ref={containerRef} className={loading || error ? "hidden" : ""}/>
                </div>
            </div>
        </div>,
        document.body
    );
}
