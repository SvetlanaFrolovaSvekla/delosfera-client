import {useMemo, useState} from "react";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {useVndTaskCounts} from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {VndTaskList} from "@/components/componentsTasks/VndTaskList.tsx";
import {emptyTextByScope, type TasksScope} from "@/constants/tasksConst.ts";
import type {TaskStagePhase} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";

type TopTab = "coordination" | "actualization" | "consolidation";
// Вложенные вкладки внутри "Согласование": кто согласующий (coordination),
// кто инициатор своей редакции (myVndApproval)
type CoordinationSubTab = "coordination" | "myVndApproval";

const TOP_TABS: { id: TopTab; label: string }[] = [
    { id: "coordination", label: "Согласование" },
    { id: "actualization", label: "Актуализация" },
    { id: "consolidation", label: "Консолидация" },
];

const COORDINATION_SUB_TABS: { id: CoordinationSubTab; label: string }[] = [
    { id: "coordination", label: "Ждущие моего согласования" },
    { id: "myVndApproval", label: "Мои ВНД на согласовании" },
];

// Фильтр "Этап согласования" — доступен на обеих вложенных вкладках "Согласования"
const STAGE_PHASE_FILTER_OPTIONS: { value: "" | TaskStagePhase; label: string }[] = [
    { value: "", label: "Все этапы" },
    { value: "primary", label: "Первичное согласование" },
    { value: "repeat", label: "Согласование после внесённых изменений" },
    { value: "final", label: "Финальная выдержка" },
];

export function TasksVndPage() {
    const [topTab, setTopTab] = useState<TopTab>("coordination");
    const [coordinationSubTab, setCoordinationSubTab] = useState<CoordinationSubTab>("coordination");
    const [stagePhaseFilter, setStagePhaseFilter] = useState<"" | TaskStagePhase>("");

    const scope: TasksScope = topTab === "coordination" ? coordinationSubTab : topTab;
    const { tasks, isLoading } = useVndTasks(scope);
    const { counts } = useVndTaskCounts();

    const filteredTasks = useMemo(() => {
        if (topTab !== "coordination" || !stagePhaseFilter) return tasks;
        return tasks.filter((task) => task.stagePhase === stagePhaseFilter);
    }, [tasks, topTab, stagePhaseFilter]);

    const topTabsWithCounts = TOP_TABS.map((tab) => ({
        ...tab,
        n: tab.id === "coordination" ? counts.coordination + counts.myVndApproval : counts[tab.id],
    }));

    const subTabsWithCounts = COORDINATION_SUB_TABS.map((tab) => ({
        ...tab,
        n: counts[tab.id],
    }));

    const handleTopTabChange = (nextTab: TopTab) => {
        setTopTab(nextTab);
        setStagePhaseFilter("");
    };

    const handleSubTabChange = (nextSubTab: CoordinationSubTab) => {
        setCoordinationSubTab(nextSubTab);
        setStagePhaseFilter("");
    };

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title="Мои задачи"
                description="Перечень задач по нормотворчеству: согласование редакций ВНД, консолидация редакций, актуализация ВНД."
            />

            <Tabs<TopTab> tabs={topTabsWithCounts} value={topTab} onChange={handleTopTabChange} />

            {topTab === "coordination" && (
                <>
                    <Tabs<CoordinationSubTab>
                        tabs={subTabsWithCounts}
                        value={coordinationSubTab}
                        onChange={handleSubTabChange}
                    />

                    <div className="mb-4">
                        <SelectDropdown
                            options={STAGE_PHASE_FILTER_OPTIONS}
                            value={stagePhaseFilter}
                            onChange={(value) => setStagePhaseFilter(value as "" | TaskStagePhase)}
                            label="Этап согласования"
                            placeholder="Все этапы"
                            minWidth="260px"
                        />
                    </div>
                </>
            )}

            <VndTaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                emptyText={emptyTextByScope[scope]}
            />
        </div>
    );
}
