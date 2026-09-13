// Виджет "Мои задачи"
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {ListChecks} from "lucide-react";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import {SzTaskCard} from "@/components/componentsTasks/SzTaskCard.tsx";
import {HOME_TOP_ROW_HEIGHT} from "@/constants/home.ts";

interface MyTasksCardProps {
    tasks: VndTaskResponse[];
    // Задачи по служебным запискам из сводного реестра — живут вне контура ВНД,
    // поэтому передаются отдельно и рисуются своей карточкой.
    szTasks?: InboxTask[];
    // Задачи по закупкам — тоже из сводного реестра, вне контура ВНД.
    prcTasks?: InboxTask[];
    isLoading: boolean;
}

const VISIBLE_TASKS_LIMIT = 15;

// Табы панели (как на "Последняя активность"): все / ВНД / служебные записки / закупки.
const SECTIONS: { id: string; label: string }[] = [
    {id: "all", label: "Все"},
    {id: "vnd", label: "ВНД"},
    {id: "sz", label: "СЗ"},
    {id: "prc", label: "Закупки"},
];

export function MyTasksCard({tasks, szTasks = [], prcTasks = [], isLoading}: MyTasksCardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [section, setSection] = useState<string>("all");

    const vndTasks = section === "all" || section === "vnd" ? tasks : [];
    const visibleSzSource = section === "all" || section === "sz" ? szTasks : [];
    const visiblePrcSource = section === "all" || section === "prc" ? prcTasks : [];

    const visibleTasks = vndTasks.slice(0, VISIBLE_TASKS_LIMIT);
    // ВНД занимают первые VISIBLE_TASKS_LIMIT мест; записками добираем остаток,
    // закупками — то, что осталось после записок, чтобы виджет не разрастался сверх лимита.
    const visibleSzTasks = visibleSzSource.slice(0, Math.max(0, VISIBLE_TASKS_LIMIT - visibleTasks.length));
    const visiblePrcTasks = visiblePrcSource.slice(
        0,
        Math.max(0, VISIBLE_TASKS_LIMIT - visibleTasks.length - visibleSzTasks.length),
    );
    const hasMoreTasks = vndTasks.length + visibleSzSource.length + visiblePrcSource.length > VISIBLE_TASKS_LIMIT;
    const isEmpty = vndTasks.length === 0 && visibleSzSource.length === 0 && visiblePrcSource.length === 0;

    return (
        // Высота карточки зафиксирована (HOME_TOP_ROW_HEIGHT) и совпадает с "План актуализации
        // ВНД" рядом (см. ActualizationPlanCard.tsx) - обе теперь одной и той же высоты, а не
        // "примерно одинаковой" (см. items-start в HomePage.tsx). Header - flex-none, список
        // ниже сам занимает оставшееся место и скроллится (см. flex-1 min-h-0 overflow-y-auto
        // ниже вместо прежнего фиксированного style={{maxHeight}}).
        <div
            className="flex flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            style={{height: HOME_TOP_ROW_HEIGHT}}
        >
            <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                <div className="flex items-center gap-2.5">
                    {/* Мои задачи - кружок с общим числом задач убран: то же число теперь
                        показывает плитка "Мои задачи" в верхней сводке (см. HomeKpiSection.tsx,
                        totalTasksCount) - дублировать его ещё и здесь смысла не было. */}
                    <h2 className="text-[15px] font-semibold">{t("tasks.myTasks.title")}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex flex-wrap gap-1.5">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSection(s.id)}
                                className="cursor-pointer rounded-full px-2.5 py-[3px] text-[11px] font-semibold transition-colors"
                                style={{
                                    border: `1px solid ${section === s.id ? "#2f68f5" : "#e5e9f0"}`,
                                    background: section === s.id ? "#eef3ff" : "#fff",
                                    color: section === s.id ? "#2f68f5" : "#55617a",
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                        onClick={() => navigate("/tasks")}
                    >
                        {/* Все задачи */}
                        {t("tasks.myTasks.allTasks")}
                    </button>
                </div>
            </div>
            {/* Список сам занимает оставшееся место в карточке фиксированной высоты
                (HOME_TOP_ROW_HEIGHT) и скроллится, если не помещается — см. комментарий у
                style={{height}} карточки выше. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading ? (
                    // Загрузка задач…
                    <Loader label={t("tasks.myTasks.loading")} fullHeight={false}/>
                ) : isEmpty ? (
                    <EmptyState
                        embedded
                        icon={ListChecks}
                        title={t("tasks.myTasks.empty")}
                        description={t("tasks.myTasks.emptyDescription")}
                    />
                ) : (
                    <>
                        {/* square - без скруглённых углов: строки идут впритык друг к другу без
                            отступа, скруглённые углы каждой смотрелись неаккуратно на стыках. */}
                        {visibleTasks.map((task) => (
                            <VndTaskCard key={`vnd-${task.vndId}`} task={task} square/>
                        ))}
                        {visibleSzTasks.map((task) => (
                            <SzTaskCard key={`sz-${task.taskId}`} task={task}/>
                        ))}
                        {visiblePrcTasks.map((task) => (
                            <SzTaskCard key={`prc-${task.taskId}`} task={task}/>
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