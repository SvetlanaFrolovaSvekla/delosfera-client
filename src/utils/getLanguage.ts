/**
 * Текущий язык интерфейса для заголовков API.
 * Источник — ключ `i18nextLng`, куда i18next-browser-languagedetector сохраняет выбор
 * пользователя. Раньше часть сервисов читала несуществующий ключ `lang` и всегда
 * отправляла "ru" независимо от выбранного языка.
 */
export function getLanguage(): string {
    return localStorage.getItem("i18nextLng") ?? "ru";
}
