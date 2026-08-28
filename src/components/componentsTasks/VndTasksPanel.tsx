import {useMemo, useState} from "react";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {useVndTaskCounts} from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {VndTaskList} from "@/components/componentsTasks/VndTaskList.tsx";
import {emptyTextByScope, type TasksScope} from "@/constants/tasksConst.ts";
import type {TaskStagePhase} from "@/service/tasksVndService/tasksServiceTypes.ts";

/**
 * Задачи нормотворчества: согласование, актуализация, консолидация.
 *
 * Вынесено из отдельной страницы в компонент, потому что тот же перечень нужен
 * вкладкой в сводных задачах. Держать два списка с одними правилами — значит
 * однажды поправить один и забыть другой.
 */

type TopTab = "coordination" | "actualization" | "consolidation";

// Вложенные вкладки внутри «Согласования»: кто согласующий (coordination),
// кто инициатор своей редакции (myVndApproval).
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

// Фильтр «Этап согласования» — доступен на обеих вложенных вкладках «Согласования».
const STAGE_PHASE_FILTER_OPTIONS: { value: "" | TaskStagePhase; label: string }[] = [
    { value: "", label: "Все этапы" },
    { value: "primary", label: "Первичное согласование" },
    { value: "repeat", label: "Согласование после внесённых изменений" },
    { value: "final", label: "Финальная выдержка" },
];

export function VndTasksPanel() {
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

    // Смена вкладки сбрасывает фильтр этапа: он относится только к согласованию,
    // и унесённый на другую вкладку выглядел бы как пустой список без причины.
    const handleTopTabChange = (nextTab: TopTab) => {
        setTopTab(nextTab);
        setStagePhaseFilter("");
    };

    const handleSubTabChange = (nextSubTab: CoordinationSubTab) => {
        setCoordinationSubTab(nextSubTab);
        setStagePhaseFilter("");
    };

    return (
        <>
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
        </>
    );
}
