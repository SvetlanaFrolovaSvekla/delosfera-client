// Список файлов редакции для "Документа для печати" (см. VndPrintBundleModal): тексты редакции
// на языках + ТИД, специальные вложения (листы согласования, матрица разногласий) и обычные
// вложения - в том же составе и с теми же подписями, что и в RedactionDocumentsPanel.
import type {TFunction} from "i18next";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName, isPreviewableFile, resolveVndDocTitle} from "@/utils/downloadFiles/fileNaming.ts";
import {approvalSheetCaption, getRedactionApprovalSheets} from "@/utils/vndProcess/approvalSheets.ts";

export type PrintBundleGroup = "redaction" | "special" | "attachments";

export const PRINT_BUNDLE_GROUPS: PrintBundleGroup[] = ["redaction", "special", "attachments"];

export interface PrintBundleItem {
    /** fileId как строка - ключ в списке и в порядке */
    key: string;
    fileId: number;
    group: PrintBundleGroup;
    /** Маленькая подпись капслоком ("Русский", "ТИД", "Лист согласования") */
    caption: string;
    /** Основная строка - название документа или имя файла */
    title: string;
    /** Имя файла с расширением - для просмотра и подсказок */
    fileName: string;
    /** Можно ли показать в AttachmentDocxPreviewModal */
    previewable: boolean;
    /** Можно ли вставить в общий Word-документ (сервер принимает .docx и PNG/JPEG) */
    mergeable: boolean;
}

/** Что сервер умеет вставить в один .docx (см. VndPrintBundleService.DetectKind). */
export function isPrintBundleMergeable(fileName: string): boolean {
    return /\.(docx|png|jpe?g)$/i.test(fileName);
}

const LANGS = [
    {lang: "ru", labelKey: "vndEditLastRevisionModal.langRu", fileKey: "docFileRuId"},
    {lang: "kg", labelKey: "vndEditLastRevisionModal.langKg", fileKey: "docFileKgId"},
    {lang: "en", labelKey: "vndEditLastRevisionModal.langEn", fileKey: "docFileEnId"},
] as const;

/** Сколько разных файлов у редакции (тексты на языках, ТИД, листы согласования, матрица
 * разногласий, вложения). Если файл один - "собирать в один документ" нечего, и кнопка
 * "Документ для печати" не показывается (см. RedactionSummaryCard, OpenVndPage). */
export function countPrintBundleFiles(redaction: VndRedactionResponse): number {
    const ids = new Set<number>();
    for (const l of LANGS) {
        const id = redaction[l.fileKey];
        if (id !== null && id !== undefined) ids.add(id);
    }
    if (redaction.tidFileId !== null) ids.add(redaction.tidFileId);
    for (const sheet of getRedactionApprovalSheets(redaction)) ids.add(sheet.fileId);
    if (redaction.disagreementMatrixFileId !== null) ids.add(redaction.disagreementMatrixFileId);
    for (const attachment of redaction.attachments) ids.add(attachment.fileId);
    return ids.size;
}

export function buildPrintBundleItems(t: TFunction, vnd: VndResponse, redaction: VndRedactionResponse): PrintBundleItem[] {
    const items: PrintBundleItem[] = [];
    const seen = new Set<number>();
    const push = (item: Omit<PrintBundleItem, "key">) => {
        if (seen.has(item.fileId)) return;
        seen.add(item.fileId);
        items.push({...item, key: String(item.fileId)});
    };

    // Тексты редакции - .docx (см. VndRedaction.DocFile*), ТИД - тоже Word-файл
    for (const l of LANGS) {
        const fileId = redaction[l.fileKey];
        if (fileId === null || fileId === undefined) continue;
        push({
            fileId,
            group: "redaction",
            caption: t(l.labelKey),
            title: resolveVndDocTitle(vnd, l.lang),
            fileName: `${buildRedactionFileName(redaction.code, vnd.name, l.lang)}.docx`,
            previewable: true,
            mergeable: true,
        });
    }
    if (redaction.tidFileId !== null) {
        push({
            fileId: redaction.tidFileId,
            group: "redaction",
            caption: t("redactionDocumentsPanel.tid"),
            title: t("redactionDocumentsPanel.tidFull"),
            fileName: `${redaction.code}_ТИД.docx`,
            previewable: true,
            mergeable: true,
        });
    }

    // Специальные вложения: листы согласования (от первого к последнему) и матрица разногласий
    for (const sheet of getRedactionApprovalSheets(redaction)) {
        push({
            fileId: sheet.fileId,
            group: "special",
            caption: t("redactionDocumentsPanel.approvalSheet"),
            title: approvalSheetCaption(t, sheet),
            fileName: sheet.fileName,
            previewable: isPreviewableFile(sheet.fileName),
            mergeable: isPrintBundleMergeable(sheet.fileName),
        });
    }
    if (redaction.disagreementMatrixFileId !== null) {
        const fileName = `${redaction.code}_Матрица_разногласий.docx`;
        push({
            fileId: redaction.disagreementMatrixFileId,
            group: "special",
            caption: t("redactionDocumentsPanel.disagreementMatrix"),
            title: fileName,
            fileName,
            previewable: true,
            mergeable: true,
        });
    }

    for (const attachment of redaction.attachments) {
        push({
            fileId: attachment.fileId,
            group: "attachments",
            caption: t("printBundle.attachmentCaption"),
            title: attachment.fileName,
            fileName: attachment.fileName,
            previewable: isPreviewableFile(attachment.fileName),
            mergeable: isPrintBundleMergeable(attachment.fileName),
        });
    }

    return items;
}
