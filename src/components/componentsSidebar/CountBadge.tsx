// Яблочко со счётчиком на Sidebar
import {type Side, Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

interface CountBadgeProps {
    count: number;
    dot?: boolean; // Мини-точка, при свернутом Sidebar
    /** Вместе с dot: точка стоит в строке пункта (справа от названия), а не в углу иконки -
     * "есть что-то новое" без цифры, сама цифра - в подсказке (например, "Пожелания и замечания"). */
    inline?: boolean;
    className?: string;
    tooltip?: string; // Текст подсказки при наведении
    tooltipSide?: Side;
}

export function CountBadge({count, dot, inline, className, tooltip, tooltipSide}: CountBadgeProps) {
   if (!count) return null;

    const badge = dot && inline ? (
        <span className={`relative mt-[5px] flex h-[9px] w-[9px] flex-none ${className ?? ""}`}>
            <span className="absolute inset-0 animate-ping rounded-full bg-[#e0483d] opacity-40 [animation-duration:2.4s]"/>
            <span className="relative h-[9px] w-[9px] rounded-full bg-[#e0483d] ring-2 ring-white"/>
        </span>
    ) : dot ? (
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