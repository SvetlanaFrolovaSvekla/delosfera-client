import {formatDurationMinutes, getDeadlineUrgency, getRemainingLabel} from "@/utils/dateUtils.ts";
import {DEADLINE_URGENCY_META} from "@/constants/vndStatus.ts";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";

export function getDeadlineTone(deadlineAt: string | null, totalMinutes: number | null): { label: string; color: string } {
    if (!deadlineAt) return { label: "—", color: "#8b97ab" };

    const urgency = getDeadlineUrgency(deadlineAt, totalMinutes);
    const label = getRemainingLabel(deadlineAt);

    return { label, color: DEADLINE_URGENCY_META[urgency].color };
}

// Лейбл этапа согласования ("Юридическое управление" и т.п.) — бэкенд отдаёт готовое
// название (VndTaskResponse.stageTitle), т.к. с динамическим справочником обязательных
// этапов набор возможных названий не ограничен фиксированным списком.
export function getStageKindLabel(stageTitle: VndTaskResponse["stageTitle"]): string | null {
    return stageTitle ?? null;
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

    if (task.scope === "actualizationRequest") {
        return "Рассмотреть заявку на доступ к актуализации";
    }

    if (task.scope === "actualizationApproved") {
        return "Начать актуализацию по одобренной заявке";
    }

    return "Провести консолидацию ВНД";
}

export function getMetaText(task: VndTaskResponse): string {
    if (task.scope === "coordination") {
        const parts: string[] = [];

        if (task.redactionCode) parts.push(`Редакция ${task.redactionCode}`);
        const stageLabel = getStageKindLabel(task.stageTitle);
        if (stageLabel) parts.push(stageLabel);
        if (task.initiatorName) parts.push(`Инициатор: ${task.initiatorName}`);
        if (task.deadlineMinutes) parts.push(`Норматив: ${formatDurationMinutes(task.deadlineMinutes)}`);

        return parts.length > 0 ? parts.join(" · ") : "Ожидает вашего решения";
    }

    if (task.scope === "myVndApproval") {
        return task.redactionCode ? `Редакция ${task.redactionCode}` : "Отслеживайте ход согласования";
    }

    if (task.scope === "rejected") {
        const parts: string[] = [];
        if (task.redactionCode) parts.push(`Редакция ${task.redactionCode}`);
        if (task.rejectedByName) parts.push(`Отклонил: ${task.rejectedByName}`);
        return parts.length > 0 ? parts.join(" · ") : "Требует внимания инициатора";
    }

    if (task.scope === "actualizationRequest") {
        return task.initiatorName ? `Заявитель: ${task.initiatorName}` : "Ожидает вашего решения";
    }

    if (task.scope === "actualizationApproved") {
        return "Подтвердите начало цикла актуализации";
    }

    return "Требует внимания ответственного";
}

// Поиск по подстроке (без учёта регистра) на странице "Мои задачи" — по тем полям,
// что человек реально пробегает глазами в списке карточек: название ВНД, номер ВНД,
// номер редакции, инициатор, кто отклонил.
export function matchesTaskSearch(task: VndTaskResponse, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return [task.vndTitle, task.vndCode, task.redactionCode, task.initiatorName, task.rejectedByName]
        .some((field) => field?.toLowerCase().includes(q));
}

// Тот же поиск по подстроке, но для сводного реестра задач (TaskInboxPage) — по названию
// документа, рег. номеру, типу контура/задачи и тому, за кого задача выполняется по замещению.
export function matchesInboxTaskSearch(task: InboxTask, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return [task.documentTitle, task.regNumber, task.documentTypeTitle, task.taskType, task.onBehalfOf]
        .some((field) => field?.toLowerCase().includes(q));
}
