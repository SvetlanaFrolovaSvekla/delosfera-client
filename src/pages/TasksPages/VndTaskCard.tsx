import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { VndTaskResponse } from "@/service/tasksVndService/tasksServiceTypes.ts";
import { COORDINATION_STAGE_META, DEADLINE_URGENCY_META, TASK_SCOPE_META } from "@/constants/vndStatus.ts";
import { Icon } from "@/components/icons/Icon";
import { getDeadlineUrgency, getRemainingLabel } from "@/utils/dateUtils.ts";

interface VndTaskCardProps {
    task: VndTaskResponse;
}

const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
        e.preventDefault();
    }
};

function getDeadlineTone(deadlineAt: string | null, totalHours: number | null): { label: string; color: string } {
    if (!deadlineAt) return { label: "—", color: "#8b97ab" };

    const urgency = getDeadlineUrgency(deadlineAt, totalHours);
    const label = getRemainingLabel(deadlineAt);

    return { label, color: DEADLINE_URGENCY_META[urgency].color };
}

function getActionTitle(task: VndTaskResponse): string {
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

function getMetaText(task: VndTaskResponse): string {
    if (task.scope === "coordination") {
        const parts: string[] = [];

        if (task.redactionCode) parts.push(`Редакция ${task.redactionCode}`);
        if (task.initiatorName) parts.push(`Инициатор: ${task.initiatorName}`);
        if (task.deadlineHours) parts.push(`Норматив: ${task.deadlineHours} ч`);

        return parts.length > 0 ? parts.join(" · ") : "Ожидает вашего решения";
    }
    return "Требует внимания ответственного";
}

export function VndTaskCard({ task }: VndTaskCardProps) {
    const stageMeta = task.stagePhase
        ? COORDINATION_STAGE_META[task.stagePhase as keyof typeof COORDINATION_STAGE_META]
        : null;

    const scopeMeta = TASK_SCOPE_META[task.scope];
    const badgeMeta = task.scope === "coordination" && stageMeta ? stageMeta : scopeMeta;
    const BadgeIcon = badgeMeta.icon;

    const due = task.scope === "coordination"
        ? getDeadlineTone(task.deadlineAt, task.deadlineHours)
        : getDeadlineTone(task.dueActualizationDate, null);

    return (
        <Link
            to={`/basevnd/${task.vndId}`}
            draggable={false}
            onClick={handleClick}
            className="cursor-pointer flex w-full items-center gap-[13px] rounded-[14px] border border-[#e9edf3]
                       bg-white px-[18px] py-[13px] text-left transition-colors hover:bg-[#f8fafc]
                       select-text [-webkit-user-drag:none]"
        >
            <span
                className="grid h-9 w-9 flex-none place-items-center rounded-[10px]"
                style={{ background: badgeMeta.bg, color: badgeMeta.color }}
            >
                <BadgeIcon size={18} />
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span
                        className="text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        ВНД-{task.vndCode}
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{ background: badgeMeta.bg, color: badgeMeta.color }}
                    >
                        {badgeMeta.label}
                    </span>
                </span>
                <span className="mt-[3px] block truncate text-[13.5px] font-medium text-[#1c2740]">
                    {getActionTitle(task)}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                    {getMetaText(task)}
                </span>
            </span>

            <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: due.color }}>
                <Icon name="clock" width={14} height={14} />
                {due.label}
            </span>

            <Icon name="chevr" width={17} height={17} className="flex-none text-[#c3ccd8]" />
        </Link>
    );
}