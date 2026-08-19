import {useState} from "react";
import {Plus, X} from "lucide-react";
import {szApprovalService, type SzDetails} from "@/service/szService/szService.ts";
import type {SzAssignmentDraft} from "@/service/szService/szExecutionService.ts";

interface Props {
    sz: SzDetails;
    currentUserId: number | undefined;
    /** Пользователи системы — из них назначаются исполнители поручений. */
    users: { id: number; fullName: string }[];
    onDecided: (updated: SzDetails) => void;
}

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

function formatMoment(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

/**
 * Решение адресата по существу вопроса.
 *
 * Поле ввода видит только пользователь из «Кому»: это его ответ, а не резолюция
 * согласующего, и подменять его нельзя даже делопроизводителю. Всем остальным
 * решение показывается уже вынесенным.
 */
export function SzAddresseeDecisionPanel({sz, currentUserId, users, onDecided}: Props) {
    const [text, setText] = useState("");
    const [assignments, setAssignments] = useState<SzAssignmentDraft[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!sz.addresseeUserId) return null;

    const isAddressee = currentUserId === sz.addresseeUserId;
    const awaiting = sz.statusCode === "OnAddresseeDecision";

    // Ни решения, ни ожидания — блок скрыт: до конца согласования показывать нечего.
    if (!awaiting && !sz.addresseeDecision) return null;

    const patch = (index: number, changes: Partial<SzAssignmentDraft>) =>
        setAssignments((list) => list.map((a, i) => (i === index ? {...a, ...changes} : a)));

    const submit = async () => {
        if (!text.trim()) {
            setError("Напишите решение по записке");
            return;
        }

        const filled = assignments.filter((a) => a.assigneeUserId && a.text.trim());
        if (assignments.length > 0 && filled.length !== assignments.length) {
            setError("У каждого поручения укажите исполнителя и текст");
            return;
        }
        if (filled.filter((a) => a.isPrimary).length > 1) {
            setError("Ответственный исполнитель может быть только один");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            onDecided(await szApprovalService.decide(sz.id, text, filled));
            setText("");
            setAssignments([]);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось сохранить решение");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 mb-1 text-[15px] font-semibold">Решение адресата</h2>
            <div className="mb-3 text-[12.5px] text-[#8b97ab]">
                Кому: {sz.addresseeUser ?? "—"}
            </div>

            {sz.addresseeDecision ? (
                <div className="rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] px-3 py-2.5 text-[13px] leading-[1.6] text-[#1c2740] whitespace-pre-wrap">
                    {sz.addresseeDecision}
                    <div className="mt-2 text-[11.5px] text-[#8b97ab]">
                        {formatMoment(sz.addresseeDecisionAt)}
                    </div>
                </div>
            ) : isAddressee ? (
                <>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                        placeholder="Решение по существу вопроса"
                        className="w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] leading-[1.6] outline-none resize-y focus:border-[#2f68f5]"
                    />
                    {/* Поручения выдаются тем же решением: адресат отвечает по существу
                        и сразу назначает, кому что делать. */}
                    <div className="mt-4">
                        <div className="flex items-baseline justify-between mb-[5px]">
                            <span className="text-[11.5px] text-[#8b97ab]">Поручения</span>
                            <span className="text-[11.5px] text-[#a6b0c2]">необязательно</span>
                        </div>

                        {assignments.map((a, i) => (
                            <div key={i} className="mb-2 rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] p-3">
                                <div className="flex gap-2">
                                    <select
                                        className={inputClass}
                                        value={a.assigneeUserId || ""}
                                        onChange={(e) => patch(i, {assigneeUserId: Number(e.target.value)})}
                                    >
                                        <option value="">Исполнитель…</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.fullName}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        className={`${inputClass} w-[170px]`}
                                        value={a.dueDate ?? ""}
                                        onChange={(e) => patch(i, {dueDate: e.target.value || null})}
                                        title="Срок поручения; пусто — срок записки"
                                    />
                                    <button
                                        type="button"
                                        title="Убрать поручение"
                                        onClick={() => setAssignments((list) => list.filter((_, x) => x !== i))}
                                        className="shrink-0 border-none bg-transparent px-1 text-[#55617a] cursor-pointer hover:text-[#c0392b]"
                                    >
                                        <X size={16}/>
                                    </button>
                                </div>

                                <input
                                    className={`${inputClass} mt-2`}
                                    placeholder="Что поручено"
                                    value={a.text}
                                    onChange={(e) => patch(i, {text: e.target.value})}
                                />

                                <label className="mt-2 flex items-center gap-2 text-[12.5px] text-[#55617a]">
                                    <input
                                        type="checkbox"
                                        checked={a.isPrimary}
                                        onChange={(e) => patch(i, {isPrimary: e.target.checked})}
                                    />
                                    Ответственный исполнитель — сводит результат
                                </label>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setAssignments((list) => [
                                ...list,
                                {assigneeUserId: 0, text: "", isPrimary: list.length === 0, dueDate: null},
                            ])}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#2f68f5] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            <Plus size={14}/>
                            Добавить поручение
                        </button>
                    </div>

                    {error && <div className="mt-2 text-[12.5px] text-[#c0392b]">{error}</div>}
                    <button
                        onClick={() => void submit()}
                        disabled={saving}
                        className="mt-3 h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        Вынести решение
                    </button>
                </>
            ) : (
                <div className="text-[13px] text-[#8b97ab]">
                    Записка согласована и ждёт решения адресата.
                </div>
            )}
        </div>
    );
}
