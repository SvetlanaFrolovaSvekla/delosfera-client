/** Горизонтальная прокрутка с полосой и сверху, и снизу. Верхняя полоса видна только при переполнении. */
import {useEffect, useRef, useState, type ReactNode} from "react";

interface DoubleScrollProps {
    className?: string;
    children: ReactNode;
}

export function DoubleScroll({className, children}: DoubleScrollProps) {
    const topRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const [contentWidth, setContentWidth] = useState(0);
    const [overflowing, setOverflowing] = useState(false);

    // Ширина "пустышки" сверху = полная ширина содержимого основного контейнера
    useEffect(() => {
        const main = mainRef.current;
        if (!main) return;
        const update = () => {
            setContentWidth(main.scrollWidth);
            setOverflowing(main.scrollWidth > main.clientWidth + 1);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(main);
        Array.from(main.children).forEach((c) => ro.observe(c));
        return () => ro.disconnect();
    }, [children]);

    // Синхронизация в обе стороны (если значение уже равно, событие не стреляет, цикла нет)
    const syncFromTop = () => {
        if (topRef.current && mainRef.current && mainRef.current.scrollLeft !== topRef.current.scrollLeft)
            mainRef.current.scrollLeft = topRef.current.scrollLeft;
    };
    const syncFromMain = () => {
        if (topRef.current && mainRef.current && topRef.current.scrollLeft !== mainRef.current.scrollLeft)
            topRef.current.scrollLeft = mainRef.current.scrollLeft;
    };

    return (
        <>
            <div
                ref={topRef}
                onScroll={syncFromTop}
                aria-hidden
                className={`mb-4 overflow-x-auto overflow-y-hidden pb-1 max-lg:hidden ${overflowing ? "" : "!hidden"}`}
            >
                <div style={{width: contentWidth, height: 1}}/>
            </div>
            <div ref={mainRef} onScroll={syncFromMain} className={className}>
                {children}
            </div>
        </>
    );
}