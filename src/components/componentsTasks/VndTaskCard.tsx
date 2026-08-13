import type {MouseEvent} from "react";
import {Link} from "react-router-dom";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {COORDINATION_STAGE_META, TASK_SCOPE_META} from "@/constants/vndStatus.ts";
import {getActionTitle, getDeadlineTone, getMetaText} from "@/utils/tasksUtils.ts";
import {Icon} from "@/components/icons/Icon";


interface VndTaskCardProps {
    task: VndTaskResponse;
}

const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
        e.preventDefault();
    }
};


export function VndTaskCard({task}: VndTaskCardProps) {
    const stageMeta = task.stagePhase
        ? COORDINATION_STAGE_META[task.stagePhase as keyof typeof COORDINATION_STAGE_META]
        : null;

    const scopeMeta = TASK_SCOPE_META[task.scope];
    const badgeMeta = task.scope === "coordination" && stageMeta ? stageMeta : scopeMeta;
    const BadgeIcon = badgeMeta.icon;

    const due = task.scope === "coordination"
        ? getDeadlineTone(task.deadlineAt, task.deadlineMinutes)
        : getDeadlineTone(task.dueActualizationDate, null);

    return (
        <Link
            to={`/base-vnd/${task.vndId}`}
            state={task.scope === "coordination" || task.scope === "myVndApproval" ? {tab: "approval"} : undefined}
            draggable={false}
            onClick={handleClick}
            className="cursor-pointer flex w-full items-center gap-[13px] rounded-[14px] border border-[#e9edf3]
                       bg-white px-[18px] py-[13px] text-left transition-colors hover:bg-[#f8fafc]
                       select-text [-webkit-user-drag:none]"
        >
            <span
                className="grid h-9 w-9 flex-none place-items-center rounded-[10px]"
                style={{background: badgeMeta.bg, color: badgeMeta.color}}
            >
                <BadgeIcon size={18}/>
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span
                        className="text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]"
                        style={{fontFamily: "'IBM Plex Mono', monospace"}}
                    >
                        ВНД-{task.vndCode}
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{background: badgeMeta.bg, color: badgeMeta.color}}
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

            <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold"
                  style={{color: due.color}}>
                <Icon name="clock" width={14} height={14}/>
                {due.label}
            </span>

            <Icon name="chevr" width={17} height={17} className="flex-none text-[#c3ccd8]"/>
        </Link>
    );
}