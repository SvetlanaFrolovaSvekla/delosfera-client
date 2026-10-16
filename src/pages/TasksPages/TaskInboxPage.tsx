/**
 * "Мои задачи" - сводный реестр задач по всем контурам: согласования записок, закупок
 * и прочих документов в одном списке, включая полученные по замещению.
 * Просроченные идут первыми: реестр должен начинаться с того, что горит
 */

import {useCallback, useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {notificationsRefreshBus} from "@/service/notificationsRefreshBus.ts";
import {
    taskInboxService,
    taskKey,
    type InboxTask,
    type TaskInbox,
} from "@/service/workflowService/taskInboxService.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {matchesInboxTaskSearch, matchesTaskSearch} from "@/utils/tasksUtils.ts";
import {
    INBOX_EMPTY_META,
    INBOX_FILTER_DOCUMENT_TYPE,
    INBOX_FILTER_LABEL_KEYS,
    INBOX_STATS_LINK_ICON,
    SZ_INBOX_SUB_TAB_IDS,
    SZ_INBOX_SUB_TAB_LABEL_KEYS,
    SZ_APPROVAL_WHO_IDS,
    SZ_APPROVAL_WHO_LABEL_KEYS,
    type InboxFilterId,
    type SzApprovalWho,
    type SzInboxSubTab,
} from "@/constants/taskInboxConst.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {VndTasksPanel} from "@/components/componentsTasks/VndTasksPanel.tsx";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import {TaskInboxFilterTabs} from "@/components/componentsTasks/TaskInboxFilterTabs.tsx";
import {InboxTaskRow} from "@/components/componentsTasks/InboxTaskRow.tsx";
import {DelegateTaskModal} from "@/components/componentsTasks/DelegateTaskModal.tsx";
import {RaiseRiskEventModal} from "@/components/componentsTasks/RaiseRiskEventModal.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {ArrowRight} from "lucide-react";

// Получение текста, иконки при отсутствии задач на соответствующих табах
function getInboxEmptyMeta(filter: InboxFilterId) {
    return INBOX_EMPTY_META[filter as Exclude<InboxFilterId, "vnd">] ?? INBOX_EMPTY_META.all;
}

const StatsLinkIcon = INBOX_STATS_LINK_ICON; // Иконка при сообщении при пустом списке

type DoneToggle = "active" | "done";
const DONE_TOGGLE_IDS: DoneToggle[] = ["active", "done"];

export const TaskInboxPage = () => {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canRaiseRisk = hasPermission(PermissionCode.ManageRiskEvents);

    const [filter, setFilter] = useState<InboxFilterId>("all");
    // Подвкладка раздела «Служебные записки» — этап записки (регистрация, согласование...).
    const [szSubTab, setSzSubTab] = useState<SzInboxSubTab>("all");
    // Внутри «Согласования»: свои записки на согласовании / записки, которые согласую я.
    const [approvalWho, setApprovalWho] = useState<SzApprovalWho>("mine");
    // Фильтр по выполненности (как в ВНД): активные задачи или история выполненных. Только в разделе СЗ.
    const [doneToggle, setDoneToggle] = useState<DoneToggle>("active");
    const [inbox, setInbox] = useState<TaskInbox | null>(null);
    const [loading, setLoading] = useState(true);
    // Поиск намеренно не сбрасывается при смене вкладки - так же, как на ВНД-вкладке:
    // если в одном разделе ничего не нашлось, разумно проверить тот же
    // запрос в соседнем, не перепечатывая его заново.
    const [searchQuery, setSearchQuery] = useState("");
    const [delegateTask, setDelegateTask] = useState<InboxTask | null>(null);
    const [riskTask, setRiskTask] = useState<InboxTask | null>(null);

    const isVndTab = filter === "vnd";
    const isAllTab = filter === "all";
    const isSzTab = filter === "sz";
    const isDoneView = isSzTab && doneToggle === "done";

    const load = useCallback(async () => {
        if (filter === "vnd") return;

        setLoading(true);
        try {
            if (isDoneView) {
                setInbox(await taskInboxService.getDone());
                return;
            }
            // includeOwn — инициатор видит и свои записки, которые ждут других
            // (регистрации, согласования, подписи...), а не только задачи на себе.
            setInbox(await taskInboxService.get(INBOX_FILTER_DOCUMENT_TYPE[filter], {includeOwn: true}));
        } finally {
            setLoading(false);
        }
    }, [filter, isDoneView]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // Пришло уведомление (записку зарегистрировали, согласовали, вернули...) — обновляем
    // список, как это делает виджет на главной (useTaskInbox): иначе страница показывала
    // задачу, которой уже нет, до ручной перезагрузки.
    useEffect(() => notificationsRefreshBus.subscribe(() => void load()), [load]);

    const {tasks: vndAllTasks, isLoading: vndAllLoading} = useVndTasks("all", isAllTab);

    // Задачи текущей подвкладки СЗ — до поиска: по ним же считаются счётчики вкладок.
    const stageTasks = useMemo(() => {
        const tasks = inbox?.tasks ?? [];
        if (!isSzTab || szSubTab === "all") return tasks;
        const byStage = tasks.filter((task) => task.stage === szSubTab);
        if (szSubTab !== "Approval" || isDoneView) return byStage;
        // Свои записки (isOwn) — «Мои СЗ на согласовании», остальное — задачи согласующего.
        return byStage.filter((task) => (approvalWho === "mine") === task.isOwn);
    }, [inbox, isSzTab, szSubTab, approvalWho, isDoneView]);

    // Подвкладки «Согласования» со счётчиками.
    const approvalWhoTabs = useMemo(() => {
        const approvalTasks = (inbox?.tasks ?? []).filter((task) => task.stage === "Approval");
        return SZ_APPROVAL_WHO_IDS.map((id) => ({
            id,
            label: t(SZ_APPROVAL_WHO_LABEL_KEYS[id]),
            n: approvalTasks.filter((task) => (id === "mine") === task.isOwn).length,
        }));
    }, [inbox, t]);

    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return stageTasks;
        return stageTasks.filter((task) => matchesInboxTaskSearch(task, searchQuery));
    }, [stageTasks, searchQuery]);

    // Подвкладки СЗ со счётчиками. Пустые этапы скрываем, чтобы ряд не разрастался
    // до восьми вкладок с нулями, — кроме «Все» и выбранной сейчас.
    const szSubTabs = useMemo(() => {
        const tasks = isSzTab ? inbox?.tasks ?? [] : [];
        return SZ_INBOX_SUB_TAB_IDS
            .map((id) => ({
                id,
                label: t(SZ_INBOX_SUB_TAB_LABEL_KEYS[id]),
                n: id === "all" ? tasks.length : tasks.filter((task) => task.stage === id).length,
            }))
            .filter((tab) => tab.id === "all" || tab.id === szSubTab || tab.n > 0);
    }, [inbox, isSzTab, szSubTab, t]);

    const filteredVndTasks = useMemo(() => {
        if (!isAllTab) return [];
        if (!searchQuery.trim()) return vndAllTasks;
        return vndAllTasks.filter((task) => matchesTaskSearch(task, searchQuery));
    }, [isAllTab, vndAllTasks, searchQuery]);

    const rawTotalCount = stageTasks.length + (isAllTab ? vndAllTasks.length : 0);
    const isSearchEmpty = searchQuery.trim().length > 0 && rawTotalCount > 0
        && filteredTasks.length === 0 && filteredVndTasks.length === 0;

    const currentFilterLabel = t(INBOX_FILTER_LABEL_KEYS[filter]);
    const searchPlaceholder = filter === "all"
        ? t("tasks.inbox.searchPlaceholderAll")
        : t("tasks.inbox.searchPlaceholderSection", {section: currentFilterLabel});

    return (
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
            <div className="flex flex-wrap items-end justify-between gap-5">
                <div>

                    {/* Мои задачи */}
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("tasks.inbox.title")}</h1>

                    {/* Описание если ВНД, кол-во если другие вкладки */}
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        {isVndTab ? (
                            t("tasks.inbox.vndDescription")
                        ) : inbox ? (
                            <>
                                {t("tasks.inbox.totalLabel")} <b className="text-[#4e57d6]">
                                {inbox.total + (isAllTab ? vndAllTasks.length : 0)}
                            </b>
                                {/* Просрочено, по замещению */}
                                {inbox.overdue > 0 && ` · ${t("tasks.inbox.overdueSuffix", {count: inbox.overdue})}`}
                                {inbox.delegated > 0 && ` · ${t("tasks.inbox.delegatedSuffix", {count: inbox.delegated})}`}
                                {/* Свои записки на отслеживании — в «Всего» не входят */}
                                {inbox.own > 0 && ` · ${t("tasks.inbox.ownSuffix", {count: inbox.own})}`}
                            </>
                        ) : (
                            /* Согласования по всем контурам */
                            t("tasks.inbox.allContoursDescription")
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <Link
                        to="/tasks/stats"
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border-none bg-[#4e57d6] px-[15px] text-[13px] font-semibold !text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06]"
                    >
                        <StatsLinkIcon className="h-[18px] w-[18px]" strokeWidth={2}/>
                        {/* Статистика по моим задачам */}
                        {t("tasks.common.statsTitle")}
                    </Link>
                    <Link
                        to="/digest"
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border-none bg-[#4e57d6] px-[15px] text-[13px] font-semibold !text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06]"
                    >
                        {/* Дайджест */}
                        {t("tasks.common.digestTitle")}
                        <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2}/>
                    </Link>
                </div>
            </div>

            {/* Ряд вкладок-карточек над реестром задач: "Все контуры" + один пункт на контур. */}
            <TaskInboxFilterTabs
                value={filter}
                onChange={(next) => {
                    setFilter(next);
                    setDoneToggle("active");
                }}
            />

            {/* Подвкладки «Служебных записок» по этапу: Все, Регистрация, Согласование... */}
            {isSzTab && inbox && (
                <Tabs<SzInboxSubTab>
                    tabs={szSubTabs}
                    value={szSubTab}
                    onChange={setSzSubTab}
                    className="mb-0 flex-wrap"
                />
            )}

            {/* «Согласование»: «Мои СЗ на согласовании» и «СЗ, согласую я». */}
            {isSzTab && inbox && szSubTab === "Approval" && !isDoneView && (
                <Tabs<SzApprovalWho>
                    tabs={approvalWhoTabs}
                    value={approvalWho}
                    onChange={setApprovalWho}
                    className="mb-0 flex-wrap"
                />
            )}

            {/* Вкладки таба ВНД */}
            {isVndTab && <VndTasksPanel/>}

            {!isVndTab && (
                <>
                    <SearchBar
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />

                    {isSzTab && (
                        <div className="flex flex-wrap items-start gap-4">
                            <SelectDropdown
                                options={DONE_TOGGLE_IDS.map((value) => ({
                                    value,
                                    label: t(`tasks.vnd.doneFilter.${value}`),
                                }))}
                                value={doneToggle}
                                onChange={(value) => setDoneToggle(value as DoneToggle)}
                                label={t("tasks.vnd.doneFilterLabel")}
                                labelPosition="inline"
                                placeholder={t("tasks.vnd.doneFilter.active")}
                                minWidth="200px"
                            />
                        </div>
                    )}

                    {isAllTab && filteredVndTasks.length > 0 && (
                        <section className="grid grid-cols-1 gap-3">
                            {filteredVndTasks.map((task) => (
                                <VndTaskCard
                                    key={`vnd-${task.vndId}-${task.scope}-${task.stageId ?? task.redactionId ?? "x"}`}
                                    task={task}
                                    searchQuery={searchQuery}
                                />
                            ))}
                        </section>
                    )}


                    {(filteredTasks.length > 0 || loading || !(isAllTab && filteredVndTasks.length > 0)) && (
                        // Карточки — отдельными блоками с отступом (как у задач ВНД); рамка-контейнер
                        // нужна только заглушке пустого списка.
                        <section className={
                            filteredTasks.length > 0
                                ? "grid grid-cols-1 gap-3"
                                : "overflow-hidden rounded-[13px] border border-[#e5e9f0] bg-white"
                        }>
                            {filteredTasks.map((task: InboxTask) => (
                                <InboxTaskRow
                                    key={taskKey(task)}
                                    task={task}
                                    onDelegate={setDelegateTask}
                                    onRaiseRisk={canRaiseRisk ? setRiskTask : undefined}
                                    searchQuery={searchQuery}
                                    readOnly={isDoneView}
                                />
                            ))}

                            {!loading && !(isAllTab && vndAllLoading) && filteredTasks.length === 0
                                && !(isAllTab && filteredVndTasks.length > 0) && (
                                    isSearchEmpty ? (
                                        <EmptyState
                                            embedded
                                            title={t("tasks.common.searchEmptyTitle")}
                                            description={t("tasks.common.searchEmptyDescription")}
                                        />
                                    ) : isDoneView ? (
                                        <EmptyState
                                            embedded
                                            icon={getInboxEmptyMeta(filter).icon}
                                            title={t("tasks.vnd.doneEmptyTitle")}
                                            description={t("tasks.vnd.doneEmptyDescription")}
                                        />
                                    ) : (
                                        <EmptyState
                                            embedded
                                            icon={getInboxEmptyMeta(filter).icon}
                                            title={t(getInboxEmptyMeta(filter).titleKey)}
                                            description={t(getInboxEmptyMeta(filter).descriptionKey)}
                                        />
                                    )
                                )}
                            {(loading || (isAllTab && vndAllLoading && filteredTasks.length === 0 && filteredVndTasks.length === 0)) && (
                                <div className="p-7 text-center text-[13px] text-[#8b97ab]">{t("general.loading")}</div>
                            )}
                        </section>
                    )}
                </>
            )}

            {delegateTask && (
                <DelegateTaskModal
                    task={delegateTask}
                    onClose={() => setDelegateTask(null)}
                    onDone={() => {
                        setDelegateTask(null);
                        void load();
                    }}
                />
            )}

            {riskTask && (
                <RaiseRiskEventModal
                    task={riskTask}
                    onClose={() => setRiskTask(null)}
                    onDone={() => setRiskTask(null)}
                />
            )}
        </div>
    );
};
