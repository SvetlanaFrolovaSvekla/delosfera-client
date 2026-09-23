// Для корректного нейминга при скачивании редакций
export function sanitizeFileName(input: string): string {
    return input
        .replace(/[\\/:*?"<>|]/g, "") // запрещённые в имени файла символы
        .trim()
        .replace(/\s+/g, " ");
}

export function buildRedactionFileName(
    code: string,
    vndName: string,
    lang: "ru" | "kg" | "en"
): string {
    return `${code}_(${sanitizeFileName(vndName)})_${lang}`;
}

export function resolveVndDocTitle(
    vnd: { titleRu: string; titleKg?: string | null; titleEn?: string | null },
    lang: "ru" | "kg" | "en"
): string {
    if (lang === "ru") return vnd.titleRu;

    const own = lang === "kg" ? vnd.titleKg : vnd.titleEn;
    if (own && own.trim()) return own;

    return `${vnd.titleRu}_${lang}`; // нет перевода - берём русское название с суффиксом языка (en, kg)
}

/** Форматы, для которых AttachmentDocxPreviewModal умеет показать хоть какое-то содержимое
 * прямо в браузере (без скачивания) - "докс" в имени модалки остался историческим, сейчас она
 * рендерит все четыре (.pdf - через pdf.js, см. usePdfPreview). .doc/.xls/.ppt (старый бинарный
 * формат Office, не ZIP) сюда не входят - ни docx-preview, ни SheetJS, ни наш разбор
 * презентаций через JSZip их не читают. */
export type PreviewableFileKind = "docx" | "xlsx" | "pptx" | "pdf";

const PREVIEWABLE_EXTENSIONS: Record<PreviewableFileKind, string> = {
    docx: ".docx",
    xlsx: ".xlsx",
    pptx: ".pptx",
    pdf: ".pdf",
};

export function getPreviewableFileKind(fileName: string): PreviewableFileKind | null {
    const lower = fileName.toLowerCase();
    return (Object.keys(PREVIEWABLE_EXTENSIONS) as PreviewableFileKind[])
        .find((kind) => lower.endsWith(PREVIEWABLE_EXTENSIONS[kind])) ?? null;
}

// Есть ли у произвольного вложения предпросмотр (AttachmentDocxPreviewModal). Общий хелпер для
// RedactionAttachmentsModal, VndEditLastRevisionModal и AttachmentRow, чтобы не дублировать
// проверку расширения в нескольких местах.
export function isPreviewableFile(fileName: string): boolean {
    return getPreviewableFileKind(fileName) !== null;
}

/** @deprecated используйте isPreviewableFile - оставлено на случай, если .docx где-то нужно
 * отличить от .xlsx/.pptx/.pdf отдельно (например, для текста подсказки). */
export function isDocxFile(fileName: string): boolean {
    return getPreviewableFileKind(fileName) === "docx";
}