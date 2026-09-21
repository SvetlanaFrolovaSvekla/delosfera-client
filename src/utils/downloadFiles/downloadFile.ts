/**
 * Скачивает файл с бэка через авторизованный fetch и отдаёт Blob + оригинальное имя,
 * ничего не сохраняя на диск. Используется для встраивания файла в UI (например, в DocxEditor).
 */

import {toast} from "@/service/toastService.ts";
import {getAccessToken} from "@/service/tokenStore.ts";
import i18n from "i18next";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

function authHeaders(): HeadersInit {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Достаёт имя файла из заголовка Content-Disposition. ASP.NET Core отдаёт оба варианта:
 * "filename=..." (ASCII-фолбэк, кириллица заменяется на "_" или проценты) и
 * "filename*=UTF-8''..." (корректное percent-encoded имя, RFC 5987). Раньше регэксп с
 * необязательной "*" матчил первое попавшееся вхождение — то есть чаще всего именно испорченный
 * ASCII-вариант, а не настоящее имя файла. Теперь явно предпочитаем filename*, а на обычный
 * filename= падаем только если filename* нет вовсе.
 */
export function parseContentDispositionFileName(
    disposition: string | null,
    fallbackName: string,
): string {
    const starMatch = disposition?.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition?.match(/filename="?([^";]+)"?/i);
    return starMatch
        ? decodeURIComponent(starMatch[1])
        : (plainMatch ? plainMatch[1] : fallbackName);
}

/** Триггерит сохранение blob'а в браузере через временную ссылку <a download>. */
export function saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export async function fetchFileBlob(
    fileId: number,
    // "файл"
    fallbackName = i18n.t("downloadFile.defaultFileName"),
    signal?: AbortSignal,
    /** Путь на бэке, без ведущего/конечного слэша — по умолчанию общий /api/files/{id}.
     * Передайте, например, "help/files", если файл выдаёт не общий FilesController,
     * а модуль со своей проверкой доступа (см. HelpController.GetFile). */
    endpoint = "files",
    /** Хвост URL после {fileId} — по умолчанию пусто. Нужен, когда файл отдаётся не самим
     * /{endpoint}/{id}, а вложенным действием, например "/download" у DocumentsController
     * (см. DownloadAttachment: /api/documents/attachments/{id}/download). */
    pathSuffix = "",
): Promise<{ blob: Blob; fileName: string }> {
    const response = await fetch(`${API_BASE}/${endpoint}/${fileId}${pathSuffix}`, {
        headers: authHeaders(),
        signal,
    });

    if (!response.ok) {
        // Не удалось загрузить файл: {status}
        throw new Error(`${i18n.t("downloadFile.loadErrorPrefix")} ${response.status}`);
    }

    const fileName = parseContentDispositionFileName(
        response.headers.get("Content-Disposition"), fallbackName,
    );

    const blob = await response.blob();
    return {blob, fileName};
}

/**
 * Скачивает файл с бэка через fetch (с Bearer-токеном) и триггерит сохранение в браузере.
 * Обычный <a href> тут не работает, т.к. эндпоинт защищён [Authorize] и не получает заголовок.
 */
export async function downloadFile(
    fileId: number,
    // "файл"
    fallbackName = i18n.t("downloadFile.defaultFileName"),
): Promise<void> {
    const {blob, fileName} = await fetchFileBlob(fileId, fallbackName);
    saveBlob(blob, fileName);
}

export async function downloadWithToast(fileId: number, name: string) {
    // "Загрузка…"
    const toastId = toast.loading(i18n.t("downloadFile.loadingToastTitle"), name);
    try {
        await downloadFile(fileId, name);
        toast.update(toastId, {
            variant: "success",
            // "Скачано!"
            title: i18n.t("downloadFile.downloadedToastTitle"),
            description: name,
            duration: 4500,
        });
    } catch (e) {
        // "Не удалось скачать файл"
        const message = e instanceof Error ? e.message : i18n.t("downloadFile.downloadErrorToastTitle");
        toast.update(toastId, {
            variant: "error",
            title: i18n.t("downloadFile.downloadErrorToastTitle"),
            description: message,
            duration: 5500,
        });
        throw e;
    }
}