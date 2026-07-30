// Всплывающая подсказка
import {useState, type ReactNode} from "react";

type Side = "top" | "bottom" | "left" | "right";

interface TooltipProps {
    content: string;
    children: ReactNode;
    side?: Side;
    delay?: number;
    disabled?: boolean;
}

const sideClasses: Record<Side, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2 origin-top",
    left: "right-full top-1/2 -translate-y-1/2 mr-2 origin-right",
    right: "left-full top-1/2 -translate-y-1/2 ml-2 origin-left",
};

const arrowClasses: Record<Side, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#0f1b2d] border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#0f1b2d] border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#0f1b2d] border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[#0f1b2d] border-y-transparent border-l-transparent",
};

export function Tooltip({content, children, side = "bottom", delay = 300, disabled = false}: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const clearPendingTimer = () => {
        if (timer) {
            clearTimeout(timer);
            setTimer(null);
        }
    };

    const handleEnter = () => {
        if (disabled) return;
        const id = setTimeout(() => {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        }, delay);
        setTimer(id);
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

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={handleClick}
        >
            {children}
            {mounted && !disabled && (
                <div
                    role="tooltip"
                    className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-[7px] bg-[#0f1b2d] px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(15,27,45,.35)] transition-all duration-150 ease-out ${
                        sideClasses[side]
                    } ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                >
                    {content}
                    <span className={`absolute h-0 w-0 border-[5px] ${arrowClasses[side]}`}/>
                </div>
            )}
        </div>
    );
}