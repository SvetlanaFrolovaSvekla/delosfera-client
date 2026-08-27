// Панель с содержанием редакции — третьей колонкой рядом с сайдбаром. Строится из настоящих
// заголовков документа (стили Word "Заголовок 1/2/3...", см. utils/docxHeadings.ts), а не из
// оглавления в начале файла — в редакциях ВНД такого оглавления нет.
import {useEffect, useRef, useState} from "react";
import {ListTree, Loader2, X} from "lucide-react";
import {useDocxHeadings} from "@/hooks/vndHooks/useDocxHeadings.ts";
import type {DocxHeadingItem} from "@/utils/docxHeadings.ts";
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

/** Заголовок пункта содержания с line-clamp — при реальном обрезании текста (а не всегда,
 * чтобы не мельтешить тултипом на коротких заголовках) оборачивается в Tooltip с полным
 * названием. Обрезание определяется сравнением scrollHeight/clientHeight после рендера. */
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

interface RedactionContentsPanelProps {
    /** ID файла, который сейчас отображается в RedactionTextView (тот же язык/документ) —
     * содержание строится по нему, а не по редакции целиком. */
    fileId: number | null;
    /** DOM-узел, в который отрендерен docx-preview (RedactionTextViewHandle.getContainer) —
     * нужен, чтобы найти и проскроллить к заголовку по клику. */
    getContainer: () => HTMLDivElement | null;
    onClose: () => void;
    /** Ограничение высоты панели — по умолчанию как во вкладке "Редакции" (max-h-[750px],
     * третья колонка фиксированной сетки). Передайте другое значение при встраивании в модалки
     * с иной доступной высотой — например, "max-h-full" во всплывающей панели поверх документа
     * (RedactionViewModal/RedactionCompareModal). */
    maxHeightClass?: string;
}

export function RedactionContentsPanel({
                                            fileId, getContainer, onClose, maxHeightClass = "max-h-[750px]",
                                        }: RedactionContentsPanelProps) {
    const {headings, loading, error} = useDocxHeadings(fileId);

    const handleClick = (heading: DocxHeadingItem) => {
        const container = getContainer();
        if (!container) return;
        const matches = container.getElementsByClassName(heading.styleClass);
        const target = matches[heading.occurrenceIndex] as HTMLElement | undefined;
        target?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    return (
        <div className={`flex ${maxHeightClass} min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white`}>
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-[14px] py-[15px]">
                <div className="flex items-center gap-[8px]">
                    <ListTree size={16} className="flex-none text-[#4e57d6]"/>
                    <div className="min-w-0">
                        <div className="text-[12.5px] font-bold leading-tight text-[#1c2740]">Содержание</div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="cursor-pointer flex h-6 w-6 flex-none items-center justify-center rounded-[6px] text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                >
                    <X size={14}/>
                </button>
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
