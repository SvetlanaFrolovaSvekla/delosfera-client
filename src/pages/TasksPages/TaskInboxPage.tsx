import {useCallback, useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ChartColumn, FileText, Layers, ShoppingCart, StickyNote, Share2, type LucideIcon} from "lucide-react";
import {VndTasksPanel} from "@/components/componentsTasks/VndTasksPanel.tsx";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {matchesInboxTaskSearch, matchesTaskSearch} from "@/utils/tasksUtils.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {DelegateTaskModal} from "@/components/componentsTasks/DelegateTaskModal.tsx";
import {
    taskInboxService,
    taskLink,
    taskKey,
    type InboxTask,
    type TaskInbox,
} from "@/service/workflowService/taskInboxService.ts";

/**
 * Сводный реестр задач по всем контурам (GEN-11): согласования записок, закупок
 * и прочих документов в одном списке, включая полученные по замещению.
 *
 * Просроченные идут первыми: реестр должен начинаться с того, что горит.
 */

const FILTERS: { id: string; label: string; type?: string }[] = [
    {id: "all", label: "Все контуры"},
    {id: "vnd", label: "ВНД"},
    {id: "sz", label: "Служебные записки", type: "Sz"},
    {id: "prc", label: "Закупки", type: "Procurement"},
    {id: "ack", label: "Ознакомление", type: "Acknowledgement"},
];

// Вид карточек-вкладок совпадает с NotificationCategoryPanel на странице "Мои уведомления" —
// тот же контур, тот же цвет: у ВНД цвета/иконка буквально те же, что в NOTIFICATION_CATEGORY_META.
const CONTOUR_META: Record<string, { icon: LucideIcon; color: string; bg: string; ring: string }> = {
    vnd: {icon: FileText, color: "#0e8091", bg: "#dbf2f5", ring: "#b4e6ec"},
    sz: {icon: StickyNote, color: "#b3730a", bg: "#fbeecf", ring: "#f0d9ad"},
    prc: {icon: ShoppingCart, color: "#7a5ce0", bg: "#efeafe", ring: "#ddd0fa"},
    ack: {icon: FileText, color: "#1c7a4d", bg: "#e2f4ea", ring: "#c7e9d6"},
};

// Заглушка пустого списка — своя на каждой вкладке (кроме "ВНД": там свой набор
// заглушек внутри VndTasksPanel/VndTaskList).
const INBOX_EMPTY_META: Record<string, { icon: LucideIcon; title: string; description: string }> = {
    all: {
        icon: Layers,
        title: "Задач нет — всё согласовано",
        description: "Здесь появятся задачи, которые нужно согласовать или обработать — по всем контурам системы.",
    },
    sz: {
        icon: StickyNote,
        title: "Нет задач по служебным запискам",
        description: "Здесь появятся записки, которые ждут вашего решения — согласование, подпись, ознакомление.",
    },
    prc: {
        icon: ShoppingCart,
        title: "Нет задач по закупкам",
        description: "Здесь появятся закупочные документы, которые нужно согласовать или обработать.",
    },
};

