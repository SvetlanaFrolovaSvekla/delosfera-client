interface CharCounterProps {
    length: number;
    max: number;
    nearLimitThreshold?: number;
}

export function CharCounter({length, max, nearLimitThreshold = 20}: CharCounterProps) {
    const nearLimit = max - length <= nearLimitThreshold;
    return (
        <span
            className={`text-[11px] font-medium tabular-nums ${
                nearLimit ? "text-[#c0392b]" : "text-[#a3adbd]"
            }`}
        >
            {length}/{max}
        </span>
    );
}