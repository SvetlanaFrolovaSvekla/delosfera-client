// "Якорь" цитаты согласующего в тексте отрендеренного docx (docx-preview) - по нему замечание
// надёжно "крепится" к ИМЕННО тому месту документа, на которое сослались, а не к первому
// попавшемуся совпадению текста.
//
// Зачем: раньше и подсветка цитат (useDocxQuoteMarks), и переход "Показать в тексте" искали
// цитату только по её тексту и брали ПЕРВОЕ вхождение. Для типовых фраз ("в соответствии с
// пунктом", "Общество", "настоящим Положением") это почти всегда было не то место - маркер
// рисовался в начале документа, а переход прыгал туда же. Кроме того, если инициатор чуть
// поправил текст (а цитата относится к этой же версии) или при выделении зацепился служебный
// разрыв, совпадения не находилось вовсе - и казалось, что "Показать в тексте" не работает.
//
// Как устроено (по образцу W3C TextQuoteSelector):
// - при цитировании (buildQuoteAnchor) вместе с текстом сохраняется немного текста ДО и ПОСЛЕ
//   выделения (prefix/suffix) и номер вхождения этого текста в документ (occurrence);
// - при поиске (resolveQuoteAnchor) находятся ВСЕ вхождения текста, и из них выбирается то,
//   чьё окружение лучше всего совпадает с сохранённым (при равенстве - ближайшее по номеру);
// - если точного текста в документе больше нет, ищется его начало/конец (первые/последние
//   слова) - так цитата всё равно находит "своё" место, пусть и приблизительно (exact=false).
//
// Всё сравнение контекста идёт по НОРМАЛИЗОВАННОМУ тексту (без пробелов и невидимых символов,
// без учёта регистра, ё=е, все тире/дефисы одинаковы) - по той же причине, по которой сам поиск
// терпим к пробелам (см. buildWhitespaceTolerantRegex): текст, взятый из выделения, и текст
// DOM-узлов расходятся именно в этих мелочах.
import {buildTextMap, buildWhitespaceTolerantRegex, type TextMap} from "@/utils/docxWork/domCrossNodeSearch.ts";

/** Сколько символов контекста сохраняется с каждой стороны цитаты. */
export const QUOTE_ANCHOR_CONTEXT_LENGTH = 64;

export interface QuoteAnchor {
    /** Текст цитаты (как ищется в документе). */
    text: string;
    prefix?: string | null;
    suffix?: string | null;
    occurrence?: number | null;
}

export interface QuoteAnchorContext {
    prefix: string;
    suffix: string;
    occurrence: number;
}

export interface ResolvedQuoteAnchor {
    start: number;
    end: number;
    /** false - точного текста цитаты в документе нет, найдено приблизительное место (по началу/
     * концу цитаты). Используется, чтобы честно подписать это в интерфейсе. */
    exact: boolean;
}

interface Span {
    start: number;
    end: number;
}

// eslint-disable-next-line no-misleading-character-class
const INVISIBLE_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g;

/** Нормализация для сравнения контекста (см. шапку файла). */
export function normalizeForCompare(s: string): string {
    return s
        .replace(INVISIBLE_RE, "")
        .replace(/\s+/g, "")
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[–—]/g, "-");
}

function findAllSpans(map: TextMap, regex: RegExp, from = 0, limit = 500): Span[] {
    const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
    re.lastIndex = from;
    const spans: Span[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(map.full))) {
        if (m[0].length === 0) {
            re.lastIndex++;
            continue;
        }
        spans.push({start: m.index, end: m.index + m[0].length});
        if (spans.length >= limit) break;
    }
    return spans;
}

function commonPrefixLength(a: string, b: string): number {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    return i;
}

function commonSuffixLength(a: string, b: string): number {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
}

/** Насколько окружение совпадения span в документе похоже на сохранённое в якоре. Берём с
 * запасом больше символов документа, чем длина контекста, - после нормализации (убраны пробелы)
 * они "сжимаются". */
function contextScore(map: TextMap, span: Span, anchor: QuoteAnchor): number {
    const window = QUOTE_ANCHOR_CONTEXT_LENGTH * 3;
    const before = normalizeForCompare(map.full.slice(Math.max(0, span.start - window), span.start));
    const after = normalizeForCompare(map.full.slice(span.end, span.end + window));
    const prefix = normalizeForCompare(anchor.prefix ?? "");
    const suffix = normalizeForCompare(anchor.suffix ?? "");
    return commonSuffixLength(before, prefix) + commonPrefixLength(after, suffix);
}

/** Из нескольких вхождений выбирает то, что лучше всего соответствует якорю. */
function pickBestSpan(map: TextMap, spans: Span[], anchor: QuoteAnchor): Span {
    if (spans.length === 1) return spans[0];

    const hasContext = !!(anchor.prefix || anchor.suffix);
    const occurrence = typeof anchor.occurrence === "number" && anchor.occurrence >= 0 ? anchor.occurrence : null;

    if (!hasContext) {
        return occurrence !== null ? spans[Math.min(occurrence, spans.length - 1)] : spans[0];
    }

    let best = spans[0];
    let bestScore = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    spans.forEach((span, index) => {
        const score = contextScore(map, span, anchor);
        const distance = occurrence !== null ? Math.abs(index - occurrence) : index;
        if (score > bestScore || (score === bestScore && distance < bestDistance)) {
            best = span;
            bestScore = score;
            bestDistance = distance;
        }
    });
    return best;
}