function formatDue(iso: string | null): string {
    if (!iso) return "без срока";
    return new Date(iso).toLocaleString("ru-RU", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}

export const TaskInboxPage = () => {
    const [filter, setFilter] = useState("all");
    const [inbox, setInbox] = useState<TaskInbox | null>(null);
    const [loading, setLoading] = useState(true);
    // Поиск намеренно не сбрасывается при смене вкладки — так же, как на ВНД-вкладке
    // (VndTasksPanel): если в одном разделе ничего не нашлось, разумно проверить тот же
    // запрос в соседнем, не перепечатывая его заново.
    const [searchQuery, setSearchQuery] = useState("");
    const [delegateTask, setDelegateTask] = useState<InboxTask | null>(null);

    const isVndTab = filter === "vnd";
    const isAllTab = filter === "all";

    const load = useCallback(async () => {
        if (filter === "vnd") return;

        const current = FILTERS.find(f => f.id === filter);
        try {
            setLoading(true);
            setInbox(await taskInboxService.get(current?.type));
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        void load();
    }, [load]);

    // На "Все контуры" задачи ВНД раньше не показывались вовсе: taskInboxService (сводный
    // реестр GEN-11) знает только про движок маршрутов (WorkflowTask) — согласование записок
    // и закупок идёт через него, а согласование/актуализация/консолидация ВНД устроены
    // отдельным механизмом (см. TasksService на бэке) и через этот реестр не проходят вообще.
    // Тянем их тем же способом, что и вкладка "ВНД" внутри VndTasksPanel (scope "all" - пять
    // разделов одним списком), но только когда реально нужно (enabled).
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

    // Поиск сузил непустой список до нуля — это "ничего не нашлось", а не "в разделе
    // пусто" (у этих двух причин разные заглушки, см. INBOX_EMPTY_META и ниже). На "Все
    // контуры" считаем оба источника сразу — иначе поиск, не нашедший ничего среди записок/
    // закупок, но нашедший что-то среди ВНД (или наоборот), ошибочно показал бы "ничего не
    // найдено" прямо над найденными строками.
    const rawTotalCount = (inbox?.tasks.length ?? 0) + (isAllTab ? vndAllTasks.length : 0);
    const isSearchEmpty = searchQuery.trim().length > 0 && rawTotalCount > 0
        && filteredTasks.length === 0 && filteredVndTasks.length === 0;

    const currentFilterLabel = FILTERS.find((f) => f.id === filter)?.label ?? "";
    const searchPlaceholder = filter === "all"
        ? "Поиск по всем контурам..."
        : `Поиск в разделе «${currentFilterLabel}»...`;

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap"}}>
                <div>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Мои задачи</h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {isVndTab ? (
                            "Согласование, актуализация и консолидация ВНД"
                        ) : inbox ? (
                            // "Всего" раньше считал только записки/закупки (inbox.total из
                            // taskInboxService) — на "Все контуры", где сверху ещё показываются
                            // задачи ВНД (см. vndAllTasks выше), из-за этого писало "Всего: 0"
                            // даже когда задачи явно были видны на экране. Добавляем их количество.
                            <>
                                Всего: <b style={{color: "#4e57d6"}}>
                                {inbox.total + (isAllTab ? vndAllTasks.length : 0)}
                            </b>
                                {inbox.overdue > 0 && ` · просрочено ${inbox.overdue}`}
                                {inbox.delegated > 0 && ` · по замещению ${inbox.delegated}`}
                            </>
                        ) : (
                            "Согласования по всем контурам"
                        )}
                    </div>
                </div>


                    <Link
                        to="/tasks/stats"
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] !text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <ChartColumn className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Статистика по моим задачам
                    </Link>

            </div>

            <div className="flex flex-wrap gap-2.5">
                {FILTERS.map((f) => {
                    const active = filter === f.id;

                    if (f.id === "all") {
                        return (
                            <button
                                key={f.id}
                                onClick={() => setFilter("all")}
                                className={
                                    "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all " +
                                    (active
                                        ? "border-[#4e57d6] bg-[#ececfc] shadow-[0_4px_14px_-6px_rgba(78,87,214,0.35)]"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
                                }
                            >
                                <span
                                    className={
                                        "flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors " +
                                        (active ? "bg-[#4e57d6] text-white" : "bg-slate-100 text-slate-500")
                                    }
                                >
                                    <Layers className="h-4.5 w-4.5"/>
                                </span>
                                <span className={"truncate text-[13px] font-semibold " + (active ? "text-[#4e57d6]" : "text-slate-700")}>
                                    {f.label}
                                </span>
                            </button>
                        );
                    }

                    const meta = CONTOUR_META[f.id];
                    const Icon = meta.icon;

                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={
                                "flex-1 min-w-[150px] cursor-pointer group flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all " +
                                (active
                                    ? "border-transparent shadow-[0_4px_14px_-6px_rgba(15,27,45,0.28)]"
                                    : "border-slate-200 bg-white hover:-translate-y-[1px] hover:shadow-[0_6px_16px_-10px_rgba(15,27,45,0.25)]")
                            }
                            style={active ? {backgroundColor: meta.bg, boxShadow: `inset 0 0 0 1.5px ${meta.ring}`} : undefined}
                        >
                            <span
                                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
                                style={{backgroundColor: active ? "#fff" : meta.bg, color: meta.color}}
                            >
                                <Icon className="h-4.5 w-4.5"/>
                            </span>
                            <span className="truncate text-[13px] font-semibold text-slate-800">{f.label}</span>
                        </button>
                    );
                })}
            </div>

            {isVndTab && <VndTasksPanel/>}

            {!isVndTab && (
                <>
                    <SearchBar
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />

                    {/* Задачи ВНД — только на "Все контуры" (см. filteredVndTasks выше), простыми
                строчками карточек, как и везде на "Мои задачи": тип виден по бейджу раздела
                на самой карточке (VndTaskCard — "Согласование"/"Актуализация"/"Консолидация"
                и т.п.), не отдельным подзаголовком, как и у записок/закупок ниже (там тип —
                тоже просто бейдж на строке, а не заголовок группы). */}
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

                    {/* Записки и закупки - тот же сводный реестр (taskInboxService), что и раньше.
                На "Все контуры" эта секция скрывается, если в ней самой пусто, но выше уже
                что-то нашлось среди ВНД - иначе под настоящими карточками висела бы ещё и
                пустая заглушка "задач нет". */}
                    {(filteredTasks.length > 0 || loading || !(isAllTab && filteredVndTasks.length > 0)) && (
                        <section style={{background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, overflow: "hidden"}}>
                            {filteredTasks.map((task: InboxTask) => (
                                <div
                                    key={taskKey(task)}
                                    style={{
                                        display: "flex", alignItems: "stretch",
                                        borderTop: "1px solid #eef2f7",
                                        background: task.isOverdue ? "#fdf6f5" : undefined,
                                    }}
                                >
                                    <Link
                                        to={taskLink(task)}
                                        style={{
                                            flex: 1, minWidth: 0,
                                            display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                                            textDecoration: "none", color: "inherit",
                                        }}
                                    >
                        <span style={{
                            padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: "#f2f5f9", color: "#55617a", whiteSpace: "nowrap",
                        }}>
                            {task.documentTypeTitle}
                        </span>

                                        <span style={{flex: 1, minWidth: 0}}>
                            <span style={{display: "block", fontSize: 13.5, fontWeight: 600, color: "#0f1b2d"}}>
                                {task.documentTitle}
                            </span>
                            <span style={{display: "block", marginTop: 2, fontSize: 11.5, color: "#8b97ab"}}>
                                {task.regNumber ?? "без номера"} · {task.taskType}
                                {/* Этап есть только у задач маршрута: решение адресата и
                                    поручение приходят вне согласования. */}
                                {task.stepOrder !== null && ` · этап ${task.stepOrder}`}
                                {task.onBehalfOf && ` · по замещению за ${task.onBehalfOf}`}
                                {task.delegatedBy && ` · делегировано от ${task.delegatedBy}`}
                            </span>
                        </span>

                                        <span style={{
                                            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                                            color: task.isOverdue ? "#c0392b" : "#55617a",
                                        }}>
                            {task.isOverdue ? "просрочено · " : "до "}{formatDue(task.dueAt)}
                        </span>
                                    </Link>

                                    {/* Делегировать можно только задачу согласования: у неё есть
                            участник маршрута, которого движок и проверяет. */}
                                    {task.participantId !== null && (
                                        <button
                                            type="button"
                                            title="Делегировать коллеге"
                                            onClick={() => setDelegateTask(task)}
                                            style={{
                                                flexShrink: 0, width: 44, display: "grid", placeItems: "center",
                                                border: "none", borderLeft: "1px solid #eef2f7", background: "none",
                                                color: "#8b97ab", cursor: "pointer",
                                            }}
                                        >
                                            <Share2 style={{width: 16, height: 16}}/>
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Пустая заглушка - только когда ОБА источника (записки/закупки и, на "Все
                    контуры", ВНД) пусты; не только записки/закупки сами по себе (см. секцию
                    ВНД выше). */}
                            {!loading && !(isAllTab && vndAllLoading) && filteredTasks.length === 0
                                && !(isAllTab && filteredVndTasks.length > 0) && (
                                    isSearchEmpty ? (
                                        <EmptyState
                                            embedded
                                            title="Ничего не найдено"
                                            description="Попробуйте изменить запрос поиска."
                                        />
                                    ) : (
                                        <EmptyState
                                            embedded
                                            icon={(INBOX_EMPTY_META[filter] ?? INBOX_EMPTY_META.all).icon}
                                            title={(INBOX_EMPTY_META[filter] ?? INBOX_EMPTY_META.all).title}
                                            description={(INBOX_EMPTY_META[filter] ?? INBOX_EMPTY_META.all).description}
                                        />
                                    )
                                )}
                            {(loading || (isAllTab && vndAllLoading && filteredTasks.length === 0 && filteredVndTasks.length === 0)) && (
                                <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>Загрузка…</div>
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