import {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CheckCircle2} from "lucide-react";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {useVndTasksDone} from "@/hooks/tasksVndHooks/useVndTasksDone.ts";
import {useVndTaskCounts} from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {VndTaskList} from "@/components/componentsTasks/VndTaskList.tsx";
import {emptyTextByScope, emptyDescriptionByScope, emptyIconByScope, type TasksScope} from "@/constants/tasksConst.ts";
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

// Вложенные вкладки внутри «Актуализации»: документы, ожидающие актуализации от ответственного
// (actualization), заявки на доступ к актуализации, ждущие решения главного редактора
// (actualizationRequest), и уже одобренные заявки, по которым заявитель ещё не начал цикл
// (actualizationApproved) — раньше по обеим последним уходило только уведомление, самой задачи
// в "Мои задачи" не было (см. TasksService.GetActualizationRequestTasksAsync/
// GetActualizationApprovedTasksAsync).
type ActualizationSubTab = "actualization" | "actualizationRequest" | "actualizationApproved";

// Активные (обычный список — то, что ждёт действия) / Выполненные (история, с пагинацией).
type DoneToggle = "active" | "done";

const DONE_PAGE_SIZE = 20;

const TOP_TAB_IDS: TopTab[] = ["all", "coordination", "actualization", "consolidation"];
const COORDINATION_SUB_TAB_IDS: CoordinationSubTab[] = ["coordination", "myVndApproval", "rejected"];
const ACTUALIZATION_SUB_TAB_IDS: ActualizationSubTab[] = ["actualization", "actualizationRequest", "actualizationApproved"];
const DONE_TOGGLE_IDS: DoneToggle[] = ["active", "done"];
const STAGE_PHASE_FILTER_IDS: ("" | TaskStagePhase)[] = ["", "primary", "repeat", "final"];

// Ключи i18n для вкладок/фильтров ниже. Там, где текст дословно совпадает с бейджем
// карточки (см. TASK_SCOPE_META/COORDINATION_STAGE_META в vndStatus.ts), берём тот же ключ
// i18n, что и бейдж, — чтобы однажды поправленный перевод не разошёлся по двум местам.
// Там, где название вкладки и текст бейджа отличаются по смыслу (например, вкладка
// "Заявки на доступ" ведёт к бейджу "Заявка на актуализацию" — разные формулировки для
// разных целей), у вкладки свой отдельный ключ.
const TOP_TAB_LABEL_KEYS: Record<TopTab, string> = {
    all: "tasks.vnd.topTabs.all",
    coordination: "tasks.vnd.topTabs.coordination",
    actualization: "tasks.vnd.topTabs.actualization",
    consolidation: "tasks.vnd.topTabs.consolidation",
};

const COORDINATION_SUB_TAB_LABEL_KEYS: Record<CoordinationSubTab, string> = {
    coordination: "tasks.vnd.scopes.coordination",
    myVndApproval: "tasks.vnd.scopes.myVndApproval",
    rejected: "tasks.vnd.scopes.rejected",
};

const ACTUALIZATION_SUB_TAB_LABEL_KEYS: Record<ActualizationSubTab, string> = {
    actualization: "tasks.vnd.scopes.actualization",
    actualizationRequest: "tasks.vnd.subTabs.actualizationRequest",
    actualizationApproved: "tasks.vnd.subTabs.actualizationApproved",
};

const STAGE_PHASE_FILTER_LABEL_KEYS: Record<"" | TaskStagePhase, string> = {
    "": "tasks.vnd.stagePhase.allPhases",
    primary: "tasks.vnd.stagePhase.primary",
    repeat: "tasks.vnd.stagePhase.repeat",
    final: "tasks.vnd.stagePhase.final",
};

