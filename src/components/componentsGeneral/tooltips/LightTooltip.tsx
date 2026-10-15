// Светлая (белая) подсказка с произвольным содержимым - легенды, пояснения со значками и т.п.
// В отличие от обычного тёмного Tooltip (только строка текста) сюда можно положить разметку.
// Рисуется порталом в body с position: fixed - не обрезается панелями с overflow: hidden; не
// пропадает, пока курсор над самой подсказкой (можно спокойно навести и прочитать).
import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";

interface LightTooltipProps {
    content: ReactNode;
    children: ReactNode;
    /** С какой стороны от триггера показывать (если места нет - перевернётся) */
    side?: "top" | "bottom";
    /** Выравнивание по горизонтали относительно триггера */
    align?: "start" | "center" | "end";
    /** Ширина подсказки в px (по умолчанию - по содержимому, не шире 360) */
    width?: number;
    className?: string;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

export function LightTooltip({content, children, side = "bottom", align = "start", width, className = ""}: LightTooltipProps) {
    const triggerRef = useRef<HTMLSpanElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const show = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setOpen(true);
    };
    // Небольшая задержка - чтобы успеть перевести курсор с триггера на саму подсказку
    const hide = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            setOpen(false);
            setPos(null);
        }, 120);
    };

    useEffect(() => () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const trigger = triggerRef.current?.getBoundingClientRect();
            const pop = popRef.current;
            if (!trigger || !pop) return;
            const pw = pop.offsetWidth;
            const ph = pop.offsetHeight;

            let top = side === "top" ? trigger.top - ph - GAP : trigger.bottom + GAP;
            if (side === "bottom" && top + ph > window.innerHeight - VIEWPORT_MARGIN && trigger.top - ph - GAP > VIEWPORT_MARGIN) {
                top = trigger.top - ph - GAP;
            }
            if (side === "top" && top < VIEWPORT_MARGIN) top = trigger.bottom + GAP;

            let left = align === "center"
                ? trigger.left + trigger.width / 2 - pw / 2
                : align === "end" ? trigger.right - pw : trigger.left;
            left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - pw - VIEWPORT_MARGIN));

            setPos({top, left});
        };

        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [open, side, align]);

    return (
        <>
            <span ref={triggerRef} className={`inline-flex ${className}`}
                  onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
                {children}
            </span>
            {open && createPortal(
                <div
                    ref={popRef}
                    role="tooltip"
                    onMouseEnter={show}
                    onMouseLeave={hide}
                    style={{
                        position: "fixed",
                        top: pos?.top ?? -9999,
                        left: pos?.left ?? -9999,
                        width,
                        maxWidth: width ? undefined : 360,
                        zIndex: 10000,
                        visibility: pos ? "visible" : "hidden",
                    }}
                    className="rounded-[12px] border border-[#e5e9f0] bg-white p-3 text-[12px] leading-[1.45] text-[#26324a] shadow-[0_14px_36px_-10px_rgba(15,27,45,.28)]"
                >
                    {content}
                </div>,
                document.body,
            )}
        </>
    );
}
