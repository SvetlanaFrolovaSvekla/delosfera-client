// Рендерит текст резолюции/комментария согласующего, выделяя жирным строки вида
// 'Цитата: «...»' - вставленные через "+ Сослаться на текст редакции" (см. formatQuote в
// VndApproverResolutionPanel). В самом поле "Комментарий" при наборе текста это plain
// <textarea> (жирным быть не может по определению textarea) - выделение цветом/жирным
// применяется только здесь, при ЧТЕНИИ уже отправленной резолюции (CommentViewModal,
// StageCardView и т.п.).
import {Fragment} from "react";

// Строка целиком - "Цитата: «...»" (formatQuote всегда кладёт цитату на отдельную строку).
const QUOTE_LINE_RE = /^Цитата: «.*»$/;

export function FormattedResolutionComment({text}: {text: string}) {
    const lines = text.split("\n");
    return (
        <>
            {lines.map((line, i) => (
                <Fragment key={i}>
                    {i > 0 && "\n"}
                    {QUOTE_LINE_RE.test(line)
                        ? <span className="font-bold text-[#4e57d6]">{line}</span>
                        : line}
                </Fragment>
            ))}
        </>
    );
}
