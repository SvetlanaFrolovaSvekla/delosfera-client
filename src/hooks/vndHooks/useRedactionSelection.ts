import {useMemo} from "react";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";

export function useRedactionSelection(
    redactions: VndRedactionResponse[],
    selectedId: number | undefined
) {
    const sortedDesc = useMemo(
        () => [...redactions].sort((a, b) => b.number - a.number),
        [redactions]
    );

    const lastByNumber = sortedDesc[0];
    const current = redactions.find((r) => r.isCurrent);
    const selected = redactions.find((r) => r.id === selectedId) ?? sortedDesc[0];

    const compareTarget = useMemo(() => {
        const idx = sortedDesc.findIndex((r) => r.id === selected?.id);
        if (idx === -1) return undefined;
        return sortedDesc[idx + 1] ?? sortedDesc[idx - 1];
    }, [sortedDesc, selected]);

    const uploadBlocked =
        lastByNumber?.approvalStatus === "Draft" || lastByNumber?.approvalStatus === "Pending";

    return {sortedDesc, lastByNumber, current, selected, compareTarget, uploadBlocked};
}