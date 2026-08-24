import {getDeadlineUrgency, getRemainingLabel} from "@/utils/dateUtils.ts";
import {DEADLINE_URGENCY_META} from "@/constants/vndStatus.ts";
import {STAGE_KIND_RESPONSE_TO_REQUEST, STAGE_LABELS} from "@/constants/coordinationParams.ts";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";

export function getDeadlineTone(deadlineAt: string | null, totalHours: number | null): { label: string; color: string } {
    if (!deadlineAt) return { label: "—", color: "#8b97ab" };

    const urgency = getDeadlineUrgency(deadlineAt, totalHours);
    const label = getRemainingLabel(deadlineAt);

    return { label, color: DEADLINE_URGENCY_META[urgency].color };
}

// Лейбл этапа согласования ("Юридическое управление" и т.п.) по строковому
// kind, который отдаёт бэкенд (VndTaskResponse.stageKind)
export function getStageKindLabel(stageKind: VndTaskResponse["stageKind"]): string | null {
    if (!stageKind) return null;
    const requestKind = STAGE_KIND_RESPONSE_TO_REQUEST[stageKind];
    return requestKind ? STAGE_LABELS[requestKind] : null;
}

// Название/суть задачи — само название ВНД показывается на карточке отдельной строкой
// (см. VndTaskCard), поэтому здесь оно больше не дублируется.
export function getActionTitle(task: VndTaskResponse): string {
    // Для myVndApproval и (если пришёл) consolidation бэкенд уже отдаёт готовый
    // человекочитаемый статус — используем его вместо старой производной формулировки.
    if (task.statusLabel) {
        return task.statusLabel;
    }

    if (task.scope === "coordination") {
        switch (task.stagePhase) {
            case "primary":
                return "Провести первичное согласование редакции";
            case "repeat":
                return "Провести согласование после внесённых инициатором изменений по вашим правкам";
            case "final":
                return "Ознакомиться с редакцией на финальной выдержке";
            default:
                return "Согласовать редакцию";
        }
    }

    if (task.scope === "actualization") {
        return "Актуализировать ВНД";
    }

    return "Провести консолидацию ВНД";
}

export function getMetaText(task: VndTaskResponse): string {
    if (task.scope === "coordination") {
        const parts: string[] = [];

        if (task.redactionCode) parts.push(`Редакция ${task.redactionCode}`);
        const stageLabel = getStageKindLabel(task.stageKind);
        if (stageLabel) parts.push(stageLabel);
        if (task.initiatorName) parts.push(`Инициатор: ${task.initiatorName}`);
        if (task.deadlineMinutes) parts.push(`Норматив: ${task.deadlineMinutes} ч`);

        return parts.length > 0 ? parts.join(" · ") : "Ожидает вашего решения";
    }

    if (task.scope === "myVndApproval") {
        return task.redactionCode ? `Редакция ${task.redactionCode}` : "Отслеживайте ход согласования";
    }

    return "Требует внимания ответственного";
}
