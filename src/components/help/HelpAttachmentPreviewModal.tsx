// Просмотр файла, приложенного к статье инструкции блоком "file" (например, .docx
// с полной инструкцией). Упрощённый вариант AttachmentDocxPreviewModal (ВНД): тот же
// рендер через docx-preview (useDocxPreview), но читает файл с /help/files, а не с
// общего /files — доступ там завязан на публикацию статьи, а не на правила ВНД
// (см. HelpController.GetFile).
import {useState} from "react";
import {createPortal} from "react-dom";
import {Download, FileText, Loader2, X} from "lucide-react";
import {useDocxPreview} from "@/hooks/vndHooks/useDocxPreview.ts";
import {helpService} from "@/service/helpService/helpService.ts";

interface Props {
    fileId: number;
    fileName: string;
    onClose: () => void;
}

export function HelpAttachmentPreviewModal({fileId, fileName, onClose}: Props) {
    const {containerRef, loading, error} = useDocxPreview(fileId, {endpoint: "help/files"});
    const [скачивается, setСкачивается] = useState(false);
    const [ошибкаСкачивания, setОшибкаСкачивания] = useState<string | null>(null);

    const скачать = async () => {
        setСкачивается(true);
        setОшибкаСкачивания(null);
        try {
            await helpService.downloadFile(fileId, fileName);
        } catch {
            setОшибкаСкачивания("Не удалось скачать файл");
        } finally {
            setСкачивается(false);
        }
    };

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
                                Просмотр файла
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {ошибкаСкачивания && (
                            <span className="text-[12px] text-[#c0392b]">{ошибкаСкачивания}</span>
                        )}
                        <button
                            type="button"
                            title="Скачать файл"
                            disabled={скачивается}
                            onClick={() => void скачать()}
                            className="cursor-pointer flex-none grid h-9 w-9 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {скачивается ? (
                                <Loader2 size={16} className="animate-spin"/>
                            ) : (
                                <Download size={16}/>
                            )}
                        </button>

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
