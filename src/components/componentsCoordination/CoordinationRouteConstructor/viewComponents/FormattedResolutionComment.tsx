// Рендерит текст резолюции/комментария согласующего, выделяя жирным строки вида
// 'Цитата: «...»' - вставленные через "+ Сослаться на текст редакции" (см. formatQuote в
// VndApproverResolutionPanel). В самом поле "Комментарий" при наборе текста это plain
// <textarea> (жирным быть не может по определению textarea) - выделение цветом/жирным
// применяется только здесь, при ЧТЕНИИ уже отправленной резолюции (CommentViewModal,
// StageCardView и т.п.).
import {Fragment} from "react";
import {Search} from "lucide-react";

// Строка целиком - "Цитата: «...»" (formatQuote всегда кладёт цитату на отдельную строку).
const QUOTE_LINE_RE = /^Цитата: «.*»$/;

export interface FormattedCommentQuoteRef {
    documentTarget: string;
    text: string;
}

export function FormattedResolutionComment({text, quotes, onShowInText}: {
    text: string;
    /** Цитаты этой же резолюции (см. ApprovalStageResponse.primaryQuotes/repeatQuotes/
     * finalHoldQuotes) - В ТОМ ЖЕ ПОРЯДКЕ, в котором они вставлялись в комментарий (порядок
     * вставки = порядок появления строк "Цитата: «...»" в тексте). Нужны, чтобы рядом с КАЖДОЙ
     * такой строкой нарисовать кнопку-лупу "Показать в тексте" именно для этой цитаты - одной
     * резолюции может быть вставлено несколько цитат, и раньше кнопка была только одна общая на
     * всю модалку (переходила всегда к первой цитате). */
    quotes?: FormattedCommentQuoteRef[];
    /** См. quotes выше - вызывается с конкретной цитатой, рядом с которой нажали на лупу. Без
     * этого пропа (или без quotes) кнопки не рисуются - только жирное/цветное выделение строки. */
    onShowInText?: (quote: FormattedCommentQuoteRef) => void;
}) {
    // Разбиваем по ЛЮБОМУ виду переноса строки (\n, \r\n, \r) - если комментарий содержит
    // Windows-переносы (\r\n), split("\n") оставлял хвостовой "\r" на конце каждой строки,
    // кроме последней. Из-за этого регулярка QUOTE_LINE_RE (заканчивающаяся на "$") переставала
    // совпадать с ЛЮБОЙ цитатой, кроме последней в комментарии - баг "выделяется синим только
    // последняя цитата" при нескольких вставленных цитатах.
    const lines = text.split(/\r\n|\r|\n/);
    let quoteIndex = 0;
    return (
        <>
            {lines.map((line, i) => {
                const isQuoteLine = QUOTE_LINE_RE.test(line);
                // Цитаты в тексте идут строго в порядке вставки (см. insertQuote в
                // VndApproverResolutionPanel - каждая новая цитата дописывается ниже предыдущей),
                // а массив quotes с бэка сохраняет тот же порядок (см. AttachDecisionQuotes на
                // бэке - добавляются в порядке QuotesJson, как их отправил фронт) - поэтому
                // N-я по счёту строка-цитата в тексте соответствует N-му элементу массива quotes.
                const quote = isQuoteLine ? quotes?.[quoteIndex] : undefined;
                if (isQuoteLine) quoteIndex++;

                return (
                    <Fragment key={i}>
                        {i > 0 && "\n"}
                        {isQuoteLine ? (
                            <>
                                <span className="font-bold text-[#4e57d6]">{line}</span>
                                {quote && onShowInText && (
                                    <button
                                        type="button"
                                        onClick={() => onShowInText(quote)}
                                        title="Показать в тексте"
                                        className="mx-1 inline-grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-[5px] bg-[#ececfc] align-middle text-[#4e57d6] hover:bg-[#dcdefa]"
                                    >
                                        <Search size={11}/>
                                    </button>
                                )}
                            </>
                        ) : line}
                    </Fragment>
                );
            })}
        </>
    );
}
