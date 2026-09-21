/**
 * "Мои задачи" - сводный реестр задач по всем контурам: согласования записок, закупок
 * и прочих документов в одном списке, включая полученные по замещению.
 * Просроченные идут первыми: реестр должен начинаться с того, что горит
 */

import {useCallback, useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
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
    type InboxFilterId,
} from "@/constants/taskInboxConst.ts";

import {VndTasksPanel} from "@/components/componentsTasks/VndTasksPanel.tsx";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import {TaskInboxFilterTabs} from "@/components/componentsTasks/TaskInboxFilterTabs.tsx";
import {InboxTaskRow} from "@/components/componentsTasks/InboxTaskRow.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {DelegateTaskModal} from "@/components/componentsTasks/DelegateTaskModal.tsx";

// Получение текста, иконки при отсутствии задач на соответствующих табах
function getInboxEmptyMeta(filter: InboxFilterId) {
    return INBOX_EMPTY_META[filter as Exclude<InboxFilterId, "vnd">] ?? INBOX_EMPTY_META.all;
}

const StatsLinkIcon = INBOX_STATS_LINK_ICON; // Иконка при сообщении при пустом списке

export const TaskInboxPage = () => {
    const {t} = useTranslation();

    const [filter, setFilter] = useState<InboxFilterId>("all");
    const [inbox, setInbox] = useState<TaskInbox | null>(null);
    const [loading, setLoading] = useState(true);
    // Поиск намеренно не сбрасывается при смене вкладки - так же, как на ВНД-вкладке:
    // если в одном разделе ничего не нашлось, разумно проверить тот же
    // запрос в соседнем, не перепечатывая его заново.
    const [searchQuery, setSearchQuery] = useState("");
    const [delegateTask, setDelegateTask] = useState<InboxTask | null>(null);

    const isVndTab = filter === "vnd";
    const isAllTab = filter === "all";

    const load = useCallback(async () => {
        if (filter === "vnd") return;

        setLoading(true);
        try {
            setInbox(await taskInboxService.get(INBOX_FILTER_DOCUMENT_TYPE[filter]));
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const {tasks: vndAllTasks, isLoading: vndAllLoading} = useVndTasks("all", isAllTab);

    const filteredTasks = useMemo(() => {
        const tasks = inbox?.tasks ?? [];
        if (!searchQuery.trim()) return tasks;
        return tasks.filter((task) => matchesInboxTaskSearch(task, searchQuery));
    }, [inbox, searchQuery]);

    const filteredVndTasks = useMemo(() => {
        if (!isAllTab) return [];
        if (!searchQuery.trim()) return vndAllTasks;
        return vndAllTasks.filter((task) => matchesTaskSearch(task, searchQuery));
    }, [isAllTab, vndAllTasks, searchQuery]);

    const rawTotalCount = (inbox?.tasks.length ?? 0) + (isAllTab ? vndAllTasks.length : 0);
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
                            </>
                        ) : (
                            /* Согласования по всем контурам */
                            t("tasks.inbox.allContoursDescription")
                        )}
                    </div>
                </div>

                <Link
                    to="/tasks/stats"
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border-none bg-[#4e57d6] px-[15px] text-[13px] font-semibold !text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06]"
                >
                    <StatsLinkIcon className="h-[18px] w-[18px]" strokeWidth={2}/>
                    {/* Статистика по моим задачам */}
                    {t("tasks.common.statsTitle")}
                </Link>
            </div>

            {/* Ряд вкладок-карточек над реестром задач: "Все контуры" + один пункт на контур. */}
            <TaskInboxFilterTabs value={filter} onChange={setFilter}/>

            {/* Вкладки таба ВНД */}
            {isVndTab && <VndTasksPanel/>}

            {!isVndTab && (
                <>
                    <SearchBar
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />

                    {isAllTab && filteredVndTasks.length > 0 && (
                        <section className="flex flex-col gap-2.5">
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
                        <section className="overflow-hidden rounded-[13px] border border-[#e5e9f0] bg-white">
                            {filteredTasks.map((task: InboxTask) => (
                                <InboxTaskRow
                                    key={taskKey(task)}
                                    task={task}
                                    onDelegate={setDelegateTask}
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
        </div>
    );
};
