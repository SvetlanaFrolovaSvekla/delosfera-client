import {useEffect, useRef, useState} from "react";

/**
 * Высота DOM-элемента, отслеживаемая через ResizeObserver — чтобы один виджет
 * мог подстроить свою высоту под другой (см. RecentNotificationsCard.tsx, которая
 * всегда заканчивается там же, где "Последняя активность").
 */
export function useElementHeight<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [height, setHeight] = useState<number | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setHeight(entry.contentRect.height);
        });
        observer.observe(el);
        setHeight(el.getBoundingClientRect().height);

        return () => observer.disconnect();
    }, []);

    return {ref, height};
}
