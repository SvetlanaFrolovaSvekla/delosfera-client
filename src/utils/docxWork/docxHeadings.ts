// Разбор реального содержания редакции ВНД для панели "Содержание" (RedactionContentsPanel).
//
// В шаблонах ВНД оглавление в самом документе не формируется (см. обсуждение с пользователем) -
// структура документа задаётся стилями абзацев Word. Для документов, изначально созданных в
// Delosfera, это встроенные стили "Заголовок 1", "Заголовок 2", ... Но документы, перенесённые
// из старой системы isrib, размечены её собственными стилями (см. ⚠ 08.09.2026 ниже) — поэтому
// "Содержание" строится не из текста документа, а из настоящих стилей — файл разбирается напрямую
// (JSZip: word/document.xml + word/styles.xml + word/numbering.xml, см. docxOoxml.ts), в обход
// docx-preview (который заголовки как таковые не выделяет, только копирует форматирование).
//
// ⚠ 08.09.2026: в isrib структура документа (Часть/Раздел/Глава/Параграф/Статья) хранится не как
// видимое оформление, а как СКРЫТЫЕ абзацы-метки перед реальным заголовком — стили
// "__Структура ..." (tsSoderzhanie1..5), у которых в rPr стоит w:vanish (скрытый текст). Сам же
// видимый заголовок в теле документа обычно размечен обычным стилем текста (напр. wordsection1,
// с ручным форматированием — заглавные буквы и т.п.), без какого-либо признака "это заголовок".
// Поэтому для таких скрытых стилей заголовок для клика берётся не из самого скрытого абзаца
// (кликать по нему бессмысленно — он не отрисовывается видимо, scrollIntoView будет бить в
// невидимый узел), а из следующего непустого абзаца документа — а вот текст пункта
// "Содержания" берётся из самой скрытой метки, он в isrib короче и чище.
// Аналогичные, но видимые стили старой системы — "_Заголовок ..." (tkZagolovok1..5) — тоже
// распознаются на случай документов, где заголовок оформлен непосредственно ими.
//
// ⚠ 06.10.2026: учитываются ВСЕ способы, которыми в Word делают заголовок:
//  1. встроенные стили "Заголовок 1..9" (heading N) и любые стили "на основе" них;
//  2. любой стиль с "Уровнем структуры" (outlineLvl) — так Word сам решает, что попадёт в
//     навигацию и автооглавление;
//  3. "Уровень структуры", заданный прямо абзацу (Абзац → Уровень: Уровень 1...), а также
//     обратное — "Основной текст" у абзаца со стилем заголовка снимает его из содержания;
//  4. легаси-стили isrib (см. выше);
//  5. заголовки, оформленные "текстом" — обычный стиль + полужирный/ПРОПИСНЫЕ/по центру, с
//     номером ("1.", "1.2", "Раздел 2", автонумерация списка). Уровень берётся из глубины номера.
// Номер автонумерации (список, привязанный к стилю заголовка) добавляется к названию пункта —
// иначе "Заголовок 1" с автономером "1." показывался бы без номера.
//
// Чтобы клик по пункту содержания мог проскроллить к заголовку в уже отрендеренном docx-preview
// документе (см. RedactionTextView/useDocxPreview), для каждого заголовка вычисляется тот же CSS-
// класс, которым docx-preview помечает абзац с этим стилем, и порядковый номер среди абзацев тела
// документа с этим классом, а также текстовый ключ — для запасного поиска по тексту (см.
// DocxContentsPanel.findHeadingElement).
import {DOCX_PREVIEW_CLASS_NAME} from "@/constants/docxPreview.ts";
import {
    collectParagraphs, displayText, loadDocx, textMatchKey,
    type DocxParagraphInfo, type DocxStyles,
} from "@/utils/docxWork/docxOoxml.ts";

export interface DocxHeadingItem {
    id: string;
    level: 1 | 2 | 3;
    title: string;
    /** CSS-класс абзаца этого заголовка в DOM, отрендеренном docx-preview (см. выше); пустая
     * строка — у абзаца нет стиля (класс не навешивается), ищется только по тексту. */
    styleClass: string;
    /** Порядковый номер (с 0) среди абзацев ТЕЛА документа с тем же styleClass (колонтитулы не
     * считаются — docx-preview рисует их отдельно, на каждый раздел). */
    occurrenceIndex: number;
    /** Ключ текста целевого абзаца (см. textMatchKey) — для проверки найденного узла и запасного
     * поиска, если по классу узел не нашёлся/не совпал. */
    textKey: string;
    /** Порядковый номер (с 0) среди абзацев тела документа с тем же textKey. */
    textOccurrenceIndex: number;
}

/** Повторяет escapeClassName из docx-preview 1:1 — иначе вычисленный styleClass не совпадёт
 * с тем, что реально проставляет библиотека при рендере. */
