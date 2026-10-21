/**
 * Поиск по доске служебных записок — на клиенте: доска приходит целиком и уже сужена
 * правами (SzVisibility), искать можно только среди того, что человеку и так видно.
 *
 * Что умеет:
 *  - несколько слов в любом порядке — записка подходит, если нашлось каждое
 *    (в номере, теме, виде, авторе, адресате или названии стадии);
 *  - без учёта регистра и разницы «ё»/«е»;
 *  - номер без разделителей: «сз15» найдёт «СЗ-15/2026»;
 *  - другая раскладка: «ckj;tybt» → «служебные», «jnge» → «отпу», если по набранному
 *    ничего не нашлось;
 *  - подсветка совпадений (см. {@link highlightParts}).
 */

/** Нижний регистр и «ё» → «е». Длина строки не меняется — на этом держится подсветка. */
export function normalizeSearch(s: string): string {
    return s.toLocaleLowerCase("ru").replaceAll("ё", "е");
}

/** Только буквы и цифры — для номера, набранного без дефисов и дробей. */
function compact(s: string): string {
    return s.replace(/[^\p{L}\p{Nd}]+/gu, "");
}

/** Слова запроса: нормализованные, без повторов. */
export function searchWords(query: string): string[] {
    return Array.from(new Set(normalizeSearch(query).split(/\s+/).filter(Boolean)));
}

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU = "йцукенгшщзхъфывапролджэячсмитьбюё";
const EN_TO_RU = new Map([...EN].map((c, i) => [c, RU[i]]));
const RU_TO_EN = new Map([...RU].map((c, i) => [c, EN[i]]));

/**
 * Тот же набор клавиш в другой раскладке. Направление — по тому, каких букв в запросе
 * больше: набрали латиницей — переводим в кириллицу, и наоборот. Null — менять нечего.
 */
export function switchLayout(query: string): string | null {
    const lower = query.toLocaleLowerCase("ru");
    const latin = [...lower].filter((c) => /[a-z]/.test(c)).length;
    const cyrillic = [...lower].filter((c) => /[а-яё]/.test(c)).length;
    if (latin === 0 && cyrillic === 0) return null;

    const map = latin >= cyrillic ? EN_TO_RU : RU_TO_EN;
    const switched = [...lower].map((c) => map.get(c) ?? c).join("");
    return switched === lower ? null : switched;
}

/** Поля записки, по которым ищем. Пустые пропускаются. */
export type SearchFields = (string | null | undefined)[];

/** Строка, в которой ищутся слова: все поля плюс номер без разделителей. */
export function buildHaystack(fields: SearchFields, regNumber?: string | null): string {
    const parts = fields.filter((f): f is string => !!f);
    if (regNumber) parts.push(compact(regNumber));
    return normalizeSearch(parts.join(" \u0001 "));
}

/** Нашлись ли все слова. Слово ищется как есть и без разделителей (для номера). */
export function matchesWords(haystack: string, words: string[]): boolean {
    return words.every((w) => {
        if (haystack.includes(w)) return true;
        const c = compact(w);
        return c.length > 0 && c !== w && haystack.includes(c);
    });
}

export interface ResolvedSearch {
    /** Слова, по которым реально фильтруем и подсвечиваем. */
    words: string[];
    /** Запрос в другой раскладке, если показываем результаты по нему; иначе null. */
    switchedQuery: string | null;
}

/**
 * Какими словами искать. Сначала — как набрано. Если по набранному не нашлось ничего,
 * а в другой раскладке находится — ищем по ней и говорим об этом пользователю.
 */
export function resolveSearch(query: string, haystacks: string[]): ResolvedSearch {
    const words = searchWords(query);
    if (words.length === 0) return {words, switchedQuery: null};
    if (haystacks.some((h) => matchesWords(h, words))) return {words, switchedQuery: null};

    const switched = switchLayout(query.trim());
    if (switched) {
        const alt = searchWords(switched);
        if (haystacks.some((h) => matchesWords(h, alt))) return {words: alt, switchedQuery: switched};
    }
    return {words, switchedQuery: null};
}

export interface HighlightPart {
    text: string;
    hit: boolean;
}

/**
 * Разбить текст на куски «совпало/не совпало» по словам запроса. Пересекающиеся и
 * соседние совпадения склеиваются. Сравнение — по нормализованному тексту, поэтому
 * «елка» подсветит «Ёлка».
 */
export function highlightParts(text: string, words: string[]): HighlightPart[] {
    if (!text || words.length === 0) return [{text, hit: false}];

    const norm = normalizeSearch(text);
    // Редкие символы меняют длину при смене регистра — тогда без подсветки, но без ошибки.
    if (norm.length !== text.length) return [{text, hit: false}];

    const ranges: [number, number][] = [];
    for (const w of words) {
        if (!w) continue;
        for (let i = norm.indexOf(w); i !== -1; i = norm.indexOf(w, i + 1)) ranges.push([i, i + w.length]);
    }
    if (ranges.length === 0) return [{text, hit: false}];

    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const r of ranges) {
        const last = merged[merged.length - 1];
        if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
        else merged.push([...r]);
    }

    const parts: HighlightPart[] = [];
    let pos = 0;
    for (const [from, to] of merged) {
        if (from > pos) parts.push({text: text.slice(pos, from), hit: false});
        parts.push({text: text.slice(from, to), hit: true});
        pos = to;
    }
    if (pos < text.length) parts.push({text: text.slice(pos), hit: false});
    return parts;
}
