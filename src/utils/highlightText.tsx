interface HighlightTextProps {
    text: string;
    query: string;
    className?: string;
    highlightClassName?: string;
}

// Экранируем спецсимволы regex
function escapeRegExp(str: string): string {
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