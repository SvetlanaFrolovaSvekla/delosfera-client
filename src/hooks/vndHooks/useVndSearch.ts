import { useEffect, useState } from "react";
import { vndService } from "@/service/vndService/vndService.ts";
import type { VndResponse, VndSearchRequest } from "@/service/vndService/vndServiceType.ts";

export function useVndSearch(request: VndSearchRequest, debounceMs = 300) {
    const [data, setData] = useState<VndResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const timer = setTimeout(() => {
            vndService
                .search(request)
                .then((res) => { if (!cancelled) setData(res); })
                .catch((err) => { if (!cancelled) setError(err.message ?? "Ошибка загрузки данных"); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }, debounceMs);

        return () => { cancelled = true; clearTimeout(timer); };
        // JSON.stringify — самый простой способ не городить кучу зависимостей
    }, [JSON.stringify(request), debounceMs]);

    return { data, loading, error };
}