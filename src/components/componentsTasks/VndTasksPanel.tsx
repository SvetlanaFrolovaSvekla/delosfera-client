import {useEffect, useMemo, useState} from "react";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {useVndTasksDone} from "@/hooks/tasksVndHooks/useVndTasksDone.ts";
import {useVndTaskCounts} from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {VndTaskList} from "@/components/componentsTasks/VndTaskList.tsx";
import {emptyTextByScope, type TasksScope} from "@/constants/tasksConst.ts";
import {matchesTaskSearch} from "@/utils/tasksUtils.ts";
import type {TaskScope, TaskStagePhase} from "@/service/tasksVndService/tasksServiceTypes.ts";

/**
 * Задачи нормотворчества: согласование, актуализация, консолидация.
 *
 * Вынесено из отдельной страницы в компонент, потому что тот же перечень нужен
 * вкладкой в сводных задачах. Держать два списка с одними правилами — значит
 * однажды поправить один и забыть другой.
 */

// "all" — сводная вкладка "Все": пять разделов одним списком (карточки уже различаются
// бейджем раздела — см. VndTaskCard), без вложенных вкладок и без переключателя
// "Активные/Выполненные" — у каждого раздела свой критерий "выполнено" (см. TasksService на
// бэкенде), смешивать их в одном списке было бы не нагляднее самого "Все".
type TopTab = "all" | "coordination" | "actualization" | "consolidation";

// Вложенные вкладки внутри «Согласования»: кто согласующий (coordination),
// кто инициатор своей редакции (myVndApproval), чья редакция была отклонена и ждёт правок
// (rejected).
type CoordinationSubTab = "coordination" | "myVndApproval" | "rejected";

// Активные (обычный список — то, что ждёт действия) / Выполненные (история, с пагинацией).
type DoneToggle = "active" | "done";

const DONE_PAGE_SIZE = 20;

const TOP_TABS: { id: TopTab; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "coordination", label: "Согласование" },
    { id: "actualization", label: "Актуализация" },
    { id: "consolidation", label: "Консолидация" },
];

const COORDINATION_SUB_TABS: { id: CoordinationSubTab; label: string }[] = [
    { id: "coordination", label: "Ждущие моего согласования" },
    { id: "myVndApproval", label: "Мои ВНД на согласовании" },
    { id: "rejected", label: "Отклонено" },
];

// Выпадающий список "По выполненности" рядом со строкой поиска — не таб, чтобы не плодить
// ещё один ряд вкладок под и без того тремя уровнями (верхние табы → подвкладки согласования).
const DONE_FILTER_OPTIONS: { value: DoneToggle; label: string }[] = [
    { value: "active", label: "Активные" },
    { value: "done", label: "Выполненные" },
];

// Фильтр «Этап согласования» — доступен на обеих вложенных вкладках «Согласования»,
// и в "Активных", и в "Выполненных" (в истории показывает, на каком круге приняли решение).
const STAGE_PHASE_FILTER_OPTIONS: { value: "" | TaskStagePhase; label: string }[] = [
    { value: "", label: "Все этапы" },
    { value: "primary", label: "Первичное согласование" },
    { value: "repeat", label: "Согласование после внесённых изменений" },
    { value: "final", label: "Финальная выдержка" },
];

