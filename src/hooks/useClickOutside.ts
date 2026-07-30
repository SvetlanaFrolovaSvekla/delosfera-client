/**
 * Вызывает onOutside при клике вне элемента ref, пока active === true.
 * Используется для закрытия dropdown/popover по клику снаружи.
 */
import {useEffect, type RefObject} from "react";

export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    active: boolean,
    onOutside: () => void,
) {
    useEffect(() => {
        if (!active) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onOutside();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [active, ref, onOutside]);
}