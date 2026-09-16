// Общая утилита поиска и подсветки текста внутри отрендеренного docx-preview документа —
// используется и во временном поиске по документу (useDocxTextSearch), и в персистентной
// подсветке цитат согласующих (useDocxQuoteMarks).
//
// ВАЖНО, почему это отдельная утилита, а не поузловой поиск "в лоб" (как было раньше в обоих
// хуках): docx-preview рендерит один абзац/строку НЕСКОЛЬКИМИ соседними текстовыми узлами —
// например, когда часть текста внутри абзаца выделена полужирным/курсивом, или когда строка
// разбита на несколько <w:r> при экспорте из Word. Поиск, ограниченный ОДНИМ текстовым узлом
// (regex.test(node.nodeValue)), тогда не находит совпадение вовсе, если искомый текст "разорван"
// на границе двух узлов — это и есть причина бага "Совпадений нет" при просмотре цитаты
// согласующего в тексте редакции: цитата, скопированная через выделение (window.getSelection),
// на исходном экране могла визуально быть одной строкой, а по факту лежит в 2+ узлах.
//
// Поэтому здесь текст всех узлов склеивается в одну строку (с картой смещений узел/оффсет),
// поиск идёт по ней целиком, а каждое найденное совпадение оборачивается через Range +
// surroundContents — это сохраняет исходную структуру DOM (в т.ч. границы форматирования)
// внутри совпадения, а не схлопывает его в один текстовый узел.
export interface CrossNodeMatch {
    /** Одно логическое совпадение может состоять из НЕСКОЛЬКИХ соседних <mark> — по одному на
     * каждый задетый текстовый узел, а не один <mark> на весь диапазон — см. подробное объяснение
     * в highlightCrossNodeMatches ниже (это и есть настоящая причина "Совпадений нет"/пропавшей
     * подсветки для цитаты длиннее одного абзаца или взятой из ячейки таблицы). Для совпадения,
     * целиком лежащего в одном узле (короткая цитата внутри одного абзаца), els.length === 1 —
     * ведёт себя как раньше. */
    els: HTMLElement[];
    text: string;
}

function collectTextNodes(root: HTMLElement, rejectTags: readonly string[] = []): Text[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            const tag = node.parentElement?.tagName;
            if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
            if (tag && rejectTags.includes(tag)) return NodeFilter.FILTER_REJECT;
            return node.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
    });
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    return nodes;
}

/** Экранирует спецсимволы regex в литеральном тексте. */
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ДИАГНОСТИКА для случая "Совпадений нет" (см. использование в useDocxTextSearch) - НИКАК не
 * влияет на сам поиск, только пишет в консоль браузера (F12 → Console) подсказки, почему запрос
 * не нашёлся, чтобы не гадать вслепую дальше. Различает два принципиально разных случая:
 * - "найдено при игнорировании ВСЕХ пробелов" = true → проблема именно в пробелах/переносах на
 *   границах (то, что уже пытались чинить \s* и допуском невидимых символов - но, возможно, есть
 *   ещё какой-то вид разрыва, который эти два фикса не покрывают - тогда в консоли будет видно,
 *   на каком конкретно месте регулярка спотыкается);
 * - = false → в документе физически ДРУГОЙ текст (отличаются какие-то видимые символы: другая
 *   редакция/язык, текст успели изменить после того как цитату сослались, обрезка на 1000
 *   символов backend'ом обрезала цитату посреди слова так, что "хвост" всё равно не совпадает
 *   и т.п.) - тут дело не в пробелах, и допуск по пробелам/невидимым символам тут не поможет. */
export function debugNoMatch(root: HTMLElement, query: string): void {
    try {
        const textNodes = collectTextNodes(root);
        const full = textNodes.map((n) => n.nodeValue ?? "").join("");
        const stripAll = (s: string) => s.replace(/\s+/g, "").replace(INVISIBLE_CHARS_RE, "").toLowerCase();
        const strippedQuery = stripAll(query);
        const strippedFull = stripAll(full);
        const foundIgnoringWhitespace = strippedQuery.length > 0 && strippedFull.includes(strippedQuery);

         
        console.warn("[поиск по документу] Совпадений нет для запроса:", query);
         
        console.warn("[поиск по документу] Длина запроса / текста документа (символов):", query.length, "/", full.length);
         
        console.warn(
            "[поиск по документу] Найдено при полном игнорировании пробелов и невидимых символов:",
            foundIgnoringWhitespace,
            foundIgnoringWhitespace
                ? "→ дело именно в пробелах/переносах на какой-то границе"
                : "→ в документе физически другой текст (не только пробелы) - пришлите этот запрос и фрагмент документа, где ожидалась цитата",
        );
        if (!foundIgnoringWhitespace) {
            // Ищем самый длинный ОБЩИЙ префикс запроса, который всё же нашёлся в документе -
            // помогает увидеть, ГДЕ именно расходится текст (после какого места).
            let lo = 0, hi = strippedQuery.length;
            while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2);
                if (strippedFull.includes(strippedQuery.slice(0, mid))) lo = mid; else hi = mid - 1;
            }
             
            console.warn(
                "[поиск по документу] Совпадающий префикс запроса (без пробелов) длиной", lo, "символов:",
                JSON.stringify(query.slice(0, Math.min(lo + 20, query.length))) + (lo < query.length ? "…" : ""),
            );
        }
    } catch (e) {
         
        console.warn("[поиск по документу] Ошибка диагностики:", e);
    }
}

