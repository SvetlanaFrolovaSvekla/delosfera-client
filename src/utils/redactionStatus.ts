import type { VndRedactionResponse } from "@/service/vndService/vndServiceType.ts";
import type { VndStatusKey } from "@/constants/vndTabs.ts";

export type RedactionDisplayStatus = "current" | "draft" | "pending" | "rejected" | "consolidation" | "outdated";

export function getRedactionDisplayStatus(
    r: VndRedactionResponse,
    vndStatus?: VndStatusKey,
    isLatest?: boolean,
): RedactionDisplayStatus {
    if (r.isCurrent) return "current";
    // "Консолидация" относится только к редакции, которая СЕЙЧАС проходит консолидацию — это
    // всегда самая свежая (наибольший number). Раньше сюда попадала ЛЮБАЯ нетекущая редакция,
    // пока vndStatus === "consol" — из-за этого уже опубликованные в прошлом Р1/Р2/Р3 тоже
    // показывали "консолидация", хотя давно устарели (см. баг: "Р1 консолидация, Р2 консолидация,
    // Р3 актуальная, Р4 консолидация"). isLatest должен передаваться вызывающей стороной
    // (обычно — redaction.id === sortedDesc[0]?.id, самая свежая по number редакция).
    if (vndStatus === "consol" && isLatest) return "consolidation";
    if (r.approvalStatus === "Draft") return "draft";
    if (r.approvalStatus === "Pending") return "pending";
    if (r.approvalStatus === "Rejected") return "rejected";
    return "outdated";
}

export const REDACTION_STATUS_META: Record<
RedactionDisplayStatus,
    { label: string; color: string; bg: string }
    > = {
        current: { label: "актуальная", color: "#1c7a4d", bg: "#e2f4ea" },
        draft: { label: "требует согласования", color: "#4e57d6", bg: "#ececfc" },
        pending: { label: "на согласовании", color: "#9a6408", bg: "#fdf6e8" },
        rejected: { label: "отклонена", color: "#c0392b", bg: "#fdf1f1" },
        consolidation: { label: "консолидация", color: "#4e57d6", bg: "#ececfc" },
        outdated: { label: "неактуальна", color: "#8b97ab", bg: "#f2f5f9" },
    };