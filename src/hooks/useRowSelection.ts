import {useCallback, useMemo, useState} from "react";

/**
 * Выбор строк таблицы для массовых операций: набор id, переключение одной строки,
 * "выбрать все на странице" и сброс.
 */
export function useRowSelection<T extends { id: number }>(items: T[]) {
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const toggleRow = useCallback((id: number) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    }), []);

    const allOnPageSelected = useMemo(
        () => items.length > 0 && items.every((i) => selected.has(i.id)),
        [items, selected],
    );

    const toggleAll = useCallback(() => setSelected((prev) => {
        const next = new Set(prev);
        if (items.every((i) => next.has(i.id))) items.forEach((i) => next.delete(i.id));
        else items.forEach((i) => next.add(i.id));
        return next;
    }), [items]);

    const clear = useCallback(() => setSelected(new Set()), []);

    return {selected, toggleRow, toggleAll, allOnPageSelected, clear};
}