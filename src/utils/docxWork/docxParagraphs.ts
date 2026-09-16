// Извлечение текстов абзацев редакции ВНД для построения строк ТИД (см. VndUploadTidModal /
// useTidDiffRows) — автосравнение действующей и новой редакции построчно (по абзацам), в духе
// того, как docxHeadings.ts извлекает заголовки: тот же прямой разбор OOXML через JSZip, в обход
// docx-preview (который абзацы как отдельные текстовые единицы не отдаёт).
import JSZip from "jszip";

/** OOXML-элементы всегда с префиксом "w:" в документах, реально созданных Word — но на всякий
 * случай (нестандартный экспорт без префикса) падаем на бестпрефиксный тег. См. docxHeadings.ts. */
function elementsByAnyTag(root: Document | Element, localName: string): Element[] {
    const prefixed = root.getElementsByTagName(`w:${localName}`);
    if (prefixed.length > 0) return Array.from(prefixed);
    return Array.from(root.getElementsByTagName(localName));
}

function paragraphText(p: Element): string {
    return elementsByAnyTag(p, "t").map((t) => t.textContent ?? "").join("");
}

/** Тексты всех непустых абзацев документа, в порядке следования по документу. */
export async function extractDocxParagraphs(blob: Blob): Promise<string[]> {
    const zip = await JSZip.loadAsync(blob);
    const documentEntry = zip.file("word/document.xml");
    if (!documentEntry) return [];

    const parser = new DOMParser();
    const documentXml = parser.parseFromString(await documentEntry.async("text"), "application/xml");

    const paragraphs: string[] = [];
    for (const p of elementsByAnyTag(documentXml, "p")) {
        const text = paragraphText(p).trim();
        if (text) paragraphs.push(text);
    }
    return paragraphs;
}
