import {useEffect, useRef, useState} from "react";
import {vndService} from "@/service/vndService/vndService.ts";
import type {VndResponse, VndSearchRequest} from "@/service/vndService/vndServiceType.ts";

const SEARCH_DEBOUNCE_MS = 350;

export function useVndActualizationFilteredRows(searchRequest: VndSearchRequest) {
    const [rows, setRows] = useState<VndResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    // TODO: пока что сравниваю по таким значениям осознанно
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const currentRequestId = ++requestIdRef.current;

        const timer = setTimeout(() => {
            setLoading(true);
            setError(null);

            vndService.search(searchRequest)
                .then((data) => {
                    if (requestIdRef.current === currentRequestId) setRows(data);
                })
                .catch((e) => {
                    if (requestIdRef.current === currentRequestId) {
                        setError(e instanceof Error ? e.message : "Не удалось загрузить документы");
                    }
                })
                .finally(() => {
                    if (requestIdRef.current === currentRequestId) setLoading(false);
                });
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(searchRequest)]);

    return {rows, loading, error};
}