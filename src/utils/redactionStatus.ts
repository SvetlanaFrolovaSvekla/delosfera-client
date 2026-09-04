import type { VndRedactionResponse } from "@/service/vndService/vndServiceType.ts";
import type { VndStatusKey } from "@/constants/vndTabs.ts";
import { isVndPendingEffective } from "@/constants/vndStatus.ts";

export type RedactionDisplayStatus =
    "current" | "pendingEffective" | "draft" | "pending" | "rejected" | "consolidation" | "outdated";

export function getRedactionDisplayStatus(
    r: VndRedactionResponse,
    vndStatus?: VndStatusKey,
    isLatest?: boolean,
    /** Дата вступления в силу ВНД — если она ещё в будущем, действующая (isCurrent) редакция
     * показывается как "pendingEffective", а не "current" (см. isVndPendingEffective). */
    effectiveDate?: string | null,
): RedactionDisplayStatus {
    // "Консолидация" относится только к редакции, которая СЕЙЧАС проходит консолидацию — это
    // всегда самая свежая (наибольший number). Раньше сюда попадала ЛЮБАЯ нетекущая редакция,
    // пока vndStatus === "consol" — из-за этого уже опубликованные в прошлом Р1/Р2/Р3 тоже
    // показывали "консолидация", хотя давно устарели (см. баг: "Р1 консолидация, Р2 консолидация,
    // Р3 актуальная, Р4 актуальная"). isLatest должен передаваться вызывающей стороной
    // (обычно — redaction.id === sortedDesc[0]?.id, самая свежая по number редакция).
    //
    // ВАЖНО: эта проверка идёт РАНЬШЕ r.isCurrent. При актуализации без согласования новая
    // редакция становится "текущей" (CurrentRedactionId) сразу при загрузке — раньше самого
    // подтверждения консолидации (даты принятия и т.п. проставляются только в PublishAsync).
    // Поэтому пока vndStatus остаётся "consol", такая редакция должна показывать "консолидация",
    // а не "актуальная" — иначе документ выглядит уже консолидированным, хотя это не так.
    if (vndStatus === "consol" && isLatest) return "consolidation";
    if (r.isCurrent) {
        if (vndStatus && isVndPendingEffective(vndStatus, effectiveDate)) return "pendingEffective";
        return "current";
    }
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
        pendingEffective: { label: "ожидание вступления в силу", color: "#c2410c", bg: "#ffedd5" },
        draft: { label: "требует согласования", color: "#4e57d6", bg: "#ececfc" },
        pending: { label: "на согласовании", color: "#9a6408", bg: "#fdf6e8" },
        rejected: { label: "отклонена", color: "#c0392b", bg: "#fdf1f1" },
        consolidation: { label: "консолидация", color: "#4e57d6", bg: "#ececfc" },
        outdated: { label: "неактуальна", color: "#8b97ab", bg: "#f2f5f9" },
    };