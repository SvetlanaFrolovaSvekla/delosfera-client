// Ограничения и форматирование файлов в окне загрузки новой редакции
import type {TFunction} from "i18next";

export const REDACTION_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 МБ

/** Допустимые расширения для файлов редакции и вложений */
export const REDACTION_FILE_ACCEPT = ".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx";

// Принимает t, чтобы единицы измерения ("Б"/"КБ"/"МБ") тоже переводились.
export function formatBytes(bytes: number, t: TFunction): string {
    if (bytes < 1024) return `${bytes} ${t("vndUploadRedactionModal.sizeUnitBytes")}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t("vndUploadRedactionModal.sizeUnitKb")}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("vndUploadRedactionModal.sizeUnitMb")}`;
}

/** "Файл «...» превышает допустимый размер (100 МБ)" */
export function fileTooLargeMessage(fileName: string, t: TFunction): string {
    return t("vndUploadRedactionModal.fileTooLarge", {
        fileName,
        maxSize: formatBytes(REDACTION_MAX_FILE_SIZE, t),
    });
}
