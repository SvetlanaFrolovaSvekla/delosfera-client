/**
 * Человекочитаемая длительность для ЭЦП-сессии (см. EcpSessionContext.expireAt). Срок токена
 * у ГП «Инфоком» на практике может быть от пары минут (динамический пин) до нескольких сотен
 * дней (статичный, на тестовом контуре наблюдался expireAt ~312 дней — почти весь срок действия
 * сертификата) — поэтому единица подбирается по величине, а не всегда минуты (иначе получается
 * нечитаемое "~449308 мин.").
 */
export function formatEcpDuration(ms: number): string {
    if (ms <= 0) return "0 мин.";

    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) return `${Math.max(1, totalMinutes)} мин.`;

    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${totalHours} ч ${minutes} мин.` : `${totalHours} ч`;
    }

    const totalDays = Math.floor(totalHours / 24);
    if (totalDays < 90) return `${totalDays} дн.`;

    return `до ${new Date(Date.now() + ms).toLocaleDateString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
    })}`;
}

/** Компактный вид для тикающего бейджа (короче, без "до"): mm:ss пока меньше часа, иначе —
 * то же, что formatEcpDuration, но без слова "мин."/"ч" склонений — годится под маленький бейдж. */
export function formatEcpCountdown(ms: number): string {
    if (ms <= 0) return "";
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 3600) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return formatEcpDuration(ms);
}