// Символы, которые Word/docx часто вставляет ВНУТРИ слова, невидимо для глаза, но присутствующие
// как настоящие символы в тексте: мягкий перенос (soft hyphen, U+00AD — автоматическая
// расстановка переносов Word) и zero-width-символы (U+200B..U+200D, U+FEFF — word joiner и
// подобные, встречаются в документах, экспортированных/конвертированных через некоторые
// редакторы). Из-за таких символов цитата, скопированная через выделение (Selection API их не
// схлопывает), могла не находиться в документе даже после того, как поиск стал "сквозным" по
// узлам (см. highlightCrossNodeMatches ниже): сам текст в DOM мог содержать такой символ
// ПОСЕРЕДИНЕ слова там, где в запросе его нет (или наоборот), и посимвольное сравнение просто не
// совпадало ни в одном месте. Заданы через \u-escape, а не литеральными символами в исходнике —
// иначе невидимые символы в самом файле легко потерять/испортить при копировании и редактировании.
// eslint-disable-next-line no-misleading-character-class
const INVISIBLE_CHARS_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g;
// Между КАЖДОЙ парой символов слова допускаем необязательное появление любого из этих символов —
// это не ослабляет точность поиска (сравниваются те же самые видимые символы один в один), а
// только "прощает" вставки невидимых символов, которые пользователь не мог ни увидеть, ни
// скопировать осознанно.
const INVISIBLE_GAP = "[\\u00AD\\u200B\\u200C\\u200D\\uFEFF]*";

/** Строит регулярку по искомому тексту, где ЛЮБАЯ последовательность пробельных символов
 * (пробел/перенос строки/таб/неразрывный пробел) В ЗАПРОСЕ совпадает с ЛЮБЫМ количеством
 * пробельных символов В ДОКУМЕНТЕ, ВКЛЮЧАЯ НОЛЬ. Это ключевое отличие от "просто \s+ на \s+":
 * когда цитата выделена через window.getSelection() и захватывает границу двух блочных
 * элементов (конец одного <p>/<td>/<tr> и начало следующего - типичная ситуация для цитаты
 * длиннее одного абзаца, или для ячейки таблицы), браузер вставляет в getSelection().toString()
 * СИНТЕТИЧЕСКИЙ перенос строки на этой границе, которого НЕТ ни одним настоящим символом в самих
 * текстовых узлах DOM - соседние узлы двух абзацев идут в разметке впритык друг к другу, визуальный
 * отступ между ними достигается только CSS-отступами абзаца, а не текстовым узлом с пробелом.
 * collapseQuoteText схлопывает этот синтетический перенос в один пробел при сохранении цитаты -
 * и раньше регулярка ТРЕБОВАЛА (\s+, один-или-более) хотя бы один пробельный символ ИМЕННО в этом
 * месте документа, а такого символа там просто нет ни одного - отсюда и "Совпадений нет" именно
 * для цитат, зацепивших границу абзаца/ячейки (частый случай для сколько-нибудь длинной цитаты).
 * \s* (ноль-или-более) чинит это, оставаясь корректным и тогда, когда пробел в документе
 * действительно есть - он просто входит в совпадение.
 *
 * Дополнительно каждое "слово" (последовательность непробельных символов) экранируется
 * ПОСИМВОЛЬНО, с необязательным разрывом на невидимые служебные символы (см. INVISIBLE_GAP) между
 * каждой парой символов — см. комментарий у INVISIBLE_CHARS_RE выше. */
