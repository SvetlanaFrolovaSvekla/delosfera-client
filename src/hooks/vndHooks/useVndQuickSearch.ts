import {useEffect, useRef, useState} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndQuickSearchResult} from "@/service/vndService/vndServiceType.ts";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useVndQuickSearch(query: string) {
    const [results, setResults] = useState<VndQuickSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const trimmed = query.trim();

        if (trimmed.length < MIN_QUERY_LENGTH) {
            abortRef.current?.abort();
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timeoutId = setTimeout(() => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            vndService.quickSearch(trimmed, 8, controller.signal)
                .then((data) => {
                    setResults(data);
                    setLoading(false);
                })
                .catch((err: unknown) => {
                    if ((err as { name?: string })?.name !== "AbortError") setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [query]);

    return {results, loading};
}