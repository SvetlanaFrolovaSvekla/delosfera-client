import {getDeadlineUrgency, getRemainingLabel} from "@/utils/dateUtils.ts";
import {DEADLINE_URGENCY_META} from "@/constants/vndStatus.ts";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";

export function getDeadlineTone(deadlineAt: string | null, totalHours: number | null): { label: string; color: string } {
    if (!deadlineAt) return { label: "—", color: "#8b97ab" };

    const urgency = getDeadlineUrgency(deadlineAt, totalHours);
    const label = getRemainingLabel(deadlineAt);

    return { label, color: DEADLINE_URGENCY_META[urgency].color };
}

export function getActionTitle(task: VndTaskResponse): string {
    const vndTitle = `«${task.vndTitle}»`;

    if (task.scope === "coordination") {
        switch (task.stagePhase) {
            case "primary":
                return `Провести первичное согласование редакции ВНД ${vndTitle}`;
            case "repeat":
                return `Провести согласование после внесённых инициатором изменений по вашим правкам ВНД ${vndTitle}`;
            case "final":
                return `Проверить финальную версию редакции ВНД ${vndTitle}`;
            default:
                return `Согласовать редакцию ВНД ${vndTitle}`;
        }
    }

    if (task.scope === "actualization") {
        return `Актуализировать ВНД ${vndTitle}`;
    }

    return `Провести консолидацию ВНД ${vndTitle}`;
}

export function getMetaText(task: VndTaskResponse): string {
    if (task.scope === "coordination") {
        const parts: string[] = [];

        if (task.redactionCode) parts.push(`Редакция ${task.redactionCode}`);
        if (task.initiatorName) parts.push(`Инициатор: ${task.initiatorName}`);
        if (task.deadlineHours) parts.push(`Норматив: ${task.deadlineHours} ч`);

        return parts.length > 0 ? parts.join(" · ") : "Ожидает вашего решения";
    }
    return "Требует внимания ответственного";
}