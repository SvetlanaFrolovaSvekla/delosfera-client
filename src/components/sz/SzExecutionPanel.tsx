import {useCallback, useEffect, useMemo, useState} from "react";
import {colors} from "@/design/tokens";
import {useAuth} from "@/context/AuthContext.ts";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import type {SzDetails} from "@/service/szService/szService.ts";
import {
    ASSIGNMENT_STATE_LABEL,
    szExecutionService,
    type SzAssignment,
    type SzAssignmentDraft,
} from "@/service/szService/szExecutionService.ts";

const inputClass =
    "w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

interface Props {
    sz: SzDetails;
    /** Карточка перечитывает записку: статус меняется по ходу исполнения. */
    onChanged: () => Promise<void> | void;
}

/**
 * Исполнение записки: резолюция руководителя с поручениями, отчёты исполнителей,
 * продление срока и закрытие. Показывается, когда записка ушла на исполнение.
 */
export function SzExecutionPanel({sz, onChanged}: Props) {
    const {user} = useAuth();

    const [assignments, setAssignments] = useState<SzAssignment[]>([]);
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // формы
    const [resolutionText, setResolutionText] = useState("");
    const [drafts, setDrafts] = useState<SzAssignmentDraft[]>([{assigneeUserId: 0, text: "", isPrimary: true}]);
    const [reports, setReports] = useState<Record<number, string>>({});
    const [returnFor, setReturnFor] = useState<number | null>(null);
    const [returnReason, setReturnReason] = useState("");
    const [extendOpen, setExtendOpen] = useState(false);
    const [extendDate, setExtendDate] = useState("");
    const [extendReason, setExtendReason] = useState("");
    const [completeOpen, setCompleteOpen] = useState(false);
    const [summary, setSummary] = useState("");

    const load = useCallback(async () => {
        try {
            setAssignments(await szExecutionService.list(sz.id));
        } catch {
            setError("Не удалось загрузить поручения");
        }
    }, [sz.id]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        userService.lookup().then(setUsers).catch(() => setUsers([]));
    }, []);

    const isAuthor = !!user && sz.authorId === user.id;
    const hasResolution = assignments.length > 0 || !!sz.executionResolution;
    const live = assignments.filter((a) => a.state === "Open" || a.state === "Reported");
    const onExecution = sz.statusCode === "OnExecution";

    /** Мои поручения по этой записке — по ним видна форма отчёта. */
    const mine = useMemo(
        () => assignments.filter((a) => a.assigneeUserId === user?.id && (a.state === "Open" || a.state === "Reported")),
        [assignments, user],
    );

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
            await onChanged();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(message ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const submitResolution = () => {
        const ready = drafts.filter((d) => d.assigneeUserId > 0 && d.text.trim());
        if (!resolutionText.trim()) { setError("Укажите текст резолюции"); return; }
        if (!ready.length) { setError("Добавьте хотя бы одного исполнителя с текстом поручения"); return; }
        void run(async () => {
            await szExecutionService.resolve(sz.id, resolutionText.trim(), ready);
            setResolutionText("");
            setDrafts([{assigneeUserId: 0, text: "", isPrimary: true}]);
        }, "Не удалось вынести резолюцию");
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="m-0 text-[15px] font-semibold">Исполнение</h2>
                <span className="text-[12.5px] text-[#8b97ab]">
                    {sz.statusCode === "Executed"
                        ? `Исполнена ${formatDate(sz.executedAt)}`
                        : `В работе: ${live.length}`}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {sz.executionResolution && (
                <div className="mb-3 rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
                    <div className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        Резолюция · {formatDate(sz.executionResolutionAt)}
                    </div>
                    <div className="mt-1 text-[13px] text-[#1c2740]">{sz.executionResolution}</div>
                </div>
            )}

            {sz.executionSummary && (
                <div className="mb-3 rounded-[10px] border border-[#c9e6d5] bg-[#eef8f2] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    Итог: {sz.executionSummary}
                </div>
            )}

            {sz.dueDateExtensions > 0 && (
                <div className="mb-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-2.5 text-[13px] text-[#b3730a]">
                    Срок продлевался {sz.dueDateExtensions} раз(а). Основание: {sz.dueDateExtensionReason}
                </div>
            )}

            {/* Резолюция выносится один раз: дальше работа идёт по поручениям. */}
            {onExecution && !hasResolution && isAuthor && (
                <div className="rounded-[10px] border border-[#cbddff] bg-[#f5f8ff] p-4">
                    <div className="text-[13px] font-semibold text-[#0f1b2d]">Резолюция и поручения</div>
                    <textarea
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        rows={2}
                        placeholder="Текст резолюции"
                        className={`${inputClass} mt-2 resize-y`}
                    />
                    <div className="mt-3 flex flex-col gap-2">
                        {drafts.map((d, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2">
                                <select
                                    value={d.assigneeUserId}
                                    onChange={(e) => setDrafts((list) =>
                                        list.map((x, xi) => xi === i ? {...x, assigneeUserId: Number(e.target.value)} : x))}
                                    className={`${inputClass} w-[240px]`}
                                >
                                    <option value={0}>Исполнитель…</option>
                                    {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                </select>
                                <input
                                    value={d.text}
                                    onChange={(e) => setDrafts((list) =>
                                        list.map((x, xi) => xi === i ? {...x, text: e.target.value} : x))}
                                    placeholder="Что поручено"
                                    className={`${inputClass} flex-1 min-w-[220px]`}
                                />
                                <input
                                    type="date"
                                    value={d.dueDate ?? ""}
                                    onChange={(e) => setDrafts((list) =>
                                        list.map((x, xi) => xi === i ? {...x, dueDate: e.target.value || null} : x))}
                                    className={`${inputClass} w-[160px]`}
                                />
                                <label className="flex items-center gap-1.5 text-[12.5px] text-[#55617a] whitespace-nowrap">
                                    <input
                                        type="radio"
                                        name="primary"
                                        checked={d.isPrimary}
                                        onChange={() => setDrafts((list) =>
                                            list.map((x, xi) => ({...x, isPrimary: xi === i})))}
                                    />
                                    Ответственный
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2.5 flex gap-2">
                        <button
                            onClick={() => setDrafts((l) => [...l, {assigneeUserId: 0, text: "", isPrimary: false}])}
                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            Добавить исполнителя
                        </button>
                        <button
                            onClick={submitResolution}
                            disabled={busy}
                            className="h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                        >
                            Вынести резолюцию
                        </button>
                    </div>
                </div>
            )}

            {assignments.length > 0 && (
                <div className="flex flex-col gap-2">
                    {assignments.map((a) => {
                        const isMine = a.assigneeUserId === user?.id;
                        const canControl = isAuthor;
                        return (
                            <div key={a.id} className="rounded-[10px] border border-[#eef2f7] px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[13px] text-[#1c2740]">
                                            {a.text}
                                            {a.isPrimary && (
                                                <span className="ml-2 text-[11.5px] font-semibold text-[#2f68f5]">
                                                    ответственный
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                                            {a.assigneeName ?? `Пользователь #${a.assigneeUserId}`}
                                            {a.assigneeUnit && ` · ${a.assigneeUnit}`}
                                            {a.dueDate && ` · до ${new Date(a.dueDate).toLocaleDateString("ru-RU")}`}
                                        </div>
                                    </div>
                                    <span className="text-[12px] font-semibold whitespace-nowrap"
                                          style={{color: a.isOverdue
                                              ? colors.ryg.red.fg
                                              : a.state === "Done" ? colors.ryg.green.fg : colors.inkSubtle}}>
                                        {a.isOverdue ? "Просрочено" : ASSIGNMENT_STATE_LABEL[a.state]}
                                    </span>
                                </div>

                                {a.reportText && (
                                    <div className="mt-2 rounded-[8px] bg-[#f8fafc] px-3 py-2 text-[12.5px] text-[#55617a]">
                                        Отчёт: {a.reportText}
                                    </div>
                                )}
                                {a.returnReason && (
                                    <div className="mt-2 rounded-[8px] bg-[#fdf3e0] px-3 py-2 text-[12.5px] text-[#b3730a]">
                                        Возвращено: {a.returnReason}
                                    </div>
                                )}

                                {/* Отчёт сдаёт исполнитель, принимает — автор записки. */}
                                {isMine && (a.state === "Open" || a.state === "Reported") && (
                                    <div className="mt-2.5">
                                        <textarea
                                            value={reports[a.id] ?? ""}
                                            onChange={(e) => setReports((r) => ({...r, [a.id]: e.target.value}))}
                                            rows={2}
                                            placeholder="Отчёт об исполнении"
                                            className={`${inputClass} resize-y`}
                                        />
                                        <button
                                            onClick={() => run(async () => {
                                                await szExecutionService.report(a.id, reports[a.id] ?? "");
                                                // Поле освобождаем: сданный отчёт уже показан выше.
                                                setReports((r) => ({...r, [a.id]: ""}));
                                            }, "Не удалось сдать отчёт")}
                                            disabled={busy}
                                            className="mt-2 h-9 px-4 rounded-[9px] border-none bg-[#1c7a4d] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                                        >
                                            {a.state === "Reported" ? "Сдать отчёт заново" : "Сдать отчёт"}
                                        </button>
                                    </div>
                                )}

                                {canControl && a.state === "Reported" && (
                                    <div className="mt-2.5 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => run(() => szExecutionService.accept(a.id), "Не удалось принять отчёт")}
                                            disabled={busy}
                                            className="h-9 px-4 rounded-[9px] border-none bg-[#1c7a4d] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                                        >
                                            Принять
                                        </button>
                                        <button
                                            onClick={() => { setReturnFor(a.id); setReturnReason(""); }}
                                            disabled={busy}
                                            className="h-9 px-4 rounded-[9px] border border-[#f0dcae] bg-white text-[#b3730a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#fdf3e0] disabled:opacity-50"
                                        >
                                            Вернуть
                                        </button>
                                    </div>
                                )}

                                {canControl && a.state === "Open" && (
                                    <button
                                        onClick={() => run(() => szExecutionService.cancel(a.id), "Не удалось снять поручение")}
                                        disabled={busy}
                                        className="mt-2.5 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50"
                                    >
                                        Снять поручение
                                    </button>
                                )}

                                {returnFor === a.id && (
                                    <div className="mt-2.5">
                                        <input
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            placeholder="Причина возврата — исполнителю нужно знать, что доработать"
                                            className={inputClass}
                                        />
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => run(async () => {
                                                    await szExecutionService.returnForRework(a.id, returnReason);
                                                    setReturnFor(null);
                                                }, "Не удалось вернуть отчёт")}
                                                disabled={busy}
                                                className="h-9 px-4 rounded-[9px] border-none bg-[#b3730a] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                                            >
                                                Вернуть на доработку
                                            </button>
                                            <button
                                                onClick={() => setReturnFor(null)}
                                                className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {onExecution && isAuthor && (
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        onClick={() => setExtendOpen((v) => !v)}
                        className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                    >
                        Продлить срок
                    </button>
                    <button
                        onClick={() => setCompleteOpen((v) => !v)}
                        className="h-9 px-4 rounded-[9px] border border-[#c9e6d5] bg-white text-[#1c7a4d] font-semibold text-[12.5px] cursor-pointer hover:bg-[#eef8f2]"
                    >
                        Отметить исполненной
                    </button>
                </div>
            )}

            {extendOpen && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <div className="flex flex-wrap gap-2">
                        <input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)}
                               className={`${inputClass} w-[180px]`}/>
                        <input value={extendReason} onChange={(e) => setExtendReason(e.target.value)}
                               placeholder="Обоснование продления" className={`${inputClass} flex-1 min-w-[240px]`}/>
                    </div>
                    <button
                        onClick={() => run(async () => {
                            await szExecutionService.extend(sz.id, extendDate, extendReason);
                            setExtendOpen(false); setExtendDate(""); setExtendReason("");
                        }, "Не удалось продлить срок")}
                        disabled={busy}
                        className="mt-2.5 h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        Продлить
                    </button>
                </div>
            )}

            {completeOpen && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2}
                              placeholder="Итог исполнения" className={`${inputClass} resize-y`}/>
                    <button
                        onClick={() => run(async () => {
                            await szExecutionService.complete(sz.id, summary);
                            setCompleteOpen(false); setSummary("");
                        }, "Не удалось закрыть записку")}
                        disabled={busy}
                        className="mt-2.5 h-9 px-4 rounded-[9px] border-none bg-[#1c7a4d] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        Отметить исполненной
                    </button>
                </div>
            )}

            {!hasResolution && !isAuthor && mine.length === 0 && (
                <div className="text-[13px] text-[#8b97ab]">Резолюция по записке ещё не вынесена.</div>
            )}
        </div>
    );
}
