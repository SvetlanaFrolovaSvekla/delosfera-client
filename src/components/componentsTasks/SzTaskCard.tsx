import {Link} from "react-router-dom";
import {taskLink, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {Icon} from "@/components/icons/Icon.tsx";

interface SzTaskCardProps {
    task: InboxTask;
}

function formatDue(iso: string | null): string {
    if (!iso) return "без срока";
    return new Date(iso).toLocaleString("ru-RU", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}

// Карточка задачи по служебной записке в виджете "Мои задачи" на главной.
// Записки живут вне контура ВНД, поэтому у них своя карточка: ссылка ведёт на
// /sz/{entityId}, а не на карточку ВНД.
export function SzTaskCard({task}: SzTaskCardProps) {
    return (
        <Link
            to={taskLink(task)}
            draggable={false}
            className="cursor-pointer flex w-full items-center gap-[13px] rounded-[14px] border border-[#e9edf3]
                       bg-white px-[18px] py-[13px] text-left transition-colors hover:bg-[#f8fafc]"
        >
            <span
                className="grid h-9 w-9 flex-none place-items-center rounded-[10px]"
                style={{background: "#eef3ff", color: "#2f68f5"}}
            >
                <Icon name="vnd" width={18} height={18}/>
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span
                        className="text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]"
                        style={{fontFamily: "'IBM Plex Mono', monospace"}}
                    >
                        {task.regNumber ?? "без номера"}
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{background: "#eef3ff", color: "#2f68f5"}}
                    >
                        {task.documentTypeTitle}
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{background: "#f2f5f9", color: "#55617a"}}
                    >
                        {task.taskType}
                    </span>
                </span>

                <span className="mt-[3px] block truncate text-[13.5px] font-semibold text-[#1c2740]">
                    «{task.documentTitle}»
                </span>

                {task.onBehalfOf && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-[#8b97ab]">
                        по замещению за {task.onBehalfOf}
                    </span>
                )}
            </span>

            <span
                className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold"
                style={{color: task.isOverdue ? "#c0392b" : "#55617a"}}
            >
                <Icon name="clock" width={14} height={14}/>
                {task.isOverdue ? "просрочено" : formatDue(task.dueAt)}
            </span>

            <Icon name="chevr" width={17} height={17} className="flex-none text-[#c3ccd8]"/>
        </Link>
    );
}
