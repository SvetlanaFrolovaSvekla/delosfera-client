// Разбор реального содержания редакции ВНД для панели "Содержание" (RedactionContentsPanel).
//
// В шаблонах ВНД оглавление в самом документе не формируется (см. обсуждение с пользователем) -
// структура документа задаётся стилями абзацев Word. Для документов, изначально созданных в
// Delosfera, это встроенные стили "Заголовок 1", "Заголовок 2", ... Но документы, перенесённые
// из старой системы isrib, размечены её собственными стилями (см. ⚠ 08.09.2026 ниже) — поэтому
// "Содержание" строится не из текста документа, а из настоящих стилей — файл разбирается напрямую
// (JSZip: word/document.xml + word/styles.xml), в обход docx-preview (который заголовки как
// таковые не выделяет, только копирует форматирование).
//
// ⚠ 08.09.2026: в isrib структура документа (Часть/Раздел/Глава/Параграф/Статья) хранится не как
// видимое оформление, а как СКРЫТЫЕ абзацы-метки перед реальным заголовком — стили
// "__Структура ..." (tsSoderzhanie1..5), у которых в rPr стоит w:vanish (скрытый текст). Сам же
// видимый заголовок в теле документа обычно размечен обычным стилем текста (напр. wordsection1,
// с ручным форматированием — заглавные буквы и т.п.), без какого-либо признака "это заголовок".
// Поэтому для таких скрытых стилей заголовок для клика берётся не из самого скрытого абзаца
// (кликать по нему бессмысленно — он не отрисовывается видимо, scrollIntoView будет бить в
// невидимый узел), а из следующего непустого абзаца документа (см. resolveScrollTarget) — а вот
// текст пункта "Содержания" берётся из самой скрытой метки, он в isrib короче и чище (без
// дублирующей ручной нумерации/регистра, см. пример: скрытая метка "1.Общие положения" против
// видимого абзаца "1.     ОБЩИЕ ПОЛОЖЕНИЯ").
// Аналогичные, но видимые стили старой системы — "_Заголовок ..." (tkZagolovok1..5) — тоже
// распознаются на случай документов, где заголовок оформлен непосредственно ими.
//
// Чтобы клик по пункту содержания мог проскроллить к заголовку в уже отрендеренном docx-preview
// документе (см. RedactionTextView/useDocxPreview), для каждого заголовка вычисляется тот же CSS-
// класс, которым docx-preview помечает абзац с этим стилем (см. DOCX_PREVIEW_CLASS_NAME и
// processStyleName/escapeClassName в исходниках docx-preview) - это позволяет найти нужный узел
// в готовом DOM без повторного рендера.
import JSZip from "jszip";
import {DOCX_PREVIEW_CLASS_NAME} from "@/constants/docxPreview.ts";

export interface DocxHeadingItem {
    id: string;
    level: 1 | 2 | 3;
    title: string;
    /** CSS-класс абзаца этого заголовка в DOM, отрендеренном docx-preview (см. выше) */
    styleClass: string;
    /** Порядковый номер (с 0) среди заголовков документа с тем же styleClass — нескольким
     * заголовкам документа может соответствовать один и тот же стиль/класс. */
    occurrenceIndex: number;
}

/** Повторяет escapeClassName из docx-preview 1:1 — иначе вычисленный styleClass не совпадёт
 * с тем, что реально проставляет библиотека при рендере. */
function escapeDocxClassName(value: string): string {
    return value.replace(/[ .]+/g, "-").replace(/[&]+/g, "and").toLowerCase();
}

function buildHeadingStyleClass(styleId: string): string {
    return `${DOCX_PREVIEW_CLASS_NAME}_${escapeDocxClassName(styleId)}`;
}

/** OOXML-элементы всегда с префиксом "w:" в документах, реально созданных Word — но на всякий
 * случай (нестандартный экспорт без префикса) падаем на бестпрефиксный тег. */
function elementsByAnyTag(root: Document | Element, localName: string): Element[] {
    const prefixed = root.getElementsByTagName(`w:${localName}`);
    if (prefixed.length > 0) return Array.from(prefixed);
    return Array.from(root.getElementsByTagName(localName));
}

function directChild(parent: Element, localName: string): Element | null {
    for (const child of Array.from(parent.children)) {
        if (child.tagName === `w:${localName}` || child.tagName === localName) return child;
    }
    return null;
}

