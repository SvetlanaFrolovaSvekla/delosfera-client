/**
 * Делегирование задачи коллеге (СК-3): разовая передача одной задачи, в отличие от
 * замещения. Список людей — тот же плоский /users/lookup, что и в подборе участников.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {axiosInstance} from "@/service/axiosInstance.ts";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {taskInboxService, type InboxTask} from "@/service/workflowService/taskInboxService.ts";

interface Props {
    task: InboxTask;
    onClose: () => void;
    onDone: () => void;
}

export function DelegateTaskModal({task, onClose, onDone}: Props) {
    const {t} = useTranslation();
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
            .catch(() => alive && setError(t("tasks.delegate.loadUsersError")));
        return () => {
            alive = false;
        };
    }, [t]);

    async function submit() {
        if (toUserId === null) {
            setError(t("tasks.delegate.chooseRecipientError"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await taskInboxService.delegate(task.taskId, toUserId, comment.trim() || undefined);
            onDone();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? t("tasks.delegate.genericError"));
            setBusy(false);
        }
    }

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,27,45,0.4)] p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex w-[min(460px,100%)] flex-col gap-3.5 rounded-[14px] bg-white p-5 shadow-[0_20px_60px_-20px_rgba(15,27,45,0.5)]"
            >
                <div>
                    <h2 className="m-0 text-[16px] font-bold text-[#0f1b2d]">{t("tasks.delegate.title")}</h2>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        {task.documentTypeTitle} · {task.regNumber ?? t("tasks.common.noRegNumber")} · {task.taskType}
                    </div>
                </div>

                <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-[#55617a]">
                        {t("tasks.delegate.toLabel")}
                    </label>
                    <UserPicker
                        users={users}
                        value={toUserId}
                        onChange={(u) => setToUserId(u?.id ?? null)}
                        placeholder={t("tasks.delegate.toPlaceholder")}
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-[#55617a]">
                        {t("tasks.delegate.reasonLabel")}
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="box-border w-full resize-y rounded-[9px] border border-[#e5e9f0] px-2.5 py-2 font-[inherit] text-[13px]"
                        placeholder={t("tasks.delegate.reasonPlaceholder")}
                    />
                </div>

                {error && <div className="text-[12.5px] text-[#c0392b]">{error}</div>}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {t("general.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="cursor-pointer rounded-[9px] border-none bg-[#2f68f5] px-3.5 py-2 text-[13px] font-semibold text-white disabled:cursor-default disabled:opacity-60"
                    >
                        {busy ? t("tasks.delegate.submitting") : t("tasks.delegate.submit")}
                    </button>
                </div>
            </div>
        </div>
    );
}
