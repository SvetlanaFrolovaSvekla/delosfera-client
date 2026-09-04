// Экспорт таблицы матрицы разногласий (см. DisagreementMatrixTable) в .docx по фирменному
// шаблону (src/assets/disagreementMatrix/disagreementMatrixTemplate.docx - "Матрица
// разногласий", 4 колонки: №, Редакция разработчика, Редакция и комментарии оппонента,
// Комментарии (обоснование) разработчика). Тот же подход, что и в docxTidExport.ts: правим
// только XML найденной в шаблоне таблицы (JSZip + прямой разбор OOXML), строка-образец из
// шаблона клонируется под каждую строку данных. В отличие от ТИД, здесь ВСЕ три текстовых
// колонки - HTML (могут быть частично покрашены красным/зелёным/чёрным через RichDiffEditor),
// а не только "было"/"стало".
import JSZip from "jszip";
import {htmlToDocxParagraphs} from "@/utils/htmlToDocxRuns.ts";
import templateUrl from "@/assets/disagreementMatrix/disagreementMatrixTemplate.docx?url";

export interface DisagreementMatrixExportRow {
    number: number;
    developerPositionHtml: string;
    opponentPositionHtml: string;
    developerJustificationHtml: string;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// Шрифт для всех сгенерированных прогонов - как и в ТИД, всегда Arial, независимо от того,
// что задано в конкретной ячейке шаблона.
const ARIAL_RFONTS = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`;

function buildRunXml(text: string, color: string | undefined, rFontsXml: string): string {
    const rPrParts: string[] = [];
    if (rFontsXml) rPrParts.push(rFontsXml);
    if (color) rPrParts.push(`<w:color w:val="${color}"/>`);
    const rPr = rPrParts.length > 0 ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function buildParagraphXml(runs: {text: string; color?: string}[], pPrXml: string, rFontsXml: string): string {
    if (runs.length === 0) return `<w:p>${pPrXml}</w:p>`;
    const runsXml = runs.map((r) => buildRunXml(r.text, r.color, rFontsXml)).join("");
    return `<w:p>${pPrXml}${runsXml}</w:p>`;
}

function buildCellXml(
    tcPrXml: string, pPrXml: string, rFontsXml: string, paragraphs: {text: string; color?: string}[][],
): string {
    const content = paragraphs.length > 0
        ? paragraphs.map((p) => buildParagraphXml(p, pPrXml, rFontsXml)).join("")
        : `<w:p>${pPrXml}</w:p>`;
    return `<w:tc>${tcPrXml}${content}</w:tc>`;
}

interface CellTemplate {
    tcPrXml: string;
    pPrXml: string;
}

function extractCellTemplate(cellBlock: string): CellTemplate {
    const tcPrMatch = cellBlock.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
    const pPrMatch = cellBlock.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const tcPrXml = tcPrMatch ? tcPrMatch[0] : "";
    const pPrXml = pPrMatch ? pPrMatch[0] : "";
    return {tcPrXml, pPrXml};
}

/** Собирает .docx с матрицей разногласий, заполненной по переданным строкам, на основе
 * фирменного шаблона. Возвращает Blob готового файла - вызывающая сторона сама решает, скачивать
 * его (см. downloadBlob) или приложить как файл при отправке (см. resubmit/disagreementMatrix). */
export async function generateDisagreementMatrixDocx(
    rows: DisagreementMatrixExportRow[], vndTitle?: string,
): Promise<Blob> {
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) throw new Error("Не удалось загрузить шаблон матрицы разногласий");
    const templateBuffer = await templateResponse.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);
    const documentEntry = zip.file("word/document.xml");
    if (!documentEntry) throw new Error("Некорректный шаблон матрицы разногласий: отсутствует document.xml");
    const documentXml = await documentEntry.async("text");

    const tables = documentXml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? [];
    const tbl = tables.find((t) => t.includes("Редакция и комментарии оппонента"));
    if (!tbl) throw new Error("В шаблоне не найдена таблица матрицы разногласий");

    const trBlocks = tbl.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];
    if (trBlocks.length < 2) throw new Error("В шаблоне не найдена строка-образец таблицы матрицы разногласий");

    const templateRow = trBlocks[trBlocks.length - 1];

    const trOpenMatch = templateRow.match(/^<w:tr\b[^>]*>/);
    const trOpenTag = trOpenMatch ? trOpenMatch[0] : "<w:tr>";

    const cellBlocks = templateRow.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? [];
    if (cellBlocks.length < 4) throw new Error("В шаблоне таблица матрицы разногласий должна содержать 4 колонки");

    const [numberTpl, devTpl, oppTpl, justTpl] = cellBlocks.map(extractCellTemplate);

    const generatedRows = rows.map((row) => {
        const numberCell = buildCellXml(
            numberTpl.tcPrXml, numberTpl.pPrXml, ARIAL_RFONTS,
            [[{text: String(row.number)}]],
        );
        const devCell = buildCellXml(
            devTpl.tcPrXml, devTpl.pPrXml, ARIAL_RFONTS,
            htmlToDocxParagraphs(row.developerPositionHtml),
        );
        const oppCell = buildCellXml(
            oppTpl.tcPrXml, oppTpl.pPrXml, ARIAL_RFONTS,
            htmlToDocxParagraphs(row.opponentPositionHtml),
        );
        const justCell = buildCellXml(
            justTpl.tcPrXml, justTpl.pPrXml, ARIAL_RFONTS,
            htmlToDocxParagraphs(row.developerJustificationHtml),
        );
        // Высоту строки (trHeight) из шаблона намеренно не переносим - см. тот же комментарий
        // в docxTidExport.ts.
        return `${trOpenTag}${numberCell}${devCell}${oppCell}${justCell}</w:tr>`;
    });

    const newTbl = tbl.replace(templateRow, generatedRows.join("") || templateRow);
    let newDocumentXml = documentXml.replace(tbl, newTbl);

    if (vndTitle) {
        // Заголовок шаблона "Матрица разногласий по «…»" - название ВНД одним прогоном (см.
        // аналогичный подход в docxTidExport.ts/replaceTemplateTitle), если в шаблоне есть метка.
        newDocumentXml = newDocumentXml.replace(
            /\{VND_TITLE\}/g, escapeXml(vndTitle),
        );
    }

    zip.file("word/document.xml", newDocumentXml);

    return zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}

export function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
