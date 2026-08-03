import { useState } from "react";
import { useVndTasks } from "@/hooks/tasksVndHooks/useVndTasks.ts";
import { useVndTaskCounts } from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import { Tabs } from "@/components/componentsGeneral/Tabs.tsx";
import { VndTaskList } from "@/pages/TasksPages/VndTaskList.tsx";
import {emptyTextByScope, type TasksScope} from "@/constants/tasksConst.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";

export function TasksVndPage() {
    const [scope, setScope] = useState<TasksScope>("coordination");
    const { tasks, isLoading} = useVndTasks(scope);
    const { counts } = useVndTaskCounts();

    const scopeTabs = [
        { id: "coordination" as TasksScope, label: "Согласование", n: counts.coordination },
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

            <VndTaskList
                tasks={tasks}
                isLoading={isLoading}
                emptyText={emptyTextByScope[scope]}
            />
        </div>
    );
}