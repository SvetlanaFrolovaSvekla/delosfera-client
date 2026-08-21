import type {MouseEvent} from "react";
import {Link} from "react-router-dom";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {COORDINATION_STAGE_META, TASK_SCOPE_META} from "@/constants/vndStatus.ts";
import {getActionTitle, getDeadlineTone, getMetaText} from "@/utils/tasksUtils.ts";
import {Icon} from "@/components/icons/Icon.tsx";


interface VndTaskCardProps {
    task: VndTaskResponse;
}

const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
        e.preventDefault();
    }
};

// Скоупы, у которых карточка ведёт на таб "Ход согласования" открытого ВНД —
// в остальных случаях (актуализация/консолидация) правильный таб определяет сама страница ВНД.
const APPROVAL_TAB_SCOPES: VndTaskResponse["scope"][] = ["coordination", "myVndApproval"];

export function VndTaskCard({task}: VndTaskCardProps) {
    // Основной бейдж = раздел/вкладка "Мои задачи", в которую ведёт карточка
    // ("Ждущие моего согласования" / "Мои ВНД на согласовании" / "Актуализация" / "Консолидация")
    const scopeMeta = TASK_SCOPE_META[task.scope];
    const ScopeIcon = scopeMeta.icon;

    // Отдельный бейдж = текущий этап согласования (первичное/повторное/финальная выдержка) —
    // заполняется и для coordination, и для myVndApproval
    const stageMeta = task.stagePhase
        ? COORDINATION_STAGE_META[task.stagePhase as keyof typeof COORDINATION_STAGE_META]
        : null;

    const hasStagePhase = task.scope === "coordination" || task.scope === "myVndApproval";
    const due = hasStagePhase
        ? getDeadlineTone(task.deadlineAt, task.deadlineMinutes)
        : getDeadlineTone(task.dueActualizationDate, null);

    return (
        <Link
            to={`/base-vnd/${task.vndId}`}
            state={APPROVAL_TAB_SCOPES.includes(task.scope) ? {tab: "approval"} : undefined}
            draggable={false}
            onClick={handleClick}
            className="cursor-pointer flex w-full items-center gap-[13px] rounded-[14px] border border-[#e9edf3]
                       bg-white px-[18px] py-[13px] text-left transition-colors hover:bg-[#f8fafc]
                       select-text [-webkit-user-drag:none]"
        >
            <span
                className="grid h-9 w-9 flex-none place-items-center rounded-[10px]"
                style={{background: scopeMeta.bg, color: scopeMeta.color}}
            >
                <ScopeIcon size={18}/>
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span
                        className="text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]"
                        style={{fontFamily: "'IBM Plex Mono', monospace"}}
                    >
                        ВНД-{task.vndCode}
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{background: scopeMeta.bg, color: scopeMeta.color}}
                    >
                        {scopeMeta.label}
                    </span>
                    {/* Текущий этап согласования — отдельно от раздела выше */}
                    {stageMeta && (
                        <span
                            className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                            style={{background: stageMeta.bg, color: stageMeta.color}}
                        >
                            {stageMeta.label}
                        </span>
                    )}
                </span>

                {/* Название ВНД — отдельной строкой, чтобы быть видимым независимо от скоупа */}
                <span className="mt-[3px] block truncate text-[13.5px] font-semibold text-[#1c2740]">
                    «{task.vndTitle}»
                </span>

                {/* Суть задачи */}
                <span className="mt-0.5 block truncate text-[12.5px] font-medium text-[#3a4560]">
                    {getActionTitle(task)}
                </span>

                <span className="mt-0.5 block truncate text-[11.5px] text-[#8b97ab]">
                    {getMetaText(task)}
                </span>

                {/* Комментарий инициатора по предыдущему кругу — контекст, зачем документ снова здесь */}
                {task.initiatorComment && (
                    <span className="mt-0.5 block truncate text-[11.5px] italic text-[#a3adbd]">
                        «{task.initiatorComment}»
                    </span>
                )}
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
