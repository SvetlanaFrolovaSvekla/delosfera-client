// Транслитерация кириллицы (рус. + кырг. буквы) в латиницу для отображения
// ФИО, должностей и подразделений на английской локали

const CYRILLIC_TO_LATIN: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    // кыргызские буквы (встречаются в ФИО и названиях подразделений)
    ө: "o", ү: "u", ң: "ng",
};

/**
 * Транслитерирует кириллический текст в латиницу (паспортный стиль).
 * Не-кириллические символы (латиница, цифры, пунктуация) остаются без изменений.
 *
 * Известное ограничение: слова целиком в верхнем регистре (капс) транслитерируются
 * некорректно для многобуквенных замен (например "ШЕВЧЕНКО" -> "Shevchenko", а не "SHEVCHENKO"),
 * т.к. функция ориентирована на обычные ФИО/названия с одной заглавной буквой в начале слова.
 */
export function transliterate(text: string | null | undefined): string {
    if (!text) return "";

    return text
        .split("")
        .map((char) => {
            const lower = char.toLowerCase();
            const mapped = CYRILLIC_TO_LATIN[lower];
            if (mapped === undefined) return char;

            const isUpper = char !== lower;
            if (!isUpper) return mapped;

            return mapped.charAt(0).toUpperCase() + mapped.slice(1);
        })
        .join("");
}