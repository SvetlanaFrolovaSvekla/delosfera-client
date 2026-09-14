import {useEffect, useState} from "react";
import {axiosInstance} from "@/service/axiosInstance.ts";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/UserPicker.tsx";
import {taskInboxService, type InboxTask} from "@/service/workflowService/taskInboxService.ts";

/**
 * Делегирование задачи коллеге (СК-3): разовая передача одной задачи, в отличие от
 * замещения. Список людей — тот же плоский /users/lookup, что и в подборе участников.
 */
interface Props {
    task: InboxTask;
    onClose: () => void;
    onDone: () => void;
}

export function DelegateTaskModal({task, onClose, onDone}: Props) {
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [toUserId, setToUserId] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        axiosInstance
            .get<PickableUser[]>("users/lookup")
            .then(({data}) => alive && setUsers(data))
            .catch(() => alive && setError("Не удалось загрузить список сотрудников"));
        return () => {
            alive = false;
        };
    }, []);

    async function submit() {
        if (toUserId === null) {
            setError("Выберите, кому передать задачу");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await taskInboxService.delegate(task.taskId, toUserId, comment.trim() || undefined);
            onDone();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось делегировать задачу");
            setBusy(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, background: "rgba(15,27,45,0.4)", zIndex: 60,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "#fff", borderRadius: 14, width: "min(460px, 100%)",
                    padding: 20, display: "flex", flexDirection: "column", gap: 14,
                    boxShadow: "0 20px 60px -20px rgba(15,27,45,0.5)",
                }}
            >
                <div>
                    <h2 style={{margin: 0, fontSize: 16, fontWeight: 700, color: "#0f1b2d"}}>Делегировать задачу</h2>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {task.documentTypeTitle} · {task.regNumber ?? "без номера"} · {task.taskType}
                    </div>
                </div>

                <div>
                    <label style={{display: "block", fontSize: 12.5, fontWeight: 600, color: "#55617a", marginBottom: 6}}>
                        Кому передать
                    </label>
                    <UserPicker
                        users={users}
                        value={toUserId}
                        onChange={u => setToUserId(u?.id ?? null)}
                        placeholder="Выберите сотрудника"
                    />
                </div>

                <div>
                    <label style={{display: "block", fontSize: 12.5, fontWeight: 600, color: "#55617a", marginBottom: 6}}>
                        Причина (необязательно)
                    </label>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        rows={3}
                        style={{
                            width: "100%", resize: "vertical", borderRadius: 9, border: "1px solid #e5e9f0",
                            padding: "8px 10px", fontSize: 13, font: "inherit", boxSizing: "border-box",
                        }}
                        placeholder="Например: в отпуске до пятницы"
                    />
                </div>

                {error && <div style={{fontSize: 12.5, color: "#c0392b"}}>{error}</div>}

                <div style={{display: "flex", justifyContent: "flex-end", gap: 8}}>
                    <button
                        type="button" onClick={onClose} disabled={busy}
                        style={{
                            padding: "8px 14px", borderRadius: 9, border: "1px solid #e5e9f0",
                            background: "#fff", color: "#55617a", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        Отмена
                    </button>
                    <button
                        type="button" onClick={submit} disabled={busy}
                        style={{
                            padding: "8px 14px", borderRadius: 9, border: "none",
                            background: "#2f68f5", color: "#fff", fontSize: 13, fontWeight: 600,
                            cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
                        }}
                    >
                        {busy ? "Передаю…" : "Делегировать"}
                    </button>
                </div>
            </div>
        </div>
    );
}
