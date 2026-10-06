import {useEffect, useState} from "react";
import {keyOf} from "@/utils/dateUtils.ts";

/* Ключ "сегодня", который обновляется после полуночи */
export function useTodayKey(): string {
    const [key, setKey] = useState(() => keyOf(new Date()));
    useEffect(() => {
        const id = window.setInterval(() => {
            const next = keyOf(new Date());
            setKey(prev => (prev === next ? prev : next));
        }, 60_000);
        return () => window.clearInterval(id);
    }, []);
    return key;
}