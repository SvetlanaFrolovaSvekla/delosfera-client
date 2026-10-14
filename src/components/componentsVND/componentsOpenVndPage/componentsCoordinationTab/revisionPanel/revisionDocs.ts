// Документы редакции в панели "На доработке": языки, состояние слота, ограничения файлов.

export type DocLang = "ru" | "kg" | "en";

export interface DocSlotState {
    requiresReplace: boolean;
    file: File | null;
    remove: boolean;
}

export const EMPTY_DOC_STATE: DocSlotState = {requiresReplace: false, file: null, remove: false};

export interface DocSlot {
    lang: DocLang;
    label: string;
    fileId: number | null;
    exists: boolean;
    /** RU обязателен - его нельзя удалить, только заменить */
    deletable: boolean;
    title: string;
}

export const DOC_ACCEPT = ".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx";

// Максимальный размер одного файла (документа редакции или вложения) — совпадает с
// ограничением в VndUploadRedactionModal, см. formatFileSize для вывода в UI.
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 МБ
