// Панель "Содержание" для просмотра файла, приложенного к статье инструкции
// (HelpAttachmentPreviewModal) — упрощённая копия RedactionContentsPanel (ВНД):
// строится из настоящих заголовков документа (стили Word "Заголовок 1/2/3...",
// см. utils/docxWork/docxHeadings.ts), клик скроллит к заголовку в уже
// отрендеренном docx-preview. Отдельная от ВНД-панели, как и остальные компоненты
// просмотра вложений статей (HelpAttachmentPreviewModal, а не AttachmentDocxPreviewModal
// из componentsVND) — файл читается с /help/files, а не с общего /files.
import {useEffect, useRef, useState} from "react";
import {ListTree, Loader2} from "lucide-react";
import {useDocxHeadings} from "@/hooks/vndHooks/useDocxHeadings.ts";
import type {DocxHeadingItem} from "@/utils/docxWork/docxHeadings.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

const LEVEL_PADDING: Record<DocxHeadingItem["level"], string> = {
    1: "pl-0",
    2: "pl-[18px]",
    3: "pl-[34px]",
};

const LEVEL_TEXT: Record<DocxHeadingItem["level"], string> = {
    1: "text-[13.5px] font-semibold tracking-[-0.01em] leading-[1.35] text-[#1c2740]",
    2: "text-[12.5px] font-medium tracking-[-0.005em] leading-[1.4] text-[#3a4560]",
    3: "text-[12px] font-normal leading-[1.4] text-[#5c6780]",
};

interface ContentsItemTitleProps {
    title: string;
    className: string;
}

/** Заголовок пункта содержания с line-clamp — тултип с полным текстом появляется только
 * при реальном обрезании (сравнением scrollHeight/clientHeight после рендера). */
function ContentsItemTitle({title, className}: ContentsItemTitleProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [truncated, setTruncated] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        setTruncated(el.scrollHeight > el.clientHeight + 1);
    }, [title]);

    const label = <span ref={ref} className={`${className} line-clamp-2`}>{title}</span>;

    if (!truncated) return label;

    return (
        <Tooltip content={title} side="right" className="min-w-0 flex-1">
            {label}
        </Tooltip>
    );
}

interface Props {
    /** ID приложенного файла — то же значение, что уходит в useDocxPreview модалки. */
    fileId: number | null;
    /** DOM-узел, в который отрендерен docx-preview (containerRef модалки) — нужен, чтобы
     * найти и проскроллить к заголовку по клику. */
    getContainer: () => HTMLDivElement | null;
}

export function HelpAttachmentContentsPanel({fileId, getContainer}: Props) {
    const {headings, loading, error} = useDocxHeadings(fileId, "help/files");

    const handleClick = (heading: DocxHeadingItem) => {
        const container = getContainer();
        if (!container) return;
        const matches = container.getElementsByClassName(heading.styleClass);
        const target = matches[heading.occurrenceIndex] as HTMLElement | undefined;
        target?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    return (
        <div className="flex h-full min-h-0 w-[260px] flex-none flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="flex items-center gap-[8px] border-b border-[#eef2f7] px-[14px] py-[15px]">
                <ListTree size={16} className="flex-none text-[#4e57d6]"/>
                <div className="text-[12.5px] font-bold leading-tight text-[#1c2740]">Содержание</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-[14px] py-[10px]">
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-[36px] text-center text-[12px] text-[#8b97ab]">
                        <Loader2 size={18} className="animate-spin text-[#c3ccd8]"/>
                        Загрузка содержания…
                    </div>
                )}

                {!loading && error && (
                    <div className="px-2 py-[24px] text-center text-[12px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                {!loading && !error && headings.length === 0 && (
                    <div className="px-2 py-[24px] text-center text-[12px] leading-[1.5] text-[#8b97ab]">
                        В документе не найдено заголовков, оформленных стилями Word («Заголовок 1»,
                        «Заголовок 2» и т. п.) — содержание строится по ним.
                    </div>
                )}

                {!loading && !error && headings.length > 0 && (
                    <ul className="flex flex-col gap-[3px]">
                        {headings.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => handleClick(item)}
                                    className={`cursor-pointer flex w-full items-center gap-[7px] rounded-[7px] py-[7px] pr-[6px] text-left hover:bg-[#f6f8fb] ${LEVEL_PADDING[item.level]}`}
                                >
                                    {item.level === 1 && (
                                        <span className="h-[5px] w-[5px] flex-none rounded-full bg-[#4e57d6]"/>
                                    )}
                                    <ContentsItemTitle title={item.title} className={LEVEL_TEXT[item.level]}/>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