function attr(el: Element, name: string): string | null {
    return el.getAttribute(`w:${name}`) ?? el.getAttribute(name);
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
    // построения по code point'ам, поэтому граница после "глава"/"раздел" и т.п. никогда не
    // совпадала и весь паттерн проваливался на любом реальном имени стиля (например
    // "__Структура Глава (tsSoderzhanie3)" — так Word переименовывает кастомные стили при
    // конвертации HTML→docx, добавляя оригинальный css-класс в скобках). Заменяем \b на явный
    // лукахед "следующий символ — не буква".
    const match = /^_{1,2}(?:структура|заголовок)\s+(часть|раздел|глава|параграф|статья)(?![a-zа-яё])/i.exec(nameVal.trim());
    if (!match) return null;
    return ISRIB_LEVEL_BY_WORD[match[1].toLowerCase()] ?? null;
}

/** true, если стиль помечает скрытый ("невидимый") текст — w:vanish в rPr самого стиля. В isrib
 * так размечены стили-метки структуры документа (__Структура ...), см. ⚠ 08.09.2026 выше. */
function styleHasVanish(styleEl: Element): boolean {
    const rPrEl = directChild(styleEl, "rPr");
    return !!(rPrEl && directChild(rPrEl, "vanish"));
}

interface HeadingStyleInfo {
    /** styleId -> уровень заголовка 1..9 */
    levelByStyleId: Map<string, number>;
    /** styleId стилей, отмеченных как скрытый текст (w:vanish) — см. isribLegacyLevelFromName */
    hiddenStyleIds: Set<string>;
}

/** styleId -> уровень заголовка (1..9), определённый по styles.xml: по имени встроенного стиля
 * Word ("heading N" — внутреннее имя, одинаково независимо от локали интерфейса), по легаси-
 * стилям структуры isrib ("__Структура .../_Заголовок ...", см. ⚠ 08.09.2026 выше), по outlineLvl,
 * заданному в самом стиле, либо, для прочих стилей "на основе" одного из перечисленных (w:basedOn),
 * по цепочке наследования. */
function parseHeadingStyleLevels(stylesXml: Document): HeadingStyleInfo {
    const direct = new Map<string, number>();
    const basedOn = new Map<string, string>();
    const hiddenStyleIds = new Set<string>();

    for (const styleEl of elementsByAnyTag(stylesXml, "style")) {
        if (attr(styleEl, "type") !== "paragraph") continue;
        const styleId = attr(styleEl, "styleId");
        if (!styleId) continue;

        if (styleHasVanish(styleEl)) hiddenStyleIds.add(styleId);

        const basedOnEl = directChild(styleEl, "basedOn");
        const basedOnId = basedOnEl ? attr(basedOnEl, "val") : null;
        if (basedOnId) basedOn.set(styleId, basedOnId);

        const nameEl = directChild(styleEl, "name");
        const nameVal = (nameEl ? attr(nameEl, "val") : null)?.trim() ?? "";
        const nameLower = nameVal.toLowerCase();

        const nameMatch = /^heading\s*(\d+)$/.exec(nameLower);
        if (nameMatch) {
            direct.set(styleId, parseInt(nameMatch[1], 10));
            continue;
        }

        const isribLevel = isribLegacyLevelFromName(nameVal);
        if (isribLevel !== null) {
            direct.set(styleId, isribLevel);
            continue;
        }

        const pPrEl = directChild(styleEl, "pPr");
        const outlineLvlEl = pPrEl ? directChild(pPrEl, "outlineLvl") : null;
        const outlineVal = outlineLvlEl ? attr(outlineLvlEl, "val") : null;
        if (outlineVal !== null) {
            const lvl = parseInt(outlineVal, 10);
            if (!Number.isNaN(lvl) && lvl >= 0 && lvl <= 8) direct.set(styleId, lvl + 1);
        }
    }

    const resolved = new Map<string, number>(direct);
    const resolve = (styleId: string, depth: number): number | undefined => {
        if (resolved.has(styleId)) return resolved.get(styleId);
        if (depth > 10) return undefined;
        const parentId = basedOn.get(styleId);
        if (!parentId) return undefined;
        const level = resolve(parentId, depth + 1);
        if (level !== undefined) resolved.set(styleId, level);
        return level;
    };
    for (const styleId of basedOn.keys()) resolve(styleId, 0);

    return {levelByStyleId: resolved, hiddenStyleIds};
}

function paragraphText(p: Element): string {
    return elementsByAnyTag(p, "t").map((t) => t.textContent ?? "").join("");
}

