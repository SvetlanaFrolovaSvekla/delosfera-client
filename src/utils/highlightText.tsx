// Подсветка при поиске
interface HighlightTextProps {
    text: string;
    query: string;
    className?: string;
    highlightClassName?: string;
}

// Экранируем спецсимволы regex
// eslint-disable-next-line react-refresh/only-export-components
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightText({
                                  text,
                                  query,
                                  className = "",
                                  highlightClassName = "bg-[#fde3c4] text-[#8a4b00] rounded-[3px] px-[1px]",
                              }: HighlightTextProps) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return <span className={className}>{text}</span>;
    }

    const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "gi");
    const parts = text.split(regex);
    const lowerQuery = trimmedQuery.toLowerCase();

    return (
        <span className={className}>
            {parts.map((part, i) =>
                part.toLowerCase() === lowerQuery ? (
                    <mark key={i} className={highlightClassName}>
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
}

/**
 * Подсветка по нескольким словам запроса — так же, как ищет сервер: слова независимы,
 * совпадает начало слова («серв» найдёт «серверное»). Подсвечивается совпавшее начало.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function queryTerms(query: string): string[] {
    return Array.from(new Set(query.toLowerCase().split(/[^\p{L}\p{Nd}]+/u).filter(Boolean)));
}

export function HighlightTerms({
                                   text,
                                   query,
                                   className = "",
                                   highlightClassName = "bg-[#fde3c4] text-[#8a4b00] rounded-[3px] px-[1px]",
                               }: HighlightTextProps) {
    const terms = queryTerms(query).sort((a, b) => b.length - a.length);

    if (terms.length === 0) {
        return <span className={className}>{text}</span>;
    }

    const regex = new RegExp(`((?<![\\p{L}\\p{Nd}])(?:${terms.map(escapeRegExp).join("|")}))`, "giu");
    // При split с одной группой захвата совпадения лежат на нечётных местах.
    const parts = text.split(regex);

    return (
        <span className={className}>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark key={i} className={highlightClassName}>
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
}

/** Слова поискового запроса для поиска "подстрокой": запись подходит, если в ней есть ВСЕ
 * слова - в любом месте и порядке (журнал аудита ВНД, "Активность на портале"). */
// eslint-disable-next-line react-refresh/only-export-components
export function splitSearchTerms(query: string): string[] {
    return Array.from(new Set(query.toLowerCase().split(/\s+/).filter(Boolean)));
}

/** Подсветка каждого слова запроса где угодно в тексте (в отличие от HighlightTerms, где
 * совпадение только с начала слова). */
export function HighlightSubstrings({
                                        text,
                                        terms,
                                        highlightClassName = "bg-[#fde3c4] text-[#8a4b00] rounded-[3px] px-[1px]",
                                    }: { text: string; terms: string[]; highlightClassName?: string }) {
    if (terms.length === 0) return <>{text}</>;
    const regex = new RegExp(`(${[...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "gi");
    // С одной группой захвата в split совпадения лежат на нечётных местах
    return (
        <>
            {text.split(regex).map((part, i) =>
                i % 2 === 1
                    ? <mark key={i} className={highlightClassName}>{part}</mark>
                    : <span key={i}>{part}</span>,
            )}
        </>
    );
}
