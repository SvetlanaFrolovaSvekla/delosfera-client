// Строка одного вложения резолюции — со своим тултипом на полное имя файла,
// если оно обрезано по ширине. Каждая строка
// отслеживает обрезку независимо (свой ref/своё состояние).
import {useLayoutEffect, useRef, useState} from "react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {downloadWithToast} from "@/utils/downloadFile.ts";
import {Paperclip} from "lucide-react";

export function AttachmentRow({fileId, fileName}: {fileId: number; fileName: string}) {
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

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
            <button
                type="button"
                onClick={() => void downloadWithToast(fileId, fileName)}
                className="cursor-pointer flex w-full items-center gap-1.5 rounded-[7px] border border-[#e5e9f0] bg-[#fbfcfe] px-2 py-1 text-left text-[11px] text-[#4e57d6] hover:border-[#4e57d6]/40 hover:bg-white"
            >
                <Paperclip size={11} className="flex-none"/>
                <span ref={textRef} className="truncate">{fileName}</span>
            </button>
        </Tooltip>
    );
}