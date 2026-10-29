/**
 * Поиск по полю «Текст редакции» запускается только с 3 символов: на сервере его ускоряет
 * триграммный индекс (pg_trgm), а фразу короче 3 символов он не ускоряет — база перебирала бы
 * тексты всех редакций целиком (и результатом были бы почти все документы).
 */
export const REVISION_TEXT_MIN_LENGTH = 3;

/** Строка для запроса, или undefined, если фраза пустая или короче минимума. */
export function revisionTextQuery(value: string | null | undefined): string | undefined {
    const trimmed = (value ?? "").trim();
    return trimmed.length >= REVISION_TEXT_MIN_LENGTH ? trimmed : undefined;
}

/** Набрано 1–2 символа — показать подсказку «введите не меньше 3 символов». */
export function revisionTextTooShort(value: string | null | undefined): boolean {
    const length = (value ?? "").trim().length;
    return length > 0 && length < REVISION_TEXT_MIN_LENGTH;
}
