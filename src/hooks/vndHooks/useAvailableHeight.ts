// Высчитывает, сколько места осталось от верхнего края блока до низа экрана,
// чтобы таб не создавал скролл страницы
import {useLayoutEffect, useRef, useState} from "react";

export function useAvailableHeight(bottomGap = 5) {
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number>();

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const recalc = () => {
            const top = el.getBoundingClientRect().top;
            setHeight(Math.max(300, window.innerHeight - top - bottomGap));
        };

        const observer = new ResizeObserver(recalc);
        observer.observe(document.body);
        recalc();

        return () => observer.disconnect();
    }, [bottomGap]);

    return {ref, height};
}