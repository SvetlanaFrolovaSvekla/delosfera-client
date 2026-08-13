// Всплывающая подсказка
import {type ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";

export type Side = "top" | "bottom" | "left" | "right";

interface TooltipProps {
    content: string;
    children: ReactNode;
    side?: Side;
    delay?: number;
    disabled?: boolean;
    className?: string;
}

const GAP = 8; // расстояние от триггера до тултипа (включая стрелку)

// Позиция самой стрелки внутри тултипа (тултип центрируется по триггеру,
// поэтому стрелка всегда по центру своей стороны)
const arrowClasses: Record<Side, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#0f1b2d] border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#0f1b2d] border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#0f1b2d] border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[#0f1b2d] border-y-transparent border-l-transparent",
};

export function Tooltip({content, children, side = "bottom", delay = 300, disabled = false, className = ""}: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState<{top: number; left: number} | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const clearPendingTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const computePosition = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (side) {
            case "top":
                top = rect.top - GAP;
                left = rect.left + rect.width / 2;
                break;
            case "bottom":
                top = rect.bottom + GAP;
                left = rect.left + rect.width / 2;
                break;
            case "left":
                top = rect.top + rect.height / 2;
                left = rect.left - GAP;
                break;
            case "right":
                top = rect.top + rect.height / 2;
                left = rect.right + GAP;
                break;
        }

        setCoords({top, left});
    };

    useLayoutEffect(() => {
        if (mounted) computePosition();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, side]);

    useEffect(() => {
        if (!mounted) return;
        const handle = () => computePosition();
        window.addEventListener("scroll", handle, true);
        window.addEventListener("resize", handle);
        return () => {
            window.removeEventListener("scroll", handle, true);
            window.removeEventListener("resize", handle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    const handleEnter = () => {
        if (disabled) return;
        timerRef.current = setTimeout(() => {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        }, delay);
    };

    const handleLeave = () => {
        clearPendingTimer();
        setVisible(false);
        setTimeout(() => setMounted(false), 120);
    };

    // Клик по элементу внутри тултипа должен сразу его прятать,
    // даже если курсор физически остаётся на месте (mouseleave не сработает)
    const handleClick = () => {
        handleLeave();
    };

    const translate =
        side === "top" ? "translate(-50%, -100%)" :
            side === "bottom" ? "translate(-50%, 0)" :
                side === "left" ? "translate(-100%, -50%)" :
                    "translate(0, -50%)";

    return (
        <div
            ref={triggerRef}
            className={`relative inline-flex ${className}`}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={handleClick}
        >
            {children}
            {mounted && !disabled && coords &&
                createPortal(
                    <div
                        role="tooltip"
                        className={`pointer-events-none fixed z-[9999] whitespace-nowrap rounded-[7px] bg-[#0f1b2d] px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(15,27,45,.35)] transition-all duration-150 ease-out ${
                            visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                        }`}
                        style={{
                            top: coords.top,
                            left: coords.left,
                            transform: translate,
                        }}
                    >
                        {content}
                        <span className={`absolute h-0 w-0 border-[5px] ${arrowClasses[side]}`}/>
                    </div>,
                    document.body
                )}
        </div>
    );
}