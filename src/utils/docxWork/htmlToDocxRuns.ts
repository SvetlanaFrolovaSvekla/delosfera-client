// Разбор HTML-содержимого RichDiffEditor (обычный текст + <span style="color:...">, возможные
// переносы строк как <br>/<div> от печати и вставки) в абзацы, пригодные для сборки Word-ячеек
// (см. docxTidExport.ts) — массив параграфов, каждый параграф — массив "прогонов" текста с
// опциональным цветом (hex без "#").

export interface DocxRun {
    text: string;
    color?: string;
}

export type DocxParagraph = DocxRun[];

function normalizeColor(cssColor: string | null | undefined): string | undefined {
    if (!cssColor) return undefined;
    const rgbMatch = cssColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return [r, g, b].map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    const hexMatch = cssColor.match(/^#?([0-9a-fA-F]{6})$/);
    if (hexMatch) return hexMatch[1].toUpperCase();
    return undefined;
}

const BLOCK_TAGS = new Set(["DIV", "P"]);

/** html — содержимое, которое мы сами сгенерировали (segmentsToHtml) либо результат правки
 * пользователем в contentEditable (может содержать вложенные <div>/<br> от переноса строк). */
export function htmlToDocxParagraphs(html: string): DocxParagraph[] {
    const container = document.createElement("div");
    container.innerHTML = html;

    const paragraphs: DocxParagraph[] = [[]];

    const pushText = (text: string, color: string | undefined) => {
        if (!text) return;
        paragraphs[paragraphs.length - 1].push({text, color});
    };

    const breakParagraph = () => {
        if (paragraphs[paragraphs.length - 1].length > 0) paragraphs.push([]);
    };

    const walk = (node: ChildNode, color: string | undefined) => {
        if (node.nodeType === Node.TEXT_NODE) {
            pushText(node.textContent ?? "", color);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        if (el.tagName === "BR") {
            breakParagraph();
            return;
        }
        const nextColor = normalizeColor(el.style?.color) ?? color;
        const isBlock = BLOCK_TAGS.has(el.tagName);
        el.childNodes.forEach((child) => walk(child, nextColor));
        if (isBlock) breakParagraph();
    };

    container.childNodes.forEach((child) => walk(child, undefined));

    // Хвостовой пустой параграф появляется, если контент заканчивался переносом строки/блоком —
    // не нужен, реальный контент уже во всех предыдущих параграфах.
    if (paragraphs.length > 1 && paragraphs[paragraphs.length - 1].length === 0) paragraphs.pop();

    return paragraphs;
}

/** То же самое, но для обычного текста (не HTML) — используется для колонки "Суть/обоснование". */
export function plainTextToDocxParagraphs(text: string): DocxParagraph[] {
    const lines = text.split(/\r?\n/);
    return lines.map((line) => (line ? [{text: line}] : []));
}
