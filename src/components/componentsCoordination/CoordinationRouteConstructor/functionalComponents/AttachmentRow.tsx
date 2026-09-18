// Строка одного вложения резолюции
import {useLayoutEffect, useRef, useState} from "react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {isPreviewableFile} from "@/utils/downloadFiles/fileNaming.ts";
import {Paperclip, Download, Eye} from "lucide-react";

export function AttachmentRow({
                                  fileId,
                                  fileName,
                                  onView,
                              }: {
    fileId: number;
    fileName: string;
    /** Открыть модалку просмотра вложения (кнопка рисуется только для форматов, которые умеет
     * показать AttachmentDocxPreviewModal - .docx/.xlsx/.pptx, см. isPreviewableFile). */
    onView: () => void;
}) {
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    const canPreview = isPreviewableFile(fileName);

    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el) return;

        const checkTruncation = () => setIsTruncated(el.scrollWidth > el.clientWidth);
        checkTruncation();

        const observer = new ResizeObserver(checkTruncation);
        observer.observe(el);
        return () => observer.disconnect();
    }, [fileName]);

    return (
        <Tooltip content={fileName} disabled={!isTruncated} side="top" className="w-full">
            {/* div, а не button - внутри два интерактивных button'а, вложенный <button> внутри
                <button> невалиден и ломает клики (событие всплывает сразу на оба обработчика) */}
            <div
                className="group flex w-full items-center gap-1.5 rounded-[7px]
                border border-[#e5e9f0] bg-[#fbfcfe] px-2 py-1 text-left text-[12px] text-[#4e57d6] hover:border-[#4e57d6]/40 hover:bg-white"
            >
                <Paperclip size={14} className="flex-none"/>
                <span ref={textRef} className="truncate flex-1 min-w-0">{fileName}</span>

                {canPreview && (
                    <Tooltip content="Просмотр вложения" side="bottom">
                        <button
                            type="button"
                            onClick={onView}
                            className="shrink-0 grid h-7 w-7 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#3a4560] cursor-pointer border-[#4e57d6]/40 hover:bg-[#ececfc] text-[#4e57d6] transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" strokeWidth={2}/>
                        </button>
                    </Tooltip>
                )}

                <Tooltip content="Скачать вложение" side="bottom">
                    <button
                        type="button"
                        onClick={() => void downloadWithToast(fileId, fileName)}
                        className="shrink-0 grid h-7 w-7 place-items-center rounded-[9px] border border-[#d7dee8] bg-white text-[#3a4560] cursor-pointer border-[#4e57d6]/40 hover:bg-[#ececfc] text-[#4e57d6] transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" strokeWidth={2}/>
                    </button>
                </Tooltip>
            </div>
        </Tooltip>
    );
}