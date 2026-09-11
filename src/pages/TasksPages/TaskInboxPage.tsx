import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {ChartColumn, FileText, Layers, ShoppingCart, StickyNote, type LucideIcon} from "lucide-react";
import {VndTasksPanel} from "@/components/componentsTasks/VndTasksPanel.tsx";
import {
    taskInboxService,
    taskLink,
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
];

// Вид карточек-вкладок совпадает с NotificationCategoryPanel на странице "Мои уведомления" —
// тот же контур, тот же цвет: у ВНД цвета/иконка буквально те же, что в NOTIFICATION_CATEGORY_META.
const CONTOUR_META: Record<string, { icon: LucideIcon; color: string; bg: string; ring: string }> = {
    vnd: {icon: FileText, color: "#0e8091", bg: "#dbf2f5", ring: "#b4e6ec"},
    sz: {icon: StickyNote, color: "#b3730a", bg: "#fbeecf", ring: "#f0d9ad"},
    prc: {icon: ShoppingCart, color: "#7a5ce0", bg: "#efeafe", ring: "#ddd0fa"},
};

function formatDue(iso: string | null): string {
    if (!iso) return "без срока";
    return new Date(iso).toLocaleString("ru-RU", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}

export const TaskInboxPage = () => {
    const [filter, setFilter] = useState("all");
    const [inbox, setInbox] = useState<TaskInbox | null>(null);
    const [loading, setLoading] = useState(true);

    const вндВкладка = filter === "vnd";

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

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap"}}>
                <div>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Мои задачи</h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {вндВкладка ? (
                            "Согласование, актуализация и консолидация ВНД"
                        ) : inbox ? (
                            <>
                                Всего: <b style={{color: "#4e57d6"}}>{inbox.total}</b>
                                {inbox.overdue > 0 && ` · просрочено ${inbox.overdue}`}
                                {inbox.delegated > 0 && ` · по замещению ${inbox.delegated}`}
                            </>
                        ) : (
                            "Согласования по всем контурам"
                        )}
                    </div>
                </div>

                {/* TODO: страницы статистики по задачам ещё нет — кнопка пока заглушка */}
                {вндВкладка && (
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <ChartColumn className="w-[18px] h-[18px]" strokeWidth={2}/>
                        Статистика по моим задачам
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {FILTERS.map((f) => {
                    const active = filter === f.id;

                    if (f.id === "all") {
                        return (
                            <button
                                key={f.id}
                                onClick={() => setFilter("all")}
                                className={
                                    "cursor-pointer group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all " +
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
                                "cursor-pointer group flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all " +
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

            {вндВкладка && <VndTasksPanel/>}

            {!вндВкладка && (
            <section style={{background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, overflow: "hidden"}}>
                {inbox?.tasks.map((task: InboxTask) => (
                    <Link
                        key={task.taskId}
                        to={taskLink(task)}
                        style={{
                            display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                            borderTop: "1px solid #eef2f7", textDecoration: "none", color: "inherit",
                            background: task.isOverdue ? "#fdf6f5" : undefined,
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
                            </span>
                        </span>

                        <span style={{
                            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                            color: task.isOverdue ? "#c0392b" : "#55617a",
                        }}>
                            {task.isOverdue ? "просрочено · " : "до "}{formatDue(task.dueAt)}
                        </span>
                    </Link>
                ))}

                {!loading && inbox?.tasks.length === 0 && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        Задач нет — всё согласовано
                    </div>
                )}
                {loading && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>Загрузка…</div>
                )}
            </section>
            )}
        </div>
    );
};
