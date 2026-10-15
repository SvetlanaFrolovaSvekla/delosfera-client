// Форматирование реквизитов печатной формы СЗ — общее для листа на экране, PDF и Word.

export function formatPrintDate(iso: string | null): string {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return d && m && y ? `${d}.${m}.${y}` : "";
}

export function formatPrintTime(iso: string | null): string {
    if (!iso) return "";
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"});
}

/** Срок сертификата приходит от провайдера строкой: дата — в dd.MM.yyyy, иначе как есть. */
export function formatCertDate(raw: string | null): string | null {
    if (!raw?.trim()) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw.trim() : date.toLocaleDateString("ru-RU");
}

export function chunkHex(value: string, size: number): string[] {
    const text = value.trim().toUpperCase();
    const parts: string[] = [];
    for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
    return parts;
}

export function shortenHex(hex: string | null): string {
    const text = (hex ?? "").trim().toUpperCase();
    return text.length <= 20 ? text : `${text.slice(0, 10)}…${text.slice(-10)}`;
}