export function VndTasksPanel() {
    const [topTab, setTopTab] = useState<TopTab>("coordination");
    const [coordinationSubTab, setCoordinationSubTab] = useState<CoordinationSubTab>("coordination");
    const [doneToggle, setDoneToggle] = useState<DoneToggle>("active");
    const [donePage, setDonePage] = useState(1);
    const [stagePhaseFilter, setStagePhaseFilter] = useState<"" | TaskStagePhase>("");
    const [searchQuery, setSearchQuery] = useState("");

    const scope: TasksScope = topTab === "all" ? "all" : topTab === "coordination" ? coordinationSubTab : topTab;

    // "Выполненные" не существует для вкладки "Все" — там переключатель вообще не показывается
    // (см. handleTopTabChange), так что isDoneView здесь всегда подразумевает scope !== "all".
    const isDoneAvailable = topTab !== "all";
    const isDoneView = isDoneAvailable && doneToggle === "done";

    const { tasks: activeTasks, isLoading: isActiveLoading } = useVndTasks(scope, !isDoneView);
    const { data: donePageData, isLoading: isDoneLoading } = useVndTasksDone(
        isDoneView ? (scope as TaskScope) : null,
        donePage,
        DONE_PAGE_SIZE
    );
    const { counts } = useVndTaskCounts();

    const rawTasks = isDoneView ? donePageData?.items ?? [] : activeTasks;
    const isLoading = isDoneView ? isDoneLoading : isActiveLoading;

    // Фильтр по этапу согласования не имеет смысла на "Отклонено" и на "Все" — там stagePhase
    // либо всегда пуст (процесс уже завершён), либо перемешан с задачами без этого поля вовсе.
    const phaseFilteredTasks = useMemo(() => {
        if (topTab !== "coordination" || coordinationSubTab === "rejected" || !stagePhaseFilter) return rawTasks;
        return rawTasks.filter((task) => task.stagePhase === stagePhaseFilter);
    }, [rawTasks, topTab, coordinationSubTab, stagePhaseFilter]);

    // Поиск — поверх фильтра по этапу, действует на любой вкладке (включая "Все" и
    // "Выполненные") и не сбрасывается при переключении: если в одном разделе ничего не
    // нашлось, разумно проверить тот же запрос в соседнем, не перепечатывая его заново.
    // На "Выполненные" ищет только по загруженной странице — см. плейсхолдер про постранично.
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return phaseFilteredTasks;
        return phaseFilteredTasks.filter((task) => matchesTaskSearch(task, searchQuery));
    }, [phaseFilteredTasks, searchQuery]);

    const topTabsWithCounts = TOP_TABS.map((tab) => ({
        ...tab,
        n: tab.id === "all"
            ? counts.coordination + counts.myVndApproval + counts.rejected + counts.actualization + counts.consolidation
            : tab.id === "coordination"
                ? counts.coordination + counts.myVndApproval + counts.rejected
                : counts[tab.id],
    }));

    const subTabsWithCounts = COORDINATION_SUB_TABS.map((tab) => ({
        ...tab,
        n: counts[tab.id],
    }));

    // Название текущего раздела — общее и для плейсхолдера поиска, и для строки счётчика
    // ниже. На "Все" у самого TOP_TABS есть своя запись ("Все"), но там она не годится
    // ни там, ни там — у обоих мест свой особый случай для этой вкладки, см. ниже.
    const sectionLabel = useMemo(() => {
        return topTab === "coordination"
            ? COORDINATION_SUB_TABS.find((tab) => tab.id === coordinationSubTab)?.label ?? ""
            : TOP_TABS.find((tab) => tab.id === topTab)?.label ?? "";
    }, [topTab, coordinationSubTab]);

    // Плейсхолдер строки поиска отражает раздел (и активные/выполненные), в котором сейчас
    // ищем — чтобы не выглядело, будто поиск идёт по всей странице задач или по всей истории
    // сразу, когда на "Выполненные" он на самом деле видит только текущую страницу списка.
    const searchPlaceholder = useMemo(() => {
        if (topTab === "all") return "Поиск по всем задачам...";

        return isDoneView
            ? `Поиск на этой странице «${sectionLabel}» (выполненные)...`
            : `Поиск в разделе «${sectionLabel}»...`;
    }, [topTab, sectionLabel, isDoneView]);

    // Строка-счётчик над списком: без запроса — просто сколько задач в разделе; с запросом —
    // сколько из них нашлось, с названием раздела (на "Выполненные" — с пометкой в скобках,
    // как в плейсхолдере поиска, там ведь тоже считает только по загруженной странице истории).
    const tasksCountText = useMemo(() => {
        const total = phaseFilteredTasks.length;
        if (!searchQuery.trim()) return `Всего задач: ${total}`;

        const label = topTab === "all" ? "всего" : sectionLabel;
        const suffix = isDoneView ? " (выполненные)" : "";
        return `Найдено задач: ${filteredTasks.length} из ${total} ${label}${suffix}`;
    }, [phaseFilteredTasks, filteredTasks, searchQuery, topTab, sectionLabel, isDoneView]);

    // Если поиск сузил непустой список до нуля карточек — это "ничего не нашлось", а не
    // "в разделе пусто" (у этих двух причин разные тексты-заглушки).
    const emptyText = searchQuery.trim() && rawTasks.length > 0
        ? "Ничего не найдено"
        : isDoneView
            ? "Пока нет выполненных задач"
            : emptyTextByScope[scope];

    // Смена раздела возвращает на "Активные" и сбрасывает фильтр этапа — унесённые на другой
    // раздел, они выглядели бы как пустой список без причины. Поиск намеренно не сбрасывается
    // — см. комментарий у filteredTasks.
    const handleTopTabChange = (nextTab: TopTab) => {
        setTopTab(nextTab);
        setStagePhaseFilter("");
        setDoneToggle("active");
        setDonePage(1);
    };

    const handleSubTabChange = (nextSubTab: CoordinationSubTab) => {
        setCoordinationSubTab(nextSubTab);
        setStagePhaseFilter("");
        setDoneToggle("active");
        setDonePage(1);
    };

    const handleDoneToggleChange = (next: DoneToggle) => {
        setDoneToggle(next);
        setDonePage(1);
    };

    // Страница текущего раздела короче, чем страница истории другого — не должно остаться
    // "битой" страницы (напр. открыли 3-ю страницу "Согласования", переключились на этап,
    // где всего одна страница).
    useEffect(() => {
        setDonePage(1);
    }, [scope]);

    // @ts-ignore
    return (
        <>
            <Tabs<TopTab>
                tabs={topTabsWithCounts}
                value={topTab}
                onChange={handleTopTabChange}
                className="mb-0"
            />

            {topTab === "coordination" && (
                <Tabs<CoordinationSubTab>
                    tabs={subTabsWithCounts}
                    value={coordinationSubTab}
                    onChange={handleSubTabChange}
                    className="mb-0"
                />
            )}

            <div className="mb-1 flex flex-col gap-2">
                <SearchBar
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={setSearchQuery}
                />

                {(isDoneAvailable || !isLoading) && (
                    <div className="mb-2 mt-2 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-start gap-4">
                            {isDoneAvailable && (
                                <SelectDropdown
                                    options={DONE_FILTER_OPTIONS}
                                    value={doneToggle}
                                    onChange={(value) => handleDoneToggleChange(value as DoneToggle)}
                                    label="По выполненности"
                                    labelPosition="inline"
                                    placeholder="Активные"
                                    minWidth="200px"
                                />
                            )}

                            {topTab === "coordination" && coordinationSubTab !== "rejected" && (
                                <SelectDropdown
                                    options={STAGE_PHASE_FILTER_OPTIONS}
                                    value={stagePhaseFilter}
                                    onChange={(value) => setStagePhaseFilter(value as "" | TaskStagePhase)}
                                    label="Этап согласования"
                                    labelPosition="inline"
                                    placeholder="Все этапы"
                                    minWidth="260px"
                                />
                            )}
                        </div>

                        {!isLoading && (
                            <div className="whitespace-nowrap text-[12.5px] font-medium text-[#8b97ab]">
                                {tasksCountText}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <VndTaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                emptyText={emptyText}
                searchQuery={searchQuery}
            />

            {isDoneView && donePageData && donePageData.totalCount > DONE_PAGE_SIZE && (
                <DonePagination
                    page={donePageData.page}
                    pageSize={donePageData.pageSize}
                    totalCount={donePageData.totalCount}
                    onChange={setDonePage}
                />
            )}
        </>
    );
}

function DonePagination({
                             page,
                             pageSize,
                             totalCount,
                             onChange,
                         }: {
    page: number;
    pageSize: number;
    totalCount: number;
    onChange: (page: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <div className="mt-4 flex items-center justify-center gap-3 text-[13px]">
            <button
                type="button"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
                className="cursor-pointer rounded-[8px] border border-[#e5e9f0] px-3 py-1.5 font-medium
                           text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Назад
            </button>
            <span className="text-[#8b97ab]">Страница {page} из {totalPages}</span>
            <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                className="cursor-pointer rounded-[8px] border border-[#e5e9f0] px-3 py-1.5 font-medium
                           text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Вперёд
            </button>
        </div>
    );
}