function escapeDocxClassName(value: string): string {
    return value.replace(/[ .]+/g, "-").replace(/[&]+/g, "and").toLowerCase();
}

function buildHeadingStyleClass(styleId: string | null): string {
    return styleId ? `${DOCX_PREVIEW_CLASS_NAME}_${escapeDocxClassName(styleId)}` : "";
}

/** Уровень 1..5 по слову из названия легаси-стиля isrib ("Часть"/"Раздел"/.../"Статья") — этот
 * порядок соответствует иерархии ВНД в старой системе (см. ⚠ 08.09.2026 выше). */
const ISRIB_LEVEL_BY_WORD: Record<string, number> = {
    "часть": 1,
    "раздел": 2,
    "глава": 3,
    "параграф": 4,
    "статья": 5,
};

/** Стиль относится к легаси-разметке структуры isrib ("__Структура ..." / "_Заголовок ...") —
 * возвращает уровень 1..5, либо null, если имя не подходит под этот паттерн. */
function isribLegacyLevelFromName(nameVal: string): number | null {
    // ⚠ 08.09.2026: \b здесь не годится — в JS \w (а значит и \b) не распознаёт кириллицу без
    // построения по code point'ам. Заменяем \b на явный лукахед "следующий символ — не буква".
    const match = /^_{1,2}(?:структура|заголовок)\s+(часть|раздел|глава|параграф|статья)(?![a-zа-яё])/i.exec(nameVal.trim());
    if (!match) return null;
    return ISRIB_LEVEL_BY_WORD[match[1].toLowerCase()] ?? null;
}

/** Уровень заголовка по имени стиля: встроенное "heading N" (внутреннее имя, одинаково при любой
 * локали Word), локализованное "Заголовок N" (так бывает у стилей, созданных вручную или
 * пересохранённых другими редакторами — LibreOffice, Google Docs, OnlyOffice), isrib. */
function levelFromStyleName(name: string): number | null {
    const lower = name.trim().toLowerCase();
    const m = /^(?:heading|заголовок|header)\s*(\d)$/.exec(lower);
    if (m) {
        const n = parseInt(m[1], 10);
        return n >= 1 && n <= 9 ? n : null;
    }
    return isribLegacyLevelFromName(name);
}

/** styleId -> уровень заголовка (1..9) по стилю и цепочке basedOn. null — стиль не заголовочный;
 * 0 — стиль явно "Основной текст" (outlineLvl 9). */
function styleHeadingLevel(styles: DocxStyles, styleId: string | null, cache: Map<string, number | null>): number | null {
    if (!styleId) return null;
    if (cache.has(styleId)) return cache.get(styleId)!;
    let level: number | null = null;
    for (const s of styles.chain(styleId)) {
        const byName = levelFromStyleName(s.name);
        if (byName !== null) {
            level = byName;
            break;
        }
        if (s.outlineLvl !== null) {
            level = s.outlineLvl >= 0 && s.outlineLvl <= 8 ? s.outlineLvl + 1 : null;
            break;
        }
    }
    cache.set(styleId, level);
    return level;
}

/** Слова, с которых начинаются "служебные" жирные/прописные строки шапки ВНД — это не заголовки. */
const NOT_A_HEADING_START = /^(утвержд|согласова|принят|введен|примечани|исполнитель|подпис|дата|приказ\s*№|протокол\s*№|г\.\s|от\s+\d)/i;

const STRUCTURE_WORD_LEVEL: Record<string, number> = {
    "часть": 1,
    "раздел": 1,
    "глава": 2,
    "параграф": 3,
    "статья": 3,
    "подраздел": 2,
};

/** Номер, набранный текстом в начале строки: "1.", "1.2", "1.2.3.", "IV.", "А." */
const TYPED_NUMBER = /^((?:\d{1,3}\.)*\d{1,3})\.?\)?(?:\s+|$)|^([IVXLC]{1,6})\.(?:\s+|$)/;

