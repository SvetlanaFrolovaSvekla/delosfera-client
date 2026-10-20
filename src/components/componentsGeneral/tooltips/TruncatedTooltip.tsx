// Название документа/вложения и т.п. с тултипом, который всплывает ТОЛЬКО если текст реально
// обрезан многоточием (scrollWidth > clientWidth у span'а), а не всегда при наведении - иначе
// подсказка дублировала бы уже полностью видимое название.
import {useLayoutEffect, useRef, useState} from "react";
import {Tooltip, type Side} from "./Tooltip.tsx";

interface TruncatedTooltipProps {
    /** Полный текст - показывается и в самой строке (обрезается CSS truncate), и в подсказке. */
    text: string;
    side?: Side;
    className?: string;
    /** Классы на самом <span> с текстом - цвет, зачёркивание и т.п. */
    textClassName?: string;
}

export function TruncatedTooltip({text, side = "top", className = "", textClassName = ""}: TruncatedTooltipProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
        check();

        // на случай если ширина элемента меняется (ресайз, адаптив, сворачивание сайдбара и т.п.)
        const observer = new ResizeObserver(check);
        observer.observe(el);
        return () => observer.disconnect();
    }, [text]);

    return (
        <Tooltip content={text} disabled={!isTruncated} side={side} className={`min-w-0 ${className}`}>
            <span ref={ref} className={`block min-w-0 truncate ${textClassName}`}>
                {text}
            </span>
        </Tooltip>
    );
}
