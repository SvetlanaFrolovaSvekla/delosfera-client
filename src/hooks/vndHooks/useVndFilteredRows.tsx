import {useMemo} from "react";
import type {VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import {useVndSearch} from "@/hooks/vndHooks/useVndSearch.ts";

export function useVndFilteredRows(searchRequest: VndSearchRequest, search: string) {
    const {data: vndAll, loading, error} = useVndSearch(searchRequest);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vndAll;
        return vndAll.filter((r) =>
            `${r.name} ${r.code} ${r.typeName} ${r.developerName} ${r.organName}`.toLowerCase().includes(q)
        );
    }, [vndAll, search]);

    return {filteredRows, loading, error};
}