function paragraphStyleId(p: Element): string | null {
    const pPr = directChild(p, "pPr");
    const pStyleEl = pPr ? directChild(pPr, "pStyle") : null;
    return pStyleEl ? attr(pStyleEl, "val") : null;
}

interface RawHeading {
    /** styleId и occurrenceIndex цели клика — см. ⚠ 08.09.2026: для скрытых стилей-меток это
     * следующий видимый абзац, а не сам абзац с текстом заголовка. */
    targetStyleId: string;
    targetOccurrenceIndex: number;
    level: number;
    title: string;
}

function extractHeadingParagraphs(documentXml: Document, styleInfo: HeadingStyleInfo): RawHeading[] {
    const paragraphs = elementsByAnyTag(documentXml, "p");

    // occurrenceIndexAt[i] — порядковый номер (с 0) абзаца paragraphs[i] среди всех абзацев
    // документа с тем же styleId, в порядке документа. Совпадает с тем, как docx-preview по
    // порядку навешивает класс стиля на DOM-узлы (см. RedactionContentsPanel.handleClick).
    const styleIdAt: (string | null)[] = new Array(paragraphs.length);
    const occurrenceIndexAt: number[] = new Array(paragraphs.length);
    const seenCounts = new Map<string, number>();
    for (let i = 0; i < paragraphs.length; i++) {
        const styleId = paragraphStyleId(paragraphs[i]);
        styleIdAt[i] = styleId;
        if (styleId) {
            const count = seenCounts.get(styleId) ?? 0;
            occurrenceIndexAt[i] = count;
            seenCounts.set(styleId, count + 1);
        } else {
            occurrenceIndexAt[i] = 0;
        }
    }

    /** Следующий непустой (по тексту) абзац после индекса i — цель для скролла скрытых меток
     * структуры isrib, у которых сам абзац не отрисовывается видимо. Ищем в разумных пределах,
     * чтобы случайно не улететь к следующему заголовку, если после метки много пустых абзацев. */
    const findNextVisibleParagraph = (i: number): number | null => {
        const limit = Math.min(i + 10, paragraphs.length);
        for (let j = i + 1; j < limit; j++) {
            if (paragraphText(paragraphs[j]).trim()) return j;
        }
        return null;
    };

    const result: RawHeading[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
        const styleId = styleIdAt[i];
        if (!styleId) continue;

        const level = styleInfo.levelByStyleId.get(styleId);
        if (level === undefined) continue;

        const title = paragraphText(paragraphs[i]).trim();
        if (!title) continue;

        let targetIndex = i;
        if (styleInfo.hiddenStyleIds.has(styleId)) {
            const nextVisible = findNextVisibleParagraph(i);
            if (nextVisible !== null) targetIndex = nextVisible;
        }
        const targetStyleId = styleIdAt[targetIndex];
        if (!targetStyleId) continue;

        result.push({
            targetStyleId,
            targetOccurrenceIndex: occurrenceIndexAt[targetIndex],
            level,
            title,
        });
    }
    return result;
}

/** Разбирает docx-файл редакции и возвращает список заголовков в порядке документа — то, что
 * реально должно попадать в панель "Содержание" вместо оглавления (которого в самом документе
 * нет и не будет). */
export async function extractDocxHeadings(blob: Blob): Promise<DocxHeadingItem[]> {
    const zip = await JSZip.loadAsync(blob);
    const documentEntry = zip.file("word/document.xml");
    if (!documentEntry) return [];
    const stylesEntry = zip.file("word/styles.xml");

    const parser = new DOMParser();
    const documentXml = parser.parseFromString(await documentEntry.async("text"), "application/xml");
    const stylesXml = stylesEntry
        ? parser.parseFromString(await stylesEntry.async("text"), "application/xml")
        : null;

    const styleInfo: HeadingStyleInfo = stylesXml
        ? parseHeadingStyleLevels(stylesXml)
        : {levelByStyleId: new Map(), hiddenStyleIds: new Set()};
    const raw = extractHeadingParagraphs(documentXml, styleInfo);

    return raw.map((h, index): DocxHeadingItem => ({
        id: `heading-${index}`,
        level: Math.min(h.level, 3) as 1 | 2 | 3,
        title: h.title,
        styleClass: buildHeadingStyleClass(h.targetStyleId),
        occurrenceIndex: h.targetOccurrenceIndex,
    }));
}
