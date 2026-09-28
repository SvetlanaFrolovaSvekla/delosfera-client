import {apiClient} from "@/service/apiClient.ts";

/**
 * Онлайн-соредактирование вложений через OnlyOffice Document Server (COOP-1).
 *
 * Форма ответа — зеркало backend (Modules/Coauthoring/DTO/OnlyOfficeConfigResponse.cs):
 * serverUrl (откуда грузить api.js) + готовый конфиг DocEditor, подписанный JWT.
 */
export interface OnlyOfficePermissions {
    edit: boolean;
    review: boolean;
    comment: boolean;
    download: boolean;
    print: boolean;
}

export interface OnlyOfficeDocument {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: OnlyOfficePermissions;
}

export interface OnlyOfficeEditorConfig {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: {id: string; name: string};
}

export interface OnlyOfficeConfig {
    /** Адрес Document Server — с него грузится api.js. */
    serverUrl: string;
    /** Тип документа для api.js: "word" | "cell" | "slide". */
    documentType: string;
    document: OnlyOfficeDocument;
    editorConfig: OnlyOfficeEditorConfig;
    /** JWT всего конфига. */
    token: string;
}

export const coauthoringService = {
    /** Получить подписанный конфиг редактора для вложения карточки. */
    getConfig: (attachmentId: number) =>
        apiClient
            .get<OnlyOfficeConfig>(`/coauthoring/config/${attachmentId}`)
            .then((r) => r.data),
};

/** Расширения, для которых доступно соредактирование (совпадает с backend). */
export const COAUTHORING_EXTENSIONS = [".docx", ".xlsx", ".pptx"];

export function isCoauthorable(fileName: string): boolean {
    const i = fileName.lastIndexOf(".");
    const ext = i < 0 ? "" : fileName.slice(i).toLowerCase();
    return COAUTHORING_EXTENSIONS.includes(ext);
}
