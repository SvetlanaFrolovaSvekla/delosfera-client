interface CountBadgeProps {
    count: number;
    dot?: boolean; // Мини-точка, при свернутом Sidebar
    className?: string;
}

export function CountBadge({ count, dot, className }: CountBadgeProps) {
    if (!count) return null;

    if (dot) {
        return (
            <span
                className={`absolute right-[1px] top-[1px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#e0483d] transition-opacity duration-200 ${className ?? ""}`}
            />
        );
    }

    return (
        <span
            className={`flex flex-none items-center justify-center rounded-full text-[10.5px] font-bold text-white transition-opacity duration-200 ${className ?? ""}`}
            style={{
                background: "#e0483d",
                minWidth: 19,
                height: 19,
                padding: "0 5px",
                fontFamily: "'IBM Plex Mono', monospace",
            }}
        >
            {count}
        </span>
    );
}