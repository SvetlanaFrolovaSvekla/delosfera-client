const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Скачивает файл с бэка через fetch (с Bearer-токеном) и триггерит сохранение в браузере.
 * Обычный <a href> тут не работает, т.к. эндпоинт защищён [Authorize] и не получает заголовок.
 */
export async function downloadFile(fileId: number, fallbackName = "файл"): Promise<void> {
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
        headers: authHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Не удалось скачать файл: ${response.status}`);
    }

    // Пытаемся достать оригинальное имя файла из Content-Disposition
    const disposition = response.headers.get("Content-Disposition");
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : fallbackName;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}