// Подготовка текста цитаты из выделения в документе редакции ("+ Сослаться на текст редакции") -
// общая для окна просмотра (RedactionViewModal, где строится "якорь" цитаты) и панели резолюции
// (VndApproverResolutionPanel, где цитата сохраняется и отображается). Раньше эти функции жили
// только в панели, и якорь пришлось бы строить по одному тексту, а сохранять - по другому.

/** Совсем длинные выделения (например, случайно выделенный целый раздел) в отображаемой строке
 * "Цитата: «...»" обрезаем - иначе текст резолюции превращается в нечитаемую простыню. */
export const MAX_QUOTE_DISPLAY_LENGTH = 600;

/** Длина текста, по которому цитата ищется в документе. Чем длиннее точная строка, которую нужно
 * найти как непрерывную подстроку, тем выше шанс, что внутри неё окажется разрыв, который поиск
 * не умеет "прощать" (перенос страницы, сноска, служебный элемент docx-preview). Короткий, но
 * всё ещё однозначный фрагмент (вместе с контекстом-"якорем", см. quoteAnchor.ts) находится
 * надёжно. */
export const MAX_QUOTE_MATCH_LENGTH = 300;

/** Схлопывает переносы строк/лишние пробелы - многострочный фрагмент документа, вставленный как
 * есть, в plain-text резолюции выглядит неряшливо. */
export function collapseQuoteText(rawText: string): string {
    return rawText.replace(/\s+/g, " ").trim();
}

/** Текст цитаты для поиска в документе и сохранения на бэке - схлопнутый, БЕЗ многоточия (чтобы
 * остаться точной подстрокой текста документа), не длиннее MAX_QUOTE_MATCH_LENGTH. */
export function quoteMatchText(rawText: string): string {
    const collapsed = collapseQuoteText(rawText);
    return collapsed.length > MAX_QUOTE_MATCH_LENGTH
        ? collapsed.slice(0, MAX_QUOTE_MATCH_LENGTH).trimEnd()
        : collapsed;
}

/** Текст цитаты для отображения в резолюции - обрезан до MAX_QUOTE_DISPLAY_LENGTH с многоточием. */
export function quoteDisplayText(rawText: string): string {
    const collapsed = collapseQuoteText(rawText);
    return collapsed.length > MAX_QUOTE_DISPLAY_LENGTH
        ? `${collapsed.slice(0, MAX_QUOTE_DISPLAY_LENGTH).trimEnd()}…`
        : collapsed;
}

/** Строка цитаты в тексте резолюции. Формат "Цитата: «...»" распознаётся при отображении
 * (FormattedResolutionComment) - менять его нельзя, иначе старые резолюции перестанут
 * отображаться с кнопками "Показать в тексте". */
export function formatQuoteLine(displayText: string): string {
    return `Цитата: «${displayText}»`;
}

/** Префикс строки с замечанием к фрагменту - идёт сразу после строки цитаты. */
export const QUOTE_NOTE_PREFIX = "Замечание: ";
