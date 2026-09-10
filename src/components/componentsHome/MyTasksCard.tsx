// Виджет "Мои задачи"
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import {SzTaskCard} from "@/components/componentsTasks/SzTaskCard.tsx";

interface MyTasksCardProps {
    tasks: VndTaskResponse[];
    // Задачи по служебным запискам из сводного реестра — живут вне контура ВНД,
    // поэтому передаются отдельно и рисуются своей карточкой.
    szTasks?: InboxTask[];
    totalCount: number;
    isLoading: boolean;
}

const VISIBLE_TASKS_LIMIT = 15;

export function MyTasksCard({tasks, szTasks = [], totalCount, isLoading}: MyTasksCardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const visibleTasks = tasks.slice(0, VISIBLE_TASKS_LIMIT);
    // ВНД занимают первые VISIBLE_TASKS_LIMIT мест; записками добираем остаток,
    // чтобы виджет не разрастался сверх лимита.
    const visibleSzTasks = szTasks.slice(0, Math.max(0, VISIBLE_TASKS_LIMIT - visibleTasks.length));
    const hasMoreTasks = tasks.length + szTasks.length > VISIBLE_TASKS_LIMIT;
    const isEmpty = tasks.length === 0 && szTasks.length === 0;

    return (
        <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                <div className="flex items-center gap-2.5">
                    {/* Мои задачи */}
                    <h2 className="text-[15px] font-semibold">{t("tasks.myTasks.title")}</h2>
                    <span
                        className="rounded-full bg-[var(--app-soft,_#e9f0ff)] px-2 py-[2px] text-[11.5px] font-bold text-[var(--app-accent,_#2f68f5)]"
                        style={{fontFamily: "'IBM Plex Mono', monospace"}}
                    >
                        {totalCount}
                    </span>
                </div>
                <button
                    className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                    onClick={() => navigate("/tasks")}
                >
                    {/* Все задачи */}
                    {t("tasks.myTasks.allTasks")}
                </button>
            </div>
            <div>
                {isLoading ? (
                    // Загрузка задач…
                    <Loader label={t("tasks.myTasks.loading")} fullHeight={false}/>
                ) : isEmpty ? (
                    <div className="px-[18px] py-6 text-center text-[13px] text-[#8b97ab]">
                        {/* Нет активных задач */}
                        {t("tasks.myTasks.empty")}
                    </div>
                ) : (
                    <>
                        {visibleTasks.map((task) => (
                            <VndTaskCard key={`vnd-${task.vndId}`} task={task}/>
                        ))}
                        {visibleSzTasks.map((task) => (
                            <SzTaskCard key={`sz-${task.taskId}`} task={task}/>
                        ))}
                        {hasMoreTasks && (
                            <div className="border-t border-[#eef2f7] px-[18px] py-3 text-center">
                                <button
                                    className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                                    onClick={() => navigate("/tasks")}
                                >
                                    {/* Смотреть больше задач */}
                                    {t("tasks.myTasks.showMore")}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}