/** Заголовок, оформленный "текстом" (без стиля заголовка): возвращает уровень или null. */
function manualHeadingLevel(p: DocxParagraphInfo): number | null {
    if (p.inTable || p.hidden) return null;
    const text = displayText(p);
    if (text.length < 2 || text.length > 200) return null;
    if (!/[A-Za-zА-Яа-яЁё]/.test(text)) return null;
    if (/[,;:]$/.test(text)) return null;
    if (text.split(/\s+/).length > 25) return null;

    const body = p.visibleText;
    if (NOT_A_HEADING_START.test(body)) return null;

    const typed = TYPED_NUMBER.exec(body);
    const structureMatch = /^(часть|раздел|подраздел|глава|параграф|статья)\s+[\dIVXLC]+/i.exec(body);
    const label = p.numbering?.label ?? null;

    // Текст после номера — не "несколько предложений" (у пункта "1.1. Настоящее Положение
    // определяет ... . Оно распространяется ..." это обычный нумерованный пункт, а не заголовок).
    const afterNumber = typed ? body.slice(typed[0].length) : body;
    if (/[.!?]\s+\S/.test(afterNumber)) return null;
    if (/\.$/.test(afterNumber) && afterNumber.length > 80) return null;

    const centered = p.jc === "center";
    const hasNumber = !!typed || !!label || !!structureMatch;
    const capsHeading = p.allCaps && body.replace(/[^A-Za-zА-Яа-яЁё]/g, "").length >= 4;

    const isHeading =
        (p.allBold && (hasNumber || capsHeading || centered)) ||
        (capsHeading && (centered || hasNumber));
    if (!isHeading) return null;

    if (structureMatch) return STRUCTURE_WORD_LEVEL[structureMatch[1].toLowerCase()] ?? 1;
    if (typed?.[1]) return typed[1].split(".").length;
    if (label && p.numbering) {
        const depth = (label.match(/\d+/g) ?? []).length;
        return depth > 0 ? depth : p.numbering.ilvl + 1;
    }
    return 1;
}

interface RawHeading {
    /** Индекс абзаца-цели клика — см. ⚠ 08.09.2026: для скрытых стилей-меток это следующий
     * видимый абзац, а не сам абзац с текстом заголовка. */
    targetIndex: number;
    level: number;
    title: string;
}

/** Разбирает docx-файл редакции и возвращает список заголовков в порядке документа — то, что
 * реально должно попадать в панель "Содержание" вместо оглавления (которого в самом документе
 * нет и не будет). */
export async function extractDocxHeadings(blob: Blob): Promise<DocxHeadingItem[]> {
    const parsed = await loadDocx(blob);
    if (!parsed) return [];
    const paragraphs = collectParagraphs(parsed);
    const levelCache = new Map<string, number | null>();

    // Порядковые номера абзацев по классу стиля и по тексту — так же, по порядку, docx-preview
    // навешивает класс стиля на DOM-узлы тела документа.
    const classOccurrence: number[] = new Array(paragraphs.length);
    const textOccurrence: number[] = new Array(paragraphs.length);
    const textKeys: string[] = new Array(paragraphs.length);
    {
        const byClass = new Map<string, number>();
        const byText = new Map<string, number>();
        paragraphs.forEach((p, i) => {
            const cls = buildHeadingStyleClass(p.styleId);
            const c = byClass.get(cls) ?? 0;
            classOccurrence[i] = c;
            byClass.set(cls, c + 1);

            const key = textMatchKey(p.rawText);
            textKeys[i] = key;
            const t = byText.get(key) ?? 0;
            textOccurrence[i] = t;
            byText.set(key, t + 1);
        });
    }

    const findNextVisibleParagraph = (i: number): number | null => {
        const limit = Math.min(i + 10, paragraphs.length);
        for (let j = i + 1; j < limit; j++) {
            if (!paragraphs[j].hidden && paragraphs[j].visibleText) return j;
        }
        return null;
    };

    const raw: RawHeading[] = [];
    /** Абзацы, уже ставшие целью скрытой метки isrib — их не нужно добавлять повторно как
     * "заголовок текстом" (видимый "1. ОБЩИЕ ПОЛОЖЕНИЯ" после метки "1.Общие положения"). */
    const consumed = new Set<number>();

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (consumed.has(i)) continue;

        let level: number | null;
        if (p.directOutlineLvl !== null) {
            // прямой "Уровень структуры" абзаца главнее стиля; 9 — "Основной текст"
            level = p.directOutlineLvl >= 0 && p.directOutlineLvl <= 8 ? p.directOutlineLvl + 1 : null;
        } else {
            level = styleHeadingLevel(parsed.styles, p.styleId ?? parsed.styles.defaultParagraphStyleId, levelCache);
            if (level === null) level = manualHeadingLevel(p);
        }
        if (level === null) continue;

        const isHiddenMarker = p.hidden;
        if (!isHiddenMarker && !p.visibleText) continue;
        const title = isHiddenMarker ? p.rawText : displayText(p);
        if (!title) continue;

        let targetIndex = i;
        if (isHiddenMarker) {
            const nextVisible = findNextVisibleParagraph(i);
            if (nextVisible === null) continue;
            targetIndex = nextVisible;
            consumed.add(nextVisible);
        }

        raw.push({targetIndex, level, title});
    }

    return raw.map((h, index): DocxHeadingItem => {
        const target = paragraphs[h.targetIndex];
        return {
            id: `heading-${index}`,
            level: Math.max(1, Math.min(h.level, 3)) as 1 | 2 | 3,
            title: h.title,
            styleClass: buildHeadingStyleClass(target.styleId),
            occurrenceIndex: classOccurrence[h.targetIndex],
            textKey: textKeys[h.targetIndex],
            textOccurrenceIndex: textOccurrence[h.targetIndex],
        };
    });
}
