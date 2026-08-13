import {type Side, Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

interface CountBadgeProps {
    count: number;
    dot?: boolean; // Мини-точка, при свернутом Sidebar
    className?: string;
    tooltip?: string; // Текст подсказки при наведении
    tooltipSide?: Side;
}

export function CountBadge({count, dot, className, tooltip, tooltipSide}: CountBadgeProps) {
   if (!count) return null;

    const badge = dot ? (
        <span
            className={`absolute right-[1px] top-[1px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#e0483d] transition-opacity duration-200 ${className ?? ""}`}
        />
    ) : (
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

    if (!tooltip) return badge;

    return (
        <Tooltip content={tooltip} side={tooltipSide ?? (dot ? "right" : "top")}>
            {badge}
        </Tooltip>
    );
}