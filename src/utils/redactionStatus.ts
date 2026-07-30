import type { VndRedactionResponse } from "@/service/vndService/vndServiceType.ts";

export type RedactionDisplayStatus = "current" | "draft" | "pending" | "rejected" | "outdated";

export function getRedactionDisplayStatus(r: VndRedactionResponse): RedactionDisplayStatus {
    if (r.isCurrent) return "current";
    if (r.approvalStatus === "Draft") return "draft";
    if (r.approvalStatus === "Pending") return "pending";
    if (r.approvalStatus === "Rejected") return "rejected";
    return "outdated";
}

// 2. Добавляем угловые скобки <...> для Record
export const REDACTION_STATUS_META: Record<
    RedactionDisplayStatus,
    { label: string; color: string; bg: string }
> = {
    current: { label: "актуальная", color: "#1c7a4d", bg: "#e2f4ea" },
    draft: { label: "требует согласования", color: "#4e57d6", bg: "#ececfc" },
    pending: { label: "на согласовании", color: "#9a6408", bg: "#fdf6e8" },
    rejected: { label: "отклонена", color: "#c0392b", bg: "#fdf1f1" },
    outdated: { label: "неактуальна", color: "#8b97ab", bg: "#f2f5f9" },
};