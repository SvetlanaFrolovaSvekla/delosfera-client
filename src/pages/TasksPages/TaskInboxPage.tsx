import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
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
    {id: "sz", label: "Служебные записки", type: "Sz"},
    {id: "prc", label: "Закупки", type: "Procurement"},
];

function formatDue(iso: string | null): string {
    if (!iso) return "без срока";
    return new Date(iso).toLocaleString("ru-RU", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}

export const TaskInboxPage = () => {
    const [filter, setFilter] = useState("all");
    const [inbox, setInbox] = useState<TaskInbox | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
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
            <div>
                <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Мои задачи</h1>
                <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                    {inbox
                        ? `Всего ${inbox.total}` +
                          (inbox.overdue > 0 ? ` · просрочено ${inbox.overdue}` : "") +
                          (inbox.delegated > 0 ? ` · по замещению ${inbox.delegated}` : "")
                        : "Согласования по всем контурам"}
                </div>
            </div>

            <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        style={{
                            padding: "7px 13px", borderRadius: 9, font: "inherit", fontSize: 12.5, fontWeight: 600,
                            cursor: "pointer",
                            border: `1px solid ${filter === f.id ? "#2f68f5" : "#e5e9f0"}`,
                            background: filter === f.id ? "#eef3ff" : "#fff",
                            color: filter === f.id ? "#2f68f5" : "#55617a",
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

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
                                {task.regNumber ?? "без номера"} · {task.taskType} · этап {task.stepOrder}
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
        </div>
    );
};