export function VndTasksPanel() {
    const {t} = useTranslation();

    // Сюда попадают и по прямой ссылке с заранее выбранной вкладкой/подвкладкой —
    // например, карточки с рабочего стола ведут сюда с ?tab=coordination&sub=coordination
    // (см. HomeKpiGrid.tsx / HomeContoursCard.tsx). Читаем один раз при монтировании,
    // по тому же принципу, что и AnalyticsPage.tsx: обратная синхронизация в URL при
    // переключении вкладок мышью не нужна.
    const [searchParams] = useSearchParams();

    const [topTab, setTopTab] = useState<TopTab>(() => {
        const fromUrl = searchParams.get("tab");
        return TOP_TAB_IDS.includes(fromUrl as TopTab) ? (fromUrl as TopTab) : "coordination";
    });
    const [coordinationSubTab, setCoordinationSubTab] = useState<CoordinationSubTab>(() => {
        const fromUrl = searchParams.get("sub");
        return COORDINATION_SUB_TAB_IDS.includes(fromUrl as CoordinationSubTab) ? (fromUrl as CoordinationSubTab) : "coordination";
    });
    const [actualizationSubTab, setActualizationSubTab] = useState<ActualizationSubTab>(() => {
        const fromUrl = searchParams.get("sub");
        return ACTUALIZATION_SUB_TAB_IDS.includes(fromUrl as ActualizationSubTab) ? (fromUrl as ActualizationSubTab) : "actualization";
    });
    const [doneToggle, setDoneToggle] = useState<DoneToggle>("active");
    const [donePage, setDonePage] = useState(1);
    const [stagePhaseFilter, setStagePhaseFilter] = useState<"" | TaskStagePhase>("");
    const [searchQuery, setSearchQuery] = useState("");

    const scope: TasksScope = topTab === "all"
        ? "all"
        : topTab === "coordination"
            ? coordinationSubTab
            : topTab === "actualization"
                ? actualizationSubTab
                : topTab;

    // "Выполненные" не существует для вкладки "Все" — там переключатель вообще не показывается
    // (см. handleTopTabChange), так что isDoneView здесь всегда подразумевает scope !== "all".
    const isDoneAvailable = topTab !== "all";
    const isDoneView = isDoneAvailable && doneToggle === "done";

    const { tasks: activeTasks, isLoading: isActiveLoading, error: activeError } = useVndTasks(scope, !isDoneView);
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

    const topTabsWithCounts = TOP_TAB_IDS.map((id) => ({
        id,
        label: t(TOP_TAB_LABEL_KEYS[id]),
        n: id === "all"
            ? counts.coordination + counts.myVndApproval + counts.rejected + counts.actualization + counts.consolidation
                + counts.actualizationRequests + counts.actualizationApproved
            : id === "coordination"
                ? counts.coordination + counts.myVndApproval + counts.rejected
                : id === "actualization"
                    ? counts.actualization + counts.actualizationRequests + counts.actualizationApproved
                    : counts[id],
    }));

    const subTabsWithCounts = COORDINATION_SUB_TAB_IDS.map((id) => ({
        id,
        label: t(COORDINATION_SUB_TAB_LABEL_KEYS[id]),
        n: counts[id],
    }));

    const actualizationSubTabsWithCounts = ACTUALIZATION_SUB_TAB_IDS.map((id) => ({
        id,
        label: t(ACTUALIZATION_SUB_TAB_LABEL_KEYS[id]),
        n: id === "actualizationRequest"
            ? counts.actualizationRequests
            : id === "actualizationApproved"
                ? counts.actualizationApproved
                : counts.actualization,
    }));

    const doneFilterOptions = DONE_TOGGLE_IDS.map((value) => ({
        value,
        label: t(`tasks.vnd.doneFilter.${value}`),
    }));

    const stagePhaseFilterOptions = STAGE_PHASE_FILTER_IDS.map((value) => ({
        value,
        label: t(STAGE_PHASE_FILTER_LABEL_KEYS[value]),
    }));

    // Название текущего раздела — общее и для плейсхолдера поиска, и для строки счётчика
    // ниже. На "Все" у самого TOP_TAB_LABEL_KEYS есть своя запись ("Все"), но там она не годится
    // ни там, ни там — у обоих мест свой особый случай для этой вкладки, см. ниже.
    const sectionLabel = useMemo(() => {
        if (topTab === "coordination") {
            return t(COORDINATION_SUB_TAB_LABEL_KEYS[coordinationSubTab]);
        }
        if (topTab === "actualization") {
            return t(ACTUALIZATION_SUB_TAB_LABEL_KEYS[actualizationSubTab]);
        }
        return t(TOP_TAB_LABEL_KEYS[topTab]);
    }, [t, topTab, coordinationSubTab, actualizationSubTab]);

    // Плейсхолдер строки поиска отражает раздел (и активные/выполненные), в котором сейчас
    // ищем — чтобы не выглядело, будто поиск идёт по всей странице задач или по всей истории
    // сразу, когда на "Выполненные" он на самом деле видит только текущую страницу списка.
    const searchPlaceholder = useMemo(() => {
        if (topTab === "all") return t("tasks.vnd.searchAll");

        return isDoneView
            ? t("tasks.vnd.searchDoneSection", {section: sectionLabel})
            : t("tasks.vnd.searchSection", {section: sectionLabel});
    }, [t, topTab, sectionLabel, isDoneView]);

    // Строка-счётчик над списком: без запроса — просто сколько задач в разделе; с запросом —
    // сколько из них нашлось, с названием раздела (на "Выполненные" — с пометкой в скобках,
    // как в плейсхолдере поиска, там ведь тоже считает только по загруженной странице истории).
    const tasksCountText = useMemo(() => {
        const total = phaseFilteredTasks.length;
        if (!searchQuery.trim()) return t("tasks.vnd.totalCount", {count: total});

        const label = topTab === "all" ? t("tasks.vnd.allLabel") : sectionLabel;
        const suffix = isDoneView ? t("tasks.vnd.doneSuffix") : "";
        return t("tasks.vnd.foundCount", {found: filteredTasks.length, total, label, suffix});
    }, [t, phaseFilteredTasks, filteredTasks, searchQuery, topTab, sectionLabel, isDoneView]);

    // Раньше ошибка загрузки (activeError) нигде не читалась — список молча выглядел просто
    // пустым ("задач нет"), неотличимо от честного "пусто", хотя на деле запрос упал. Показываем
    // отдельным баннером над списком, не подменяя пустое состояние.
    const activeErrorMessage = !isDoneView && activeError
        ? activeError instanceof Error ? activeError.message : t("tasks.vnd.loadError")
        : null;

    // Если поиск сузил непустой список до нуля карточек — это "ничего не нашлось", а не
    // "в разделе пусто" (у этих двух причин разные тексты-заглушки и значки — см. ниже).
    const isSearchEmpty = searchQuery.trim().length > 0 && rawTasks.length > 0;

    const emptyText = isSearchEmpty
        ? t("tasks.common.searchEmptyTitle")
        : isDoneView
            ? t("tasks.vnd.doneEmptyTitle")
            : t(emptyTextByScope[scope]);

    // Пояснение и значок под заголовком — свои для "ничего не нашлось" (лупа с крестиком,
    // значение по умолчанию у EmptyState) и "выполненные пусты", а для обычного пустого
    // раздела — по разделу (согласование/актуализация/консолидация и т.п.).
    const emptyDescription = isSearchEmpty
        ? t("tasks.common.searchEmptyDescription")
        : isDoneView
            ? t("tasks.vnd.doneEmptyDescription")
            : t(emptyDescriptionByScope[scope]);

    const emptyIcon = isSearchEmpty
        ? undefined
        : isDoneView
            ? CheckCircle2
            : emptyIconByScope[scope];

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

    const handleActualizationSubTabChange = (nextSubTab: ActualizationSubTab) => {
        setActualizationSubTab(nextSubTab);
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

            {topTab === "actualization" && (
                <Tabs<ActualizationSubTab>
                    tabs={actualizationSubTabsWithCounts}
                    value={actualizationSubTab}
                    onChange={handleActualizationSubTabChange}
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
                                    options={doneFilterOptions}
                                    value={doneToggle}
                                    onChange={(value) => handleDoneToggleChange(value as DoneToggle)}
                                    label={t("tasks.vnd.doneFilterLabel")}
                                    labelPosition="inline"
                                    placeholder={t("tasks.vnd.doneFilter.active")}
                                    minWidth="200px"
                                />
                            )}

                            {topTab === "coordination" && coordinationSubTab !== "rejected" && (
                                <SelectDropdown
                                    options={stagePhaseFilterOptions}
                                    value={stagePhaseFilter}
                                    onChange={(value) => setStagePhaseFilter(value as "" | TaskStagePhase)}
                                    label={t("tasks.vnd.stagePhaseFilterLabel")}
                                    labelPosition="inline"
                                    placeholder={t("tasks.vnd.stagePhase.allPhases")}
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

            {activeErrorMessage && (
                <div className="mb-3 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                    {activeErrorMessage}
                </div>
            )}

            <VndTaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                emptyText={emptyText}
                emptyDescription={emptyDescription}
                emptyIcon={emptyIcon}
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
    const {t} = useTranslation();
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
                {t("tasks.vnd.pagination.back")}
            </button>
            <span className="text-[#8b97ab]">{t("tasks.vnd.pagination.page", {page, totalPages})}</span>
            <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                className="cursor-pointer rounded-[8px] border border-[#e5e9f0] px-3 py-1.5 font-medium
                           text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
            >
                {t("tasks.vnd.pagination.forward")}
            </button>
        </div>
    );
}