function wordsOf(text: string): string[] {
    return text.split(/\s+/).map((w) => w.trim()).filter(Boolean);
}

/** Размеры "окна" из первых/последних слов цитаты для приблизительного поиска - от длинного
 * (надёжнее) к короткому (находится чаще), не короче 3 слов и строго короче всей цитаты. */
function windowSizes(wordCount: number): number[] {
    const sizes = [12, 8, 5, 3].map((n) => Math.min(n, wordCount - 1)).filter((n) => n >= 3);
    return Array.from(new Set(sizes));
}

/** Приблизительный поиск, когда точного текста цитаты в документе нет: по первым словам (и
 * затем - по последним, чтобы найти конец), либо только по последним словам. */
function resolveApproximately(map: TextMap, anchor: QuoteAnchor, text: string): ResolvedQuoteAnchor | null {
    const words = wordsOf(text);
    if (words.length < 4) return null;
    // Насколько далеко от начала может оказаться конец цитаты - с запасом на правки текста.
    const maxLength = Math.round(text.length * 1.6) + 40;

    for (const n of windowSizes(words.length)) {
        const headRe = buildWhitespaceTolerantRegex(words.slice(0, n).join(" "));
        const headSpans = headRe ? findAllSpans(map, headRe) : [];
        if (headSpans.length > 0) {
            const head = pickBestSpan(map, headSpans, {...anchor, suffix: null});
            let end = head.end;
            const tailRe = buildWhitespaceTolerantRegex(words.slice(-n).join(" "));
            if (tailRe) {
                const tail = findAllSpans(map, tailRe, head.end, 1)[0];
                if (tail && tail.end - head.start <= maxLength) end = tail.end;
            }
            return {start: head.start, end, exact: false};
        }

        const tailRe = buildWhitespaceTolerantRegex(words.slice(-n).join(" "));
        const tailSpans = tailRe ? findAllSpans(map, tailRe) : [];
        if (tailSpans.length > 0) {
            const tail = pickBestSpan(map, tailSpans, {...anchor, prefix: null});
            return {start: tail.start, end: tail.end, exact: false};
        }
    }
    return null;
}

/** Находит место цитаты в документе (см. шапку файла). null - не найдено даже приблизительно
 * (например, открыта другая вкладка/версия документа, где этого текста нет вовсе). */
export function resolveQuoteAnchor(map: TextMap, anchor: QuoteAnchor): ResolvedQuoteAnchor | null {
    const text = anchor.text.trim();
    if (!text || map.full.length === 0) return null;

    const regex = buildWhitespaceTolerantRegex(text);
    if (regex) {
        const spans = findAllSpans(map, regex);
        if (spans.length > 0) {
            const best = pickBestSpan(map, spans, anchor);
            return {start: best.start, end: best.end, exact: true};
        }
    }
    return resolveApproximately(map, anchor, text);
}

/** Позиция (в склеенном тексте map.full) начала диапазона выделения. */
function rangeStartToIndex(map: TextMap, range: Range): number | null {
    const {startContainer, startOffset} = range;
    if (startContainer.nodeType === Node.TEXT_NODE) {
        const i = map.textNodes.indexOf(startContainer as Text);
        if (i >= 0) return map.starts[i] + Math.min(startOffset, map.textNodes[i].length);
    }
    // Начало выделения - на границе элемента (например, выделение начато с начала абзаца):
    // берём первый текстовый узел, который лежит не раньше начала диапазона.
    for (let i = 0; i < map.textNodes.length; i++) {
        try {
            if (range.comparePoint(map.textNodes[i], 0) >= 0) return map.starts[i];
        } catch {
            // узел из другого документа/отсоединён - пропускаем
        }
    }
    return null;
}

/** Строит контекст якоря для только что выделенного пользователем фрагмента (режим
 * "Сослаться на текст редакции"). text - уже подготовленный текст цитаты (тот, что будет
 * сохранён и потом искаться). null - если по какой-то причине фрагмент не нашёлся в DOM (тогда
 * цитата сохраняется без якоря и ищется по тексту, как раньше). */
export function buildQuoteAnchor(root: HTMLElement, range: Range | null, text: string): QuoteAnchorContext | null {
    try {
        const map = buildTextMap(root);
        const regex = buildWhitespaceTolerantRegex(text);
        if (!regex) return null;
        const spans = findAllSpans(map, regex, 0, 5000);
        if (spans.length === 0) return null;

        const pos = range ? rangeStartToIndex(map, range) : null;
        let index = 0;
        if (pos !== null) {
            let bestDistance = Number.POSITIVE_INFINITY;
            spans.forEach((span, i) => {
                const distance = Math.abs(span.start - pos);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    index = i;
                }
            });
        }
        const span = spans[index];
        return {
            prefix: map.full.slice(Math.max(0, span.start - QUOTE_ANCHOR_CONTEXT_LENGTH), span.start),
            suffix: map.full.slice(span.end, span.end + QUOTE_ANCHOR_CONTEXT_LENGTH),
            occurrence: index,
        };
    } catch {
        return null;
    }
}
