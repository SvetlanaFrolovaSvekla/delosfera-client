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
const DEFAULT_Z_INDEX = 9999;

// Ищет самый верхний открытый модальный оверлей на странице, который НЕ содержит
// внутри себя переданный триггер (т.е. тултип вызван элементом, который сейчас
// перекрыт модалкой, открытой поверх него). Модалки в проекте — это порталы прямо
// в document.body с fixed-контейнером на весь экран (inset-0) и своим z-index
// (z-50 / z-[60] и т.п.) — этого достаточно, чтобы найти их, не трогая каждый
// компонент модалки по отдельности.
// Если триггер лежит ВНУТРИ найденного оверлея (тултип используется внутри своей же
// модалки, например подсказка "Скачать документ") — такой оверлей не считается
// перекрывающим, тултип остаётся на переднем плане, как и раньше.
function findBlockingZIndex(trigger: HTMLElement): number | null {
    let maxZ: number | null = null;
    const candidates = document.body.querySelectorAll<HTMLElement>("*");
    for (const child of candidates) {
        if (child.hasAttribute("data-tooltip-portal")) continue;
        if (child.contains(trigger)) continue;

        const style = window.getComputedStyle(child);
        if (style.position !== "fixed") continue;

        const z = parseInt(style.zIndex, 10);
        if (Number.isNaN(z)) continue;

        // Полноэкранный оверлей — сверяемся по фактическим размерам через
        // getBoundingClientRect, а не по строковому значению top/left/right/bottom из
        // getComputedStyle (то сравнение оказалось слишком хрупким и не срабатывало).
        const rect = child.getBoundingClientRect();
        const coversViewport = rect.top <= 1 && rect.left <= 1
            && rect.width >= window.innerWidth - 2 && rect.height >= window.innerHeight - 2;
        if (!coversViewport) continue;

        if (maxZ === null || z > maxZ) maxZ = z;
    }
    return maxZ;
}

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
    // Если поверх триггера открыта модалка — тултип уходит на задний план (z-index ниже,
    // чем у модалки), чтобы не "всплывать" визуально поверх диалогового окна.
    const [zIndexOverride, setZIndexOverride] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const recomputeBlocking = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const blockingZ = findBlockingZIndex(trigger);
        setZIndexOverride(blockingZ !== null ? blockingZ - 1 : null);
    };

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

    // Пока тултип показан, следим за document.body: если поверх открылась модалка
    // (или, наоборот, закрылась) — пересчитываем, должен ли тултип уйти на задний план.
    // Это же чинит "зависание" тултипа поверх модалки, если она открылась прямо во время
    // наведения — mouseleave на перекрытом триггере в этом случае может не сработать.
    useEffect(() => {
        if (!mounted) return;
        recomputeBlocking();
        const observer = new MutationObserver(() => recomputeBlocking());
        observer.observe(document.body, {childList: true, subtree: true});
        return () => observer.disconnect();
    }, [mounted]);

    const handleEnter = () => {
        if (disabled) return;
        timerRef.current = setTimeout(() => {
            recomputeBlocking();
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
                        data-tooltip-portal="true"
                        className={`pointer-events-none fixed max-w-[420px] whitespace-normal break-words rounded-[7px] bg-[#0f1b2d] px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(15,27,45,.35)] transition-all duration-150 ease-out ${
                            visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                        }`}
                        style={{
                            top: coords.top,
                            left: coords.left,
                            transform: translate,
                            zIndex: zIndexOverride ?? DEFAULT_Z_INDEX,
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