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