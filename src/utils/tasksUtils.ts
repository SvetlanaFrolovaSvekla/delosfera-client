import type {TFunction} from "i18next";
import {formatDurationMinutes, getDeadlineUrgency, getRemainingLabel} from "@/utils/dateUtils.ts";
import {DEADLINE_URGENCY_META} from "@/constants/vndStatus.ts";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";

export function getDeadlineTone(deadlineAt: string | null, totalMinutes: number | null, t: TFunction): { label: string; color: string } {
    if (!deadlineAt) return { label: "—", color: "#8b97ab" };

    const urgency = getDeadlineUrgency(deadlineAt, totalMinutes);
    const label = getRemainingLabel(deadlineAt, t);

    return { label, color: DEADLINE_URGENCY_META[urgency].color };
}

// Лейбл этапа согласования
export function getStageKindLabel(stageTitle: VndTaskResponse["stageTitle"]): string | null {
    return stageTitle ?? null;
}

// Название/суть задачи - само название ВНД показывается на карточке отдельной строкой
export function getActionTitle(task: VndTaskResponse, t: TFunction): string {
    // Для myVndApproval и (если пришёл) consolidation бэкенд уже отдаёт готовый
    // человекочитаемый статус
    if (task.statusLabel) {
        return task.statusLabel;
    }

    if (task.scope === "coordination") {
        switch (task.stagePhase) {
            case "primary":
                return t("tasks.vnd.actionTitle.coordinationPrimary");
            case "repeat":
                return t("tasks.vnd.actionTitle.coordinationRepeat");
            case "final":
                return t("tasks.vnd.actionTitle.coordinationFinal");
            default:
                return t("tasks.vnd.actionTitle.coordinationDefault");
        }
    }

    if (task.scope === "actualization") {
        return t("tasks.vnd.actionTitle.actualization");
    }

    if (task.scope === "actualizationRequest") {
        return t("tasks.vnd.actionTitle.actualizationRequest");
    }

    if (task.scope === "actualizationApproved") {
        return t("tasks.vnd.actionTitle.actualizationApproved");
    }

    return t("tasks.vnd.actionTitle.consolidationDefault");
}

export function getMetaText(task: VndTaskResponse, t: TFunction): string {
    if (task.scope === "coordination") {
        const parts: string[] = [];

        if (task.redactionCode) parts.push(t("tasks.vnd.meta.redaction", {code: task.redactionCode}));
        const stageLabel = getStageKindLabel(task.stageTitle);
        if (stageLabel) parts.push(stageLabel);
        if (task.initiatorName) parts.push(t("tasks.vnd.meta.initiator", {name: task.initiatorName}));
        if (task.deadlineMinutes) {
            parts.push(t("tasks.vnd.meta.norm", {value: formatDurationMinutes(task.deadlineMinutes, t)}));
        }

        return parts.length > 0 ? parts.join(" · ") : t("tasks.vnd.meta.waitingDecision");
    }

    if (task.scope === "myVndApproval") {
        return task.redactionCode
            ? t("tasks.vnd.meta.redaction", {code: task.redactionCode})
            : t("tasks.vnd.meta.trackApproval");
    }

    if (task.scope === "rejected") {
        const parts: string[] = [];
        if (task.redactionCode) parts.push(t("tasks.vnd.meta.redaction", {code: task.redactionCode}));
        if (task.rejectedByName) parts.push(t("tasks.vnd.meta.rejectedBy", {name: task.rejectedByName}));
        return parts.length > 0 ? parts.join(" · ") : t("tasks.vnd.meta.needsInitiatorAttention");
    }

    if (task.scope === "actualizationRequest") {
        return task.initiatorName
            ? t("tasks.vnd.meta.applicant", {name: task.initiatorName})
            : t("tasks.vnd.meta.waitingDecision");
    }

    if (task.scope === "actualizationApproved") {
        return t("tasks.vnd.meta.confirmStartCycle");
    }

    return t("tasks.vnd.meta.needsResponsibleAttention");
}

// Поиск по подстроке (без учёта регистра)
export function matchesTaskSearch(task: VndTaskResponse, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return [task.vndTitle, task.vndCode, task.redactionCode, task.initiatorName, task.rejectedByName]
        .some((field) => field?.toLowerCase().includes(q));
}

// Тот же поиск по подстроке
export function matchesInboxTaskSearch(task: InboxTask, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return [task.documentTitle, task.regNumber, task.documentTypeTitle, task.taskType, task.onBehalfOf]
        .some((field) => field?.toLowerCase().includes(q));
}
