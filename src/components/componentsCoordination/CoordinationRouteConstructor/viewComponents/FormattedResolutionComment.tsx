// Рендерит текст резолюции/комментария согласующего, выделяя жирным цитаты
import {Fragment} from "react";
import {Search} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {escapeRegExp} from "@/utils/highlightText.tsx";

const QUOTE_LINE_RE = /^Цитата: «/;

export interface FormattedCommentQuoteRef {
    documentTarget: string;
    text: string;
    revisionIndex?: number;
}

// Считаем количество вхождений запроса в тексте - используется снаружи (в CommentViewModal),
// чтобы показать счётчик "N из M" и не зависеть от порядка рендера самих <mark>.
export function countTextMatches(text: string, query: string): number {
    const trimmed = query.trim();
    if (!trimmed) return 0;
    const regex = new RegExp(escapeRegExp(trimmed), "gi");
    return text.match(regex)?.length ?? 0;
}

// Разбивает строку на части по запросу поиска, оборачивая совпадения в <mark>.
// matchCounter - общий (сквозной по всему тексту резолюции) счётчик найденных
// совпадений: строк несколько, а нумерация "N из M" и активный матч - на весь текст.
function renderWithSearch(
    text: string,
    keyPrefix: string,
    query: string,
    activeMatchIndex: number,
    matchCounter: { value: number },
    registerMatchRef?: (index: number, el: HTMLElement | null) => void,
) {
    const trimmed = query.trim();
    if (!trimmed) return text;

    const regex = new RegExp(`(${escapeRegExp(trimmed)})`, "gi");
    const parts = text.split(regex);
    const lowerQuery = trimmed.toLowerCase();

    return parts.map((part, i) => {
        if (part === "" || part.toLowerCase() !== lowerQuery) {
            return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
        }

        const matchIndex = matchCounter.value++;
        const isActive = matchIndex === activeMatchIndex;

        return (
            <mark
                key={`${keyPrefix}-${i}`}
                ref={(el) => registerMatchRef?.(matchIndex, el)}
                className={
                    isActive
                        ? "rounded-[3px] bg-[#f5a623] px-[1px] text-white"
                        : "rounded-[3px] bg-[#fde3c4] px-[1px] text-[#8a4b00]"
                }
            >
                {part}
            </mark>
        );
    });
}

export function FormattedResolutionComment({
                                                text,
                                                quotes,
                                                onShowInText,
                                                searchQuery,
                                                activeMatchIndex = -1,
                                                onRegisterMatchRef,
                                            }: {
    text: string;
    quotes?: FormattedCommentQuoteRef[];
    onShowInText?: (quote: FormattedCommentQuoteRef) => void;
    /** Текст поиска по резолюции/комментарию - подсвечивает все вхождения в тексте ниже. */
    searchQuery?: string;
    /** Сквозной (по всему тексту, не по одной строке) индекс совпадения, которое сейчас
     * "активно" - оно выделяется отдельным цветом и на него ссылается счётчик "N из M". */
    activeMatchIndex?: number;
    /** Коллбэк для доступа к DOM-узлам найденных совпадений (используется, чтобы прокрутить
     * к активному совпадению кнопками "вверх/вниз" в CommentViewModal). */
    onRegisterMatchRef?: (index: number, el: HTMLElement | null) => void;
}) {
    const lines = text.split(/\r\n|\r|\n/);
    let quoteIndex = 0;
    const query = searchQuery ?? "";
    // Мутируемый счётчик, общий на весь проход по строкам - индексы совпадений должны идти
    // сквозным порядком сверху вниз по тексту, а не начинаться заново в каждой строке.
    const matchCounter = {value: 0};

    return (
        <>
            {lines.map((line, i) => {
                const isQuoteLine = QUOTE_LINE_RE.test(line);

                const quote = isQuoteLine ? quotes?.[quoteIndex] : undefined;
                if (isQuoteLine) quoteIndex++;

                return (
                    <Fragment key={i}>
                        {i > 0 && "\n"}
                        {isQuoteLine ? (
                            <>
                                {/*СМОТРЕТЬ В ТЕКСТЕ*/}
                                <span className="font-bold text-[#4e57d6]">
                                    {renderWithSearch(line, `q-${i}`, query, activeMatchIndex, matchCounter, onRegisterMatchRef)}
                                </span>
                                {quote && onShowInText && (
                                    <Tooltip content="Показать в тексте" side="top">
                                        <button
                                            type="button"
                                            onClick={() => onShowInText(quote)}
                                            className="mx-1 inline-grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-[5px] bg-[#ececfc] align-middle text-[#4e57d6] hover:bg-[#dcdefa]"
                                        >
                                            <Search size={11}/>
                                        </button>
                                    </Tooltip>
                                )}
                            </>
                        ) : (
                            renderWithSearch(line, `l-${i}`, query, activeMatchIndex, matchCounter, onRegisterMatchRef)
                        )}
                    </Fragment>
                );
            })}
        </>
    );
}
