// Общие мелочи оформления ссылок между ВНД (вкладка "Связанные документы", карточка при
// наведении на ссылку в тексте, мастер добавления ссылки).

export const LINK_STATUS_STYLES: Record<string, string> = {
    active: "text-emerald-700 bg-emerald-100",
    onact: "text-amber-700 bg-amber-100",
    review: "text-indigo-700 bg-indigo-100",
    consol: "text-sky-700 bg-sky-100",
    arch: "text-slate-500 bg-slate-100",
    draft: "text-slate-400 bg-slate-100",
};

/** Короткая подпись языка текста редакции. */
export function languageShortLabel(lang: string | null | undefined): string {
    switch ((lang ?? "").toLowerCase()) {
        case "ru":
            return "RU";
        case "kg":
            return "KG";
        case "en":
            return "EN";
        default:
            return "";
    }
}

/** Обрезает фрагмент текста для подписи «...» в одну строку. */
export function shortFragment(text: string | null | undefined, max = 90): string {
    const collapsed = (text ?? "").replace(/\s+/g, " ").trim();
    return collapsed.length > max ? `${collapsed.slice(0, max).trimEnd()}…` : collapsed;
}
