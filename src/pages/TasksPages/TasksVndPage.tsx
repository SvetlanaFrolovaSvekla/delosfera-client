import { useState } from "react";
import { useVndTasks } from "@/hooks/tasksVndHooks/useVndTasks.ts";
import { useVndTaskCounts } from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import { Tabs } from "@/components/componentsGeneral/Tabs.tsx";
import { VndTaskList } from "@/components/componentsTasks/VndTaskList.tsx";
import {emptyTextByScope, type TasksScope} from "@/constants/tasksConst.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";

export function TasksVndPage() {
    const [scope, setScope] = useState<TasksScope>("coordination");
    const { tasks, isLoading } = useVndTasks(scope);
    // На вкладке "Согласование" дополнительно подтягиваем "Мои ВНД на согласовании" —
    // отдельная аудитория (инициатор/ответственный за актуализацию), не пересекается
    // с основным списком coordination (там — согласующие).
    const { tasks: myVndApprovalTasks, isLoading: isMyVndApprovalLoading } = useVndTasks("myVndApproval");
    const { counts } = useVndTaskCounts();

    const scopeTabs = [
        { id: "coordination" as TasksScope, label: "Согласование", n: counts.coordination + counts.myVndApproval },
        { id: "actualization" as TasksScope, label: "Актуализация", n: counts.actualization },
        { id: "consolidation" as TasksScope, label: "Консолидация", n: counts.consolidation },
    ];

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title="Мои задачи"
                description="Перечень задач по нормотворчеству: согласование редакций ВНД, консолидация редакций, актуализация ВНД."
            />

            <Tabs<TasksScope> tabs={scopeTabs} value={scope} onChange={setScope} />

            {scope === "coordination" ? (
                <>
                    <h3 className="mt-6 mb-1 text-[13px] font-semibold text-[#1c2740]">
                        Ждущие моего согласования
                    </h3>
                    <VndTaskList
                        tasks={tasks}
                        isLoading={isLoading}
                        emptyText={emptyTextByScope.coordination}
                    />

                    <h3 className="mt-8 mb-1 text-[13px] font-semibold text-[#1c2740]">
                        Мои ВНД на согласовании
                    </h3>
                    <VndTaskList
                        tasks={myVndApprovalTasks}
                        isLoading={isMyVndApprovalLoading}
                        emptyText={emptyTextByScope.myVndApproval}
                    />
                </>
            ) : (
                <VndTaskList
                    tasks={tasks}
                    isLoading={isLoading}
                    emptyText={emptyTextByScope[scope]}
                />
            )}
        </div>
    );
}