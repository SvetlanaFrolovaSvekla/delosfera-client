import {useState} from "react";

export function useAsyncAction<T = number>() {
    const [activeId, setActiveId] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async (id: T, fn: () => Promise<void>, fallbackMessage: string) => {
        setError(null);
        setActiveId(id);
        try {
            await fn();
        } catch (e) {
            setError(e instanceof Error ? e.message : fallbackMessage);
        } finally {
            setActiveId(null);
        }
    };

    return {
        activeId,
        error,
        run,
        isActive: (id: T) => activeId === id,
    };
}