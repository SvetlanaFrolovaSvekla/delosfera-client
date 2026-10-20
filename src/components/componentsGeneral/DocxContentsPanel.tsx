// Общая панель "Содержание" docx-документа - строится из настоящих заголовков (стили Word
// "Заголовок 1/2/3...", см. utils/docxWork/docxHeadings.ts), клик скроллит к заголовку в уже
// отрендеренном docx-preview. Используется через тонкие обёртки RedactionContentsPanel (ВНД) и
// HelpAttachmentContentsPanel (вложения статей инструкции) - они различаются только источником
// файла (basePath) и обвязкой (наличие кнопки закрытия, размеры панели).
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useDocxHeadings} from "@/hooks/vndHooks/useDocxHeadings.ts";
import type {DocxHeadingItem} from "@/utils/docxWork/docxHeadings.ts";
import {textMatchKey} from "@/utils/docxWork/docxOoxml.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ListTree, Loader2, X} from "lucide-react";

/** Абзац тела документа: docx-preview рисует колонтитулы (<header>/<footer>) на КАЖДЫЙ раздел и
 * сноски (<ol>) - их абзацы с тем же стилем раньше сдвигали порядковый номер */
function isBodyParagraph(el: Element): boolean {
    return el.tagName === "P" && !el.closest("header, footer, ol");
}

/** Находит DOM-узел заголовка: сперва по классу стиля + порядковому номеру среди абзацев тела
 * (с проверкой текста), иначе - по тексту абзаца. */
function findHeadingElement(container: HTMLElement, heading: DocxHeadingItem): HTMLElement | null {
    const matchesText = (el: Element) => {
        if (!heading.textKey) return true;
        const key = textMatchKey(el.textContent ?? "");
        return key === heading.textKey || key.startsWith(heading.textKey) || (key.length > 0 && heading.textKey.startsWith(key));
    };

    if (heading.styleClass) {
        const byClass = Array.from(container.getElementsByClassName(heading.styleClass)).filter(isBodyParagraph);
        const candidate = byClass[heading.occurrenceIndex];
        if (candidate && matchesText(candidate)) return candidate as HTMLElement;
    }

    if (!heading.textKey) return null;
    const paragraphs = Array.from(container.querySelectorAll("p")).filter(isBodyParagraph);
    const exact = paragraphs.filter((el) => textMatchKey(el.textContent ?? "") === heading.textKey);
    if (exact.length > 0) return (exact[heading.textOccurrenceIndex] ?? exact[0]) as HTMLElement;
    const partial = paragraphs.find(matchesText);
    return (partial as HTMLElement | undefined) ?? null;
}

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

/** Заголовок пункта содержания с line-clamp - при реальном обрезании текста (а не всегда,
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

export interface DocxContentsPanelProps {
    /** ID файла, содержание которого нужно построить. */
    fileId: number | null;
    /** Префикс API, с которого читается файл — "files" (по умолчанию, ВНД) или "help/files"
     * (вложения статей инструкции), см. useDocxHeadings. */
    basePath?: string;
    /** DOM-узел, в который отрендерен docx-preview — нужен, чтобы найти и проскроллить к
     * заголовку по клику. */
    getContainer: () => HTMLDivElement | null;
    /** Если задано — показывается кнопка закрытия панели в шапке (см. RedactionContentsPanel).
     * Без неё (HelpAttachmentContentsPanel) панель предполагается постоянно видимой колонкой. */
    onClose?: () => void;
    /** Классы на корневой контейнер — управляют шириной/высотой панели, т.к. использующие её
     * места встраивают по-разному (третья колонка фиксированной сетки, всплывающая панель,
     * постоянная боковая колонка). */
    className?: string;
}

export function DocxContentsPanel({
                                      fileId, basePath = "files", getContainer, onClose,
                                      className = "flex max-h-[750px] min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white",
                                  }: DocxContentsPanelProps) {
    const {t} = useTranslation();
    const {headings, loading, error} = useDocxHeadings(fileId, basePath);

    const handleClick = (heading: DocxHeadingItem) => {
        const container = getContainer();
        if (!container) return;
        const target = findHeadingElement(container, heading);
        target?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    return (
        <div className={className}>
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-[14px] py-[15px]">
                <div className="flex items-center gap-[8px]">
                    <ListTree size={16} className="flex-none text-[#4e57d6]"/>
                    <div className="min-w-0">
                        <div className="text-[12.5px] font-bold leading-tight text-[#1c2740]">
                            {/* Содержание */}
                            {t("docxContentsPanel.title")}
                        </div>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="cursor-pointer flex h-6 w-6 flex-none items-center justify-center rounded-[6px] text-[#8b97ab] hover:bg-[#f6f8fb] hover:text-[#3a4560]"
                    >
                        <X size={14}/>
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-[14px] py-[10px]">
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-[36px] text-center text-[12px] text-[#8b97ab]">
                        <Loader2 size={18} className="animate-spin text-[#c3ccd8]"/>
                        {/* Загрузка содержания… */}
                        {t("docxContentsPanel.loading")}
                    </div>
                )}

                {!loading && error && (
                    <div className="px-2 py-[24px] text-center text-[12px] text-[#c0392b]">
                        {error}
                    </div>
                )}

                {!loading && !error && headings.length === 0 && (
                    <div className="px-2 py-[24px] text-center text-[12px] leading-[1.5] text-[#8b97ab]">
                        {/* В документе не найдено заголовков, оформленных стилями Word («Заголовок 1», «Заголовок 2» и т. п.) — содержание строится по ним. */}
                        {t("docxContentsPanel.noHeadingsFound")}
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