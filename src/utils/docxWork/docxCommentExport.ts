// Экспорт текста замечаний/комментария согласующего (окно "См. замечания полностью") в обычный
// .docx. Файл собирается с нуля (JSZip + минимальный набор частей OOXML) - шаблон не нужен:
// заголовок, строки с автором/датой/резолюцией и сам текст, где строки-цитаты ("Цитата: «…»",
// см. FormattedResolutionComment) выделены жирным, а все остальные - обычным текстом. Шрифт - Arial.
import JSZip from "jszip";

export interface CommentDocxMeta {
    /** Заголовок документа, например "См. замечания полностью" -> "Замечания". */
    title: string;
    /** Подписи + значения для блока под заголовком: ["Автор замечания", "Иванов И.И."], … */
    info: Array<[label: string, value: string]>;
    /** Названия прикреплённых файлов (если есть). */
    attachmentNames?: string[];
    attachmentsLabel?: string;
}

const QUOTE_LINE_RE = /^Цитата: «/;

const ARIAL = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`;

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// Символы, недопустимые в XML 1.0 (управляющие, кроме \t \n \r) - иначе Word сочтёт файл повреждённым.
function stripInvalidXmlChars(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");
}

function run(text: string, opts: { bold?: boolean; color?: string; size?: number } = {}): string {
    const props =
        ARIAL +
        (opts.bold ? "<w:b/>" : "") +
        (opts.color ? `<w:color w:val="${opts.color}"/>` : "") +
        (opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : "");
    return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${escapeXml(stripInvalidXmlChars(text))}</w:t></w:r>`;
}

function paragraph(runsXml: string, spacingAfter = 120): string {
    return `<w:p><w:pPr><w:spacing w:after="${spacingAfter}"/></w:pPr>${runsXml}</w:p>`;
}

export async function generateCommentDocx(meta: CommentDocxMeta, text: string): Promise<Blob> {
    const body: string[] = [];

    body.push(paragraph(run(meta.title, {bold: true, size: 32}), 200));

    for (const [label, value] of meta.info) {
        if (!value) continue;
        body.push(paragraph(run(`${label} `, {bold: true, size: 22}) + run(value, {size: 22}), 60));
    }

    if (meta.attachmentNames && meta.attachmentNames.length > 0) {
        body.push(paragraph(
            run(`${meta.attachmentsLabel ?? "Файлы"}: `, {bold: true, size: 22}) +
            run(meta.attachmentNames.join(", "), {size: 22}),
            60,
        ));
    }

    // Разделитель между шапкой и текстом.
    body.push(
        `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFC7D5"/></w:pBdr>` +
        `<w:spacing w:after="200"/></w:pPr></w:p>`,
    );

    for (const line of text.split(/\r\n|\r|\n/)) {
        if (!line) {
            body.push(`<w:p/>`);
            continue;
        }
        const isQuote = QUOTE_LINE_RE.test(line);
        body.push(paragraph(run(line, {bold: isQuote, color: isQuote ? "4E57D6" : undefined, size: 22})));
    }

    const documentXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${body.join("")}` +
        `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
        `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/>` +
        `</w:sectPr></w:body></w:document>`;

    const contentTypes =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`;

    const rels =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes);
    zip.file("_rels/.rels", rels);
    zip.file("word/document.xml", documentXml);

    return zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}

/** Имя файла без недопустимых для Windows символов. */
export function safeDocxFileName(base: string): string {
    const cleaned = base.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
    return `${cleaned || "Замечания"}.docx`;
}
