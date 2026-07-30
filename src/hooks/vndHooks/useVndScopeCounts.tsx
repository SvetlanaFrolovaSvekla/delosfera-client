import {useVndSearch} from "@/hooks/vndHooks/useVndSearch.ts";

export function useVndScopeCounts() {
    const {data: allForCounts} = useVndSearch({}, 500);

    return {
        all: allForCounts.filter((r) => r.status !== "arch" && r.status !== "draft").length,
        active: allForCounts.filter((r) => r.status === "active").length,
        arch: allForCounts.filter((r) => r.status === "arch").length,
        draft: allForCounts.filter((r) => r.status === "draft").length,
    };
}