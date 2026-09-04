// Экспорт таблицы изменений ТИД (см. TidChangesTable) в .docx по фирменному шаблону
// (src/assets/tid/tidTemplate.docx — "Таблица изменений и дополнений", 4 колонки: №, Действующая
// редакция, Суть/обоснование предлагаемых изменений, Новая редакция). Генерация полностью на
// клиенте: правим только XML найденной в шаблоне таблицы (JSZip + прямой разбор OOXML, тот же
// подход, что и в docxHeadings.ts/docxParagraphs.ts) — сама строка-образец из шаблона (её
// оформление: границы, ширины колонок, шрифт) клонируется под каждую строку данных, остальной
// документ (шапка, стили, поля) остаётся как в шаблоне без изменений.
import JSZip from "jszip";
import {htmlToDocxParagraphs, plainTextToDocxParagraphs, type DocxParagraph} from "@/utils/htmlToDocxRuns.ts";
import templateUrl from "@/assets/tid/tidTemplate.docx?url";

export interface TidExportRow {
    number: number;
    oldHtml: string;
    justification: string;
    newHtml: string;
}

/** Ответственный за актуализацию — попадает в строку "Разработано:" под таблицей (см.
 * TidChangesTable). */
export interface TidExportDeveloper {
    fullName: string;
    positionName: string | null;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** Шрифт для всех сгенерированных прогонов - всегда Arial, независимо от того, что задано в
 * конкретной ячейке шаблона (см. requirement: "хочу чтоб сохранялось со шрифтом Arial"). */
const ARIAL_RFONTS = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`;

function buildRunXml(text: string, color: string | undefined, rFontsXml: string): string {
    const rPrParts: string[] = [];
    if (rFontsXml) rPrParts.push(rFontsXml);
    if (color) rPrParts.push(`<w:color w:val="${color}"/>`);
    const rPr = rPrParts.length > 0 ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function buildParagraphXml(runs: DocxParagraph, pPrXml: string, rFontsXml: string): string {
    if (runs.length === 0) return `<w:p>${pPrXml}</w:p>`;
    const runsXml = runs.map((r) => buildRunXml(r.text, r.color, rFontsXml)).join("");
    return `<w:p>${pPrXml}${runsXml}</w:p>`;
}

function buildCellXml(tcPrXml: string, pPrXml: string, rFontsXml: string, paragraphs: DocxParagraph[]): string {
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

// Ширина текстовой области страницы шаблона (landscape A4: pgSz 16838 - pgMar left 1701 -
// pgMar right 850, в твипах) - позиция правого таб-стопа для строки "должность …… ФИО", чтобы
// ФИО прижималось к правому краю листа, как в подписи под документом.
const SIGNATURE_TAB_POS = 14287;

/** Блок "Разработчик:" под таблицей - подпись на отдельной строке, а на следующей строке
 * должность слева и ФИО справа (через таб-стоп), как в обычной подписи под документом. */
function buildDeveloperParagraphXml(developedBy: TidExportDeveloper): string {
    const labelParagraph =
        `<w:p><w:pPr><w:spacing w:before="240"/></w:pPr>` +
        `<w:r><w:rPr>${ARIAL_RFONTS}<w:b/></w:rPr><w:t xml:space="preserve">Разработчик:</w:t></w:r></w:p>`;

    const positionRun = developedBy.positionName
        ? `<w:r><w:rPr>${ARIAL_RFONTS}</w:rPr><w:t xml:space="preserve">${escapeXml(developedBy.positionName)}</w:t></w:r>`
        : "";
    const nameRun = developedBy.fullName
        ? `<w:r><w:rPr>${ARIAL_RFONTS}</w:rPr><w:tab/><w:t xml:space="preserve">${escapeXml(developedBy.fullName)}</w:t></w:r>`
        : "";
    const signatureParagraph =
        `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${SIGNATURE_TAB_POS}"/></w:tabs></w:pPr>` +
        `${positionRun}${nameRun}</w:p>`;

    return `${labelParagraph}${signatureParagraph}`;
}

/** Заголовок шаблона "к «…»" (см. tidTemplate.docx) — набран россыпью прогонов (Word разбивает
 * слово "Инструкция" на несколько <w:r> из-за истории правок), поэтому текст между "к «" и "»"
 * заменяем на название текущей ВНД целиком одним прогоном, а не пытаемся подменить слово в слово. */