// "ё"/"е" в русских текстах на практике взаимозаменяемы (Word и большинство редакторов не
// настаивают на букве "ё", а копипаст/OCR/шрифтовая замена нередко превращают одну в другую) -
// цитата, скопированная пользователем через выделение, может отличаться от текста документа
// ТОЛЬКО этой буквой и не находиться вовсе. То же самое с дефисом/тире - Word автозаменой часто
// превращает обычный дефис "-" в короткое "–" или длинное "—" тире там, где пользователь (или
// цитата, набранная руками) видит обычный дефис. Оба смешения не меняют смысл текста и не должны
// приводить к "Совпадений нет" только из-за формы символа.
function charClass(ch: string): string {
    if (ch === "е" || ch === "Е" || ch === "ё" || ch === "Ё") return "[еЕёЁ]";
    if (ch === "-" || ch === "–" || ch === "—") return "[-–—]";
    return escapeRegExp(ch);
}

export function buildWhitespaceTolerantRegex(query: string, flags = "gi"): RegExp | null {
    const parts = query.split(/\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const built = parts.map((word) =>
        Array.from(word.replace(INVISIBLE_CHARS_RE, "")).map(charClass).join(INVISIBLE_GAP)
    );
    return new RegExp(built.join("\\s*"), flags);
}

/** Ищет непересекающиеся вхождения regex (может быть без флага "g" — здесь он выставится сам)
 * в СКЛЕЕННОМ тексте всех текстовых узлов внутри root и оборачивает каждое найденное совпадение
 * в один или несколько элементов, которые возвращает makeMark(matchedFragment).
 *
 * limit — не более скольких совпадений оборачивать (по умолчанию — все). Возвращает обёрнутые
 * совпадения строго в порядке появления в документе.
 *
 * ⚠ 14.09.2026 (реальная причина "Совпадений нет" для цитаты длиннее одного абзаца/ячейки
 * таблицы - см. также комментарий в шапке файла): раньше на КАЖДОЕ совпадение создавался ОДИН
 * Range на весь диапазон [start, end) целиком, который затем оборачивался в <mark> через
 * range.surroundContents(mark). Это работает, только если весь диапазон лежит в границах ОДНОГО
 * родителя без пересечения других элементов "наполовину". Как только совпадение пересекает
 * границу двух СОСЕДНИХ блочных элементов (конец одного <p>/<td> и начало следующего — то есть
 * ИМЕННО протяжённая цитата длиннее одного абзаца, или цитата, задевающая соседнюю ячейку
 * таблицы — самый частый случай для сколько-нибудь длинной цитаты), surroundContents кидает
 * "Failed to execute 'surroundContents' on 'Range': The Range has partially contains a non-Text
 * node" — потому что Range на такое совпадение неизбежно ЧАСТИЧНО захватывает оба блочных
 * элемента, не включая их целиком. Это исключение раньше просто ловилось (см. git-историю) и
 * совпадение целиком отбрасывалось — притом что buildWhitespaceTolerantRegex НАХОДИЛ его
 * абсолютно верно (отсюда и сбивающая с толку диагностика debugNoMatch: она видела текст в
 * документе и указывала на пробелы, хотя дело было не в них). Из-за этого ощущалось, что
 * поиск/подсветка "работает только в пределах одной строки/абзаца" — на самом деле работал
 * ВЕСЬ поиск, но ПОДСВЕТИТЬ найденное совпадение не получалось, как только оно выходило за
 * пределы одного абзаца/ячейки.
 *
 * Исправление: вместо одного Range на весь диапазон — по одному Range+<mark> НА КАЖДЫЙ задетый
 * текстовый узел (сегмент совпадения внутри этого узла). Range, ограниченный ОДНИМ текстовым
 * узлом, в принципе не может "наполовину" захватить не-текстовый узел, поэтому surroundContents
 * для него никогда не кидает это исключение. Одно логическое совпадение при этом может стать
 * несколькими соседними <mark> подряд (см. CrossNodeMatch.els) — визуально это по-прежнему
 * читается как один непрерывный подсвеченный фрагмент, просто "прерывающийся" ровно на границах
 * абзацев/ячеек, как и сам текст. */
/** Карта "склеенного" текста всех текстовых узлов внутри root + сами узлы и их смещения в этой
 * склейке. Вынесена отдельно (а не спрятана внутри highlightCrossNodeMatches), потому что
 * подсветке цитат НЕСКОЛЬКИХ согласующих (см. useDocxQuoteMarks) нужно искать МНОГО регулярок
 * по ОДНОЙ и той же, ещё не тронутой оборачиванием карте — сначала найти позиции ВСЕХ цитат
 * (в т.ч. пересекающихся друг с другом), и только потом решить, как их подсвечивать вместе
 * (см. findFirstMatch/wrapSpan ниже), вместо того чтобы оборачивать каждую по очереди, теряя
 * при этом информацию о пересечениях (как было раньше). */
export interface TextMap {
    textNodes: Text[];
    starts: number[];
    full: string;
}

export function buildTextMap(root: HTMLElement, rejectTags: readonly string[] = []): TextMap {
    const textNodes = collectTextNodes(root, rejectTags);
    let full = "";
    const starts: number[] = [];
    for (const node of textNodes) {
        starts.push(full.length);
        full += node.nodeValue ?? "";
    }
    return {textNodes, starts, full};
}

/** Первое непересекающееся вхождение regex в map.full (начиная с fromIndex) - только считает
 * позиции, НИКАК не трогает DOM. */
export function findFirstMatch(
    map: TextMap, regex: RegExp, fromIndex: number = 0,
): { start: number; end: number; text: string } | null {
    const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
    re.lastIndex = fromIndex;
    let m: RegExpExecArray | null;
    while ((m = re.exec(map.full))) {
        if (m[0].length === 0) {
            re.lastIndex++;
            continue;
        }
        return {start: m.index, end: m.index + m[0].length, text: m[0]};
    }
    return null;
}

/** Оборачивает диапазон [start, end) карты map в один или несколько СОСЕДНИХ элементов — по
 * одному на каждый задетый текстовый узел, а не один элемент на весь диапазон (см. подробное
 * объяснение в highlightCrossNodeMatches ниже). Если оборачиваете НЕСКОЛЬКО диапазонов одной и
 * той же карты подряд — делайте это от конца документа к началу (по убыванию start), иначе
 * оффсеты ещё не обработанных диапазонов, "живущих" в уже обрезанном узле, станут неверными
 * (см. вызовы в highlightCrossNodeMatches и useDocxQuoteMarks). */
export function wrapSpan(
    map: TextMap, start: number, end: number, makeMark: (matchedFragment: string) => HTMLElement,
): HTMLElement[] {
    const {textNodes, starts} = map;
    const locateIndex = (pos: number): number => {
        let idx = 0;
        for (let i = 0; i < starts.length; i++) {
            if (starts[i] <= pos) idx = i;
            else break;
        }
        return idx;
    };

    const startIdx = locateIndex(start);
    const endIdx = locateIndex(end - 1);

    const els: HTMLElement[] = [];
    for (let idx = startIdx; idx <= endIdx; idx++) {
        const node = textNodes[idx];
        const nodeStart = starts[idx];
        // node.length читаем ЖИВЫМ, а не из исходного замера — если этот же узел уже был
        // частично обрезан оборачиванием более позднего (по позиции в документе) диапазона той
        // же карты, актуальная длина корректно ограничит текущий сегмент его оставшейся
        // ("головной") частью.
        const nodeLen = node.length;
        const segStart = Math.max(start, nodeStart) - nodeStart;
        const segEnd = Math.min(end, nodeStart + nodeLen) - nodeStart;
        if (segEnd <= segStart) continue;
        try {
            const range = document.createRange();
            range.setStart(node, segStart);
            range.setEnd(node, segEnd);
            const mark = makeMark(node.nodeValue!.slice(segStart, segEnd));
            range.surroundContents(mark);
            els.push(mark);
        } catch {
            // Диапазон ограничен одним текстовым узлом - сюда в норме попадать не должно, но не
            // роняем весь поиск из-за одного непредвиденного фрагмента.
        }
    }
    return els;
}

export function highlightCrossNodeMatches(
    root: HTMLElement,
    regex: RegExp,
    makeMark: (matchedFragment: string) => HTMLElement,
    limit: number = Infinity,
    rejectTags: readonly string[] = [],
): CrossNodeMatch[] {
    const map = buildTextMap(root, rejectTags);
    if (map.textNodes.length === 0) return [];

    const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
    const spans: { start: number; end: number; text: string }[] = [];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(map.full))) {
        if (m[0].length === 0) {
            re.lastIndex++;
            continue;
        }
        spans.push({start: m.index, end: m.index + m[0].length, text: m[0]});
        if (spans.length >= limit) break;
    }
    if (spans.length === 0) return [];

    const result: CrossNodeMatch[] = [];
    // С конца документа к началу — см. комментарий у wrapSpan выше.
    for (let i = spans.length - 1; i >= 0; i--) {
        const {start, end, text} = spans[i];
        const els = wrapSpan(map, start, end, makeMark);
        if (els.length > 0) result.unshift({els, text});
    }

    return result;
}
