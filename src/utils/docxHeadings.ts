// Разбор реального содержания редакции ВНД для панели "Содержание" (RedactionContentsPanel).
//
// В шаблонах ВНД оглавление в самом документе не формируется (см. обсуждение с пользователем) -
// структура документа задаётся стилями абзацев Word ("Заголовок 1", "Заголовок 2", ...), как и
// принято в самом Word. Поэтому "Содержание" строится не из текста документа, а из настоящих
// стилей — файл разбирается напрямую (JSZip: word/document.xml + word/styles.xml), в обход
// docx-preview (который заголовки как таковые не выделяет, только копирует форматирование).
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

/** styleId -> уровень заголовка (1..9), определённый по styles.xml: либо по имени стиля
 * ("heading N" — внутреннее имя встроенных стилей Word одинаково независимо от локали
 * интерфейса), либо, для нестандартных стилей "на основе" заголовка (w:basedOn), по цепочке
 * наследования, либо по outlineLvl, заданному в самом стиле. */
function parseHeadingStyleLevels(stylesXml: Document): Map<string, number> {
    const direct = new Map<string, number>();
    const basedOn = new Map<string, string>();

    for (const styleEl of elementsByAnyTag(stylesXml, "style")) {
        if (attr(styleEl, "type") !== "paragraph") continue;
        const styleId = attr(styleEl, "styleId");
        if (!styleId) continue;

        const basedOnEl = directChild(styleEl, "basedOn");
        const basedOnId = basedOnEl ? attr(basedOnEl, "val") : null;
        if (basedOnId) basedOn.set(styleId, basedOnId);

        const nameEl = directChild(styleEl, "name");
        const nameVal = (nameEl ? attr(nameEl, "val") : null)?.trim().toLowerCase() ?? "";
        const nameMatch = /^heading\s*(\d+)$/.exec(nameVal);
        if (nameMatch) {
            direct.set(styleId, parseInt(nameMatch[1], 10));
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

    return resolved;
}

function paragraphText(p: Element): string {
    return elementsByAnyTag(p, "t").map((t) => t.textContent ?? "").join("");
}

interface RawHeading {
    styleId: string;
    level: number;
    title: string;
}

function extractHeadingParagraphs(documentXml: Document, levelByStyleId: Map<string, number>): RawHeading[] {
    const result: RawHeading[] = [];
    for (const p of elementsByAnyTag(documentXml, "p")) {
        const pPr = directChild(p, "pPr");
        const pStyleEl = pPr ? directChild(pPr, "pStyle") : null;
        const styleId = pStyleEl ? attr(pStyleEl, "val") : null;
        if (!styleId) continue;

        const level = levelByStyleId.get(styleId);
        if (level === undefined) continue;

        const title = paragraphText(p).trim();
        if (!title) continue;

        result.push({styleId, level, title});
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

    const levelByStyleId = stylesXml ? parseHeadingStyleLevels(stylesXml) : new Map<string, number>();
    const raw = extractHeadingParagraphs(documentXml, levelByStyleId);

    const occurrenceCounters = new Map<string, number>();
    return raw.map((h, index): DocxHeadingItem => {
        const occurrenceIndex = occurrenceCounters.get(h.styleId) ?? 0;
        occurrenceCounters.set(h.styleId, occurrenceIndex + 1);
        return {
            id: `heading-${index}`,
            level: Math.min(h.level, 3) as 1 | 2 | 3,
            title: h.title,
            styleClass: buildHeadingStyleClass(h.styleId),
            occurrenceIndex,
        };
    });
}
