import {useCallback, useEffect, useRef, useState} from "react";
import {vndBoardService, type VndBoardResponse} from "@/service/vndService/vndBoardService.ts";

/**
 * Данные "Доски ВНД". reload() перечитывает доску "тихо" — уже показанные данные остаются на
 * экране до прихода новых (без мигания лоадера после каждого действия на карточке).
 */
export function useVndBoard() {
    const [data, setData] = useState<VndBoardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    const reload = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        try {
            const result = await vndBoardService.get();
            if (requestId !== requestIdRef.current) return;
            setData(result);
            setError(null);
        } catch (e) {
            if (requestId !== requestIdRef.current) return;
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    return {data, loading, error, reload};
}