function replaceTemplateTitle(documentXml: string, vndTitle: string): string {
    const paragraphs = documentXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? [];
    const target = paragraphs.find((p) => /<w:t[^>]*>к\s*«<\/w:t>/.test(p));
    if (!target) return documentXml;

    const openRunRe = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>к\s*«<\/w:t>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/;
    const openMatch = openRunRe.exec(target);
    if (!openMatch) return documentXml;
    const openEnd = openMatch.index + openMatch[0].length;

    const closeRunRe = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>»<\/w:t>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/;
    const closeMatch = closeRunRe.exec(target.slice(openEnd));
    if (!closeMatch) return documentXml;
    const closeStart = openEnd + closeMatch.index;

    const rPrMatch = openMatch[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    const rPrXml = rPrMatch ? rPrMatch[0] : "";
    const nameRun = `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(vndTitle)}</w:t></w:r>`;

    const newTarget = target.slice(0, openEnd) + nameRun + target.slice(closeStart);
    return documentXml.replace(target, newTarget);
}

/** Собирает .docx с таблицей ТИД, заполненной по переданным строкам, на основе фирменного
 * шаблона. Возвращает Blob готового файла — вызывающая сторона сама решает, скачивать его
 * (см. downloadBlob) или сделать что-то ещё. */
export async function generateTidDocx(
    rows: TidExportRow[], developedBy?: TidExportDeveloper | null, vndTitle?: string,
): Promise<Blob> {
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) throw new Error("Не удалось загрузить шаблон ТИД");
    const templateBuffer = await templateResponse.arrayBuffer();

    const zip = await JSZip.loadAsync(templateBuffer);
    const documentEntry = zip.file("word/document.xml");
    if (!documentEntry) throw new Error("Некорректный шаблон ТИД: отсутствует document.xml");
    let documentXml = await documentEntry.async("text");
    if (vndTitle) documentXml = replaceTemplateTitle(documentXml, vndTitle);

    const tables = documentXml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? [];
    const tbl = tables.find((t) => t.includes("Действующая редакция"));
    if (!tbl) throw new Error("В шаблоне не найдена таблица ТИД");

    const trBlocks = tbl.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];
    if (trBlocks.length < 2) throw new Error("В шаблоне не найдена строка-образец таблицы ТИД");

    const templateRow = trBlocks[trBlocks.length - 1];

    const trOpenMatch = templateRow.match(/^<w:tr\b[^>]*>/);
    const trOpenTag = trOpenMatch ? trOpenMatch[0] : "<w:tr>";

    const cellBlocks = templateRow.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? [];
    if (cellBlocks.length < 4) throw new Error("В шаблоне таблица ТИД должна содержать 4 колонки");

    const [numberTpl, oldTpl, justificationTpl, newTpl] = cellBlocks.map(extractCellTemplate);

    const generatedRows = rows.map((row) => {
        const numberCell = buildCellXml(
            numberTpl.tcPrXml, numberTpl.pPrXml, ARIAL_RFONTS,
            [[{text: String(row.number)}]],
        );
        const oldCell = buildCellXml(
            oldTpl.tcPrXml, oldTpl.pPrXml, ARIAL_RFONTS,
            htmlToDocxParagraphs(row.oldHtml),
        );
        const justificationCell = buildCellXml(
            justificationTpl.tcPrXml, justificationTpl.pPrXml, ARIAL_RFONTS,
            plainTextToDocxParagraphs(row.justification),
        );
        const newCell = buildCellXml(
            newTpl.tcPrXml, newTpl.pPrXml, ARIAL_RFONTS,
            htmlToDocxParagraphs(row.newHtml),
        );
        // Высоту строки (trHeight) из шаблона намеренно не переносим - в образце она подобрана
        // под одну демонстрационную строку, а для сгенерированных строк высота должна
        // подстраиваться под содержимое.
        return `${trOpenTag}${numberCell}${oldCell}${justificationCell}${newCell}</w:tr>`;
    });

    const newTbl = tbl.replace(templateRow, generatedRows.join("") || templateRow);
    let newDocumentXml = documentXml.replace(tbl, newTbl);

    if (developedBy && (developedBy.fullName || developedBy.positionName)) {
        newDocumentXml = newDocumentXml.replace(newTbl, `${newTbl}${buildDeveloperParagraphXml(developedBy)}`);
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
