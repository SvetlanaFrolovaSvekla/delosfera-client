import {toast} from "@/service/toastService.ts";
import {getAccessToken} from "@/service/tokenStore.ts";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

function authHeaders(): HeadersInit {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Скачивает файл с бэка через авторизованный fetch и отдаёт Blob + оригинальное имя,
 * ничего не сохраняя на диск. Используется для встраивания файла в UI (например, в DocxEditor).
 */
export async function fetchFileBlob(fileId: number, fallbackName = "файл"): Promise<{ blob: Blob; fileName: string }> {
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
        headers: authHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Не удалось загрузить файл: ${response.status}`);
    }

    // ASP.NET Core отдаёт оба варианта в заголовке: "filename=..." (ASCII-фолбэк, кириллица
    // в нём заменяется на "_" или проценты) и "filename*=UTF-8''..." (корректное percent-encoded
    // имя, RFC 5987). Раньше регэксп с необязательной "*" матчил первое попавшееся вхождение —
    // то есть чаще всего именно испорченный ASCII-вариант, а не настоящее имя файла. Теперь явно
    // предпочитаем filename*, а на обычный filename= падаем только если filename* нет вовсе.
    const disposition = response.headers.get("Content-Disposition");
    const starMatch = disposition?.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition?.match(/filename="?([^";]+)"?/i);
    const fileName = starMatch
        ? decodeURIComponent(starMatch[1])
        : (plainMatch ? plainMatch[1] : fallbackName);

    const blob = await response.blob();
    return {blob, fileName};
}

/**
 * Скачивает файл с бэка через fetch (с Bearer-токеном) и триггерит сохранение в браузере.
 * Обычный <a href> тут не работает, т.к. эндпоинт защищён [Authorize] и не получает заголовок.
 */
export async function downloadFile(fileId: number, fallbackName = "файл"): Promise<void> {
    const {blob, fileName} = await fetchFileBlob(fileId, fallbackName);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export async function downloadWithToast(fileId: number, name: string) {
    const toastId = toast.loading("Загрузка…", name);
    try {
        await downloadFile(fileId, name);
        toast.update(toastId, {
            variant: "success",
            title: "Скачано!",
            description: name,
            duration: 4500,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Не удалось скачать файл";
        toast.update(toastId, {
            variant: "error",
            title: "Не удалось скачать файл",
            description: message,
            duration: 5500,
        });
        throw e;
    }
}