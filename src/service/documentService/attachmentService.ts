import {apiClient} from "@/service/apiClient.ts";

/** Вложение карточки документа: имя, хеш версии и состояние подписей под ней. */
export interface Attachment {
    id: number;
    documentId: number;
    fileName: string;
    /** SHA-256 версии файла — именно он подписывается. */
    hash: string;
    size: number;
    isPrimary: boolean;
    createdAt: string;
    signatureCount: number;
    /** Подписи аннулированы заменой файла: процесс требуется подписать заново. */
    hasRevokedSignatures: boolean;
}

export const attachmentService = {
    list: (documentId: number) =>
        apiClient.get<Attachment[]>(`/api/documents/${documentId}/attachments`).then((r) => r.data),

    upload: (documentId: number, file: File, isPrimary = false) => {
        const body = new FormData();
        body.append("file", file);
        return apiClient
            .post<Attachment>(`/api/documents/${documentId}/attachments`, body, {
                params: {isPrimary},
            })
            .then((r) => r.data);
    },

    replace: (attachmentId: number, file: File) => {
        const body = new FormData();
        body.append("file", file);
        return apiClient
            .put<Attachment>(`/api/documents/attachments/${attachmentId}`, body)
            .then((r) => r.data);
    },

    remove: (attachmentId: number) =>
        apiClient.delete(`/api/documents/attachments/${attachmentId}`).then(() => undefined),

    /**
     * Ссылка на скачивание. Токен уходит заголовком, поэтому файл забираем запросом,
     * а не переходом по адресу: иначе сервер ответит 401.
     */
    download: async (attachment: Attachment) => {
        const response = await apiClient.get(
            `/api/documents/attachments/${attachment.id}/download`,
            {responseType: "blob"});

        const url = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.fileName;
        link.click();
        URL.revokeObjectURL(url);
    },
};

/** Размер файла в человекочитаемом виде. */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
