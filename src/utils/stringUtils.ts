// Общий файл утилит для работы со строками

/** returnObjects вернёт строку, если ключ перевода не найден (превращает значение в массив строк). */
export function asStringArray(v: unknown): string[] {
    return Array.isArray(v) ? v.map(String) : [];
}

// Чтоб первая буква была заглавной
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
