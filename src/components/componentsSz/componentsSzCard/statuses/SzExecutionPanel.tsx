/**
 * Исполнение записки: резолюция руководителя с поручениями, отчёты исполнителей,
 * продление срока и закрытие. Показывается, когда записка ушла на исполнение.
 */
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useSzUsers} from "@/hooks/sz/useSzUsers.ts";
import type {SzDetails} from "@/service/szService/szService.ts";
import {
    szExecutionService,
    type SzAssignment,
    type SzAssignmentState,
} from "@/service/szService/szExecutionService.ts";
import {toast} from "@/service/toastService.ts";
import {formatDate, inputClass, isPastIso, ruToIso, serverMessage} from "@/utils/szProcess/szCardUtils.ts";

import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {CalendarClock, CheckCircle2, Plus, X} from "lucide-react";

const textareaClass =
    "w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5] resize-y";

const datePickerClass = "!h-10 !rounded-[9px] !text-[13px]";

/** Цвет плашки состояния поручения. */
const STATE_TONE: Record<SzAssignmentState | "Overdue", { fg: string; bg: string }> = {
    Open: {fg: "#2f68f5", bg: "#eef3ff"},
    Reported: {fg: "#b3730a", bg: "#fdf3e0"},
    Done: {fg: "#1c7a4d", bg: "#e9f6ee"},
    Cancelled: {fg: "#8b97ab", bg: "#f2f5f9"},
    Overdue: {fg: "#c0392b", bg: "#fbeae7"},
};

/** Черновик поручения в форме резолюции: срок — в формате DatePickerInput (дд.мм.гггг). */
interface DraftRow {
    /** Постоянный ключ строки для React (не индекс): иначе при удалении строки пикер и дата переезжали к соседней. */
    rowKey: number;
    assigneeUserId: number;
    text: string;
    isPrimary: boolean;
    dueDate: string;
}

let draftRowSeq = 0;
const emptyDraft = (isPrimary: boolean): DraftRow =>
    ({rowKey: ++draftRowSeq, assigneeUserId: 0, text: "", isPrimary, dueDate: ""});

interface Props {
    sz: SzDetails;
    /** Карточка перечитывает записку: статус меняется по ходу исполнения. */
    onChanged: () => Promise<void> | void;
}

export function SzExecutionPanel({sz, onChanged}: Props) {
    const {t} = useTranslation();
    const {user, hasPermission} = useAuth();
    const {userList} = useSzUsers();

    const [assignments, setAssignments] = useState<SzAssignment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // формы
    const [resolutionText, setResolutionText] = useState("");
    const [drafts, setDrafts] = useState<DraftRow[]>(() => [emptyDraft(true)]);
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
            setError(t("szCard.execution.loadFailed"));
        }
    }, [sz.id, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const isAuthor = !!user && sz.authorId === user.id;
    const isAddressee = !!user && sz.addresseeUserId === user.id;

    /**
     * Кто распоряжается исполнением — так же, как проверяет сервер (EnsureCanControl):
     * автор, адресат (он же подписант — резолюцию после подписи выносит именно он) и
     * делопроизводство с правом «видеть все записки». Раньше форма была только у автора,
     * и адресат, получив задачу «Резолюция по записке», не находил на карточке, где её вынести.
     */
    const canControl = isAuthor || isAddressee || hasPermission(PermissionCode.ViewAllSz);

    const hasResolution = assignments.length > 0 || !!sz.executionResolution;
    const live = assignments.filter((a) => a.state === "Open" || a.state === "Reported");
    const onExecution = sz.statusCode === "OnExecution";

    /**
     * Адресат, ещё не вынесший решения, выносит его в блоке «Решение адресата» выше —
     * там же и поручения. Вторая форма резолюции здесь дублировала бы ту же работу.
     * После решения без поручений эта форма появляется: поручения можно выдать отдельно.
     */
    const addresseeDecidesAbove = isAddressee && !sz.addresseeDecision;

    /**
     * Закрывать записку руками нужно только тогда, когда сама она не закроется.
     *
     * Записка становится исполненной сама, как только принято последнее
     * поручение. Пока поручения в работе, кнопка бесполезна — сервер откажет,
     * пересчитав незакрытые. Остаётся случай, ради которого кнопка и нужна:
     * поручений нет вовсе или все они сняты.
     */
    const closesItself = live.length > 0;

    /** Мои поручения по этой записке — по ним видна форма отчёта. */
    const mine = useMemo(
        () => assignments.filter((a) => a.assigneeUserId === user?.id && (a.state === "Open" || a.state === "Reported")),
        [assignments, user],
    );

    const run = async (action: () => Promise<unknown>, fallback: string, successMessage?: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
            await onChanged();
            if (successMessage) toast.success(successMessage);
        } catch (e) {
            setError(serverMessage(e) ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const updateDraft = (index: number, patch: Partial<DraftRow>) =>
        setDrafts((list) => list.map((x, i) => (i === index ? {...x, ...patch} : x)));

    const removeDraft = (index: number) =>
        setDrafts((list) => {
            const next = list.filter((_, i) => i !== index);
            // Ответственный должен остаться: убрали его — им становится первый.
            if (next.length && !next.some((x) => x.isPrimary)) next[0] = {...next[0], isPrimary: true};
            return next;
        });

    const submitResolution = () => {
        if (!resolutionText.trim()) {
            setError(t("szCard.execution.resolutionTextRequired"));
            return;
        }

        // Полностью пустые строки (добавили и не заполнили) просто не отправляем.
        // Наполовину заполненную строку молча выбрасывать нельзя: человек думает,
        // что поручение выдано, а исполнитель о нём так и не узнает.
        const ready = drafts.filter((d) => d.assigneeUserId > 0 || d.text.trim() || d.dueDate.trim());
        if (ready.some((d) => !(d.assigneeUserId > 0) || !d.text.trim())) {
            setError(t("szCard.execution.assignmentIncomplete"));
            return;
        }
        // Недонабранный срок («12.0») не должен молча превращаться в «срок записки».
        if (ready.some((d) => d.dueDate.trim() && !ruToIso(d.dueDate.trim()))) {
            setError(t("szCard.execution.invalidDueDate"));
            return;
        }
        // Срок в прошлом исполнитель выполнить не может: поручение сразу было бы просрочено.
        if (ready.some((d) => isPastIso(ruToIso(d.dueDate.trim())))) {
            setError(t("szCard.execution.pastDueDate"));
            return;
        }
        if (!ready.length) {
            setError(t("szCard.execution.assigneesRequired"));
            return;
        }
        // Ответственный мог остаться в пустой строке, которая на сервер не уходит.
        if (!ready.some((d) => d.isPrimary)) {
            setError(t("szCard.execution.primaryRequired"));
            return;
        }

        void run(async () => {
            await szExecutionService.resolve(sz.id, resolutionText.trim(), ready.map((d) => ({
                assigneeUserId: d.assigneeUserId,
                text: d.text.trim(),
                isPrimary: d.isPrimary,
                dueDate: ruToIso(d.dueDate.trim()),
            })));
            setResolutionText("");
            setDrafts([emptyDraft(true)]);
        }, t("szCard.execution.resolveFailed"), t("szCard.execution.resolvedToast"));
    };

    const submitExtend = () => {
        const iso = ruToIso(extendDate);
        if (!iso || !extendReason.trim()) {
            setError(t("szCard.execution.extendRequired"));
            return;
        }
        void run(async () => {
            await szExecutionService.extend(sz.id, iso, extendReason.trim());
            setExtendOpen(false);
            setExtendDate("");
            setExtendReason("");
        }, t("szCard.execution.extendFailed"), t("szCard.execution.extendedToast"));
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            {/* Заголовок + сводка справа */}
            <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {/* Исполнение */}
                    {t("szCard.execution.title")}
                </div>
                {sz.statusCode === "Executed" ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1c7a4d]">
                        <CheckCircle2 size={14}/>
                        {t("szCard.execution.executedOn", {date: formatDate(sz.executedAt)})}
                    </span>
                ) : (
                    <span className="text-[12.5px] font-semibold text-[#8b97ab]">
                        {t("szCard.execution.inWork", {n: live.length})}
                    </span>
                )}
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {/* Вынесенная резолюция */}
            {sz.executionResolution && (
                <div className="mb-3 rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
                    <div className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#a3adbd]">
                        {t("szCard.execution.resolutionLabel")} · {formatDate(sz.executionResolutionAt)}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-[13px] text-[#1c2740]">{sz.executionResolution}</div>
                </div>
            )}

            {/* Итог исполнения */}
            {sz.executionSummary && (
                <div className="mb-3 rounded-[10px] border border-[#c9e6d5] bg-[#eef8f2] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    <span className="font-semibold">{t("szCard.execution.summaryLabel")}:</span> {sz.executionSummary}
                </div>
            )}

            {/* Продления срока */}
            {sz.dueDateExtensions > 0 && (
                <div className="mb-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-2.5 text-[13px] text-[#b3730a]">
                    {t("szCard.execution.extendedInfo", {
                        n: sz.dueDateExtensions,
                        reason: sz.dueDateExtensionReason ?? "—",
                        interpolation: {escapeValue: false},
                    })}
                </div>
            )}

            {/* Форма резолюции. Выносится один раз: дальше работа идёт по поручениям. */}
            {onExecution && !hasResolution && canControl && !addresseeDecidesAbove && (
                <div className="rounded-[12px] border border-[#cbddff] bg-[#f5f8ff] p-4">
                    <div className="text-[13.5px] font-semibold text-[#0f1b2d]">
                        {t("szCard.execution.form.title")}
                    </div>
                    <div className="mt-0.5 mb-3 text-[12px] text-[#8b97ab]">
                        {t("szCard.execution.form.hint")}
                    </div>

                    {/* Текст резолюции */}
                    <Field label={t("szCard.execution.form.text")} required>
                        <textarea
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            rows={3}
                            placeholder={t("szCard.execution.form.textPlaceholder")}
                            className={textareaClass}
                        />
                    </Field>

                    {/* Поручения */}
                    <div className="mt-3 flex flex-col gap-2.5">
                        {drafts.map((d, i) => (
                            <div key={d.rowKey} className="rounded-[10px] border border-[#e5e9f0] bg-white p-3.5">
                                <div className="mb-2.5 flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-[#55617a]">
                                        {t("szCard.execution.form.assignmentN", {n: i + 1})}
                                    </span>
                                    {drafts.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeDraft(i)}
                                            title={t("szCard.execution.form.remove")}
                                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]"
                                        >
                                            <X size={15}/>
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-[minmax(0,1fr)_170px] gap-3">
                                    {/* Исполнитель */}
                                    <Field label={t("szCard.execution.form.assignee")} required>
                                        <UserPickerField
                                            people={userList}
                                            value={d.assigneeUserId || null}
                                            onChange={(id) => updateDraft(i, {assigneeUserId: id})}
                                            placeholder={t("szCard.execution.form.assigneePlaceholder")}
                                            modalTitle={t("szCard.execution.form.assigneeModalTitle")}
                                            searchPlaceholder={t("szCard.fields.userSearch")}
                                            clearable
                                            onClear={() => updateDraft(i, {assigneeUserId: 0})}
                                        />
                                    </Field>
                                    {/* Срок — пусто: срок записки */}
                                    <Field label={t("szCard.execution.form.dueDate")}>
                                        <DatePickerInput
                                            value={d.dueDate}
                                            onChange={(v) => updateDraft(i, {dueDate: v})}
                                            className={datePickerClass}
                                        />
                                    </Field>
                                </div>

                                {/* Что поручено */}
                                <div className="mt-3">
                                    <Field label={t("szCard.execution.form.task")} required>
                                        <input
                                            value={d.text}
                                            onChange={(e) => updateDraft(i, {text: e.target.value})}
                                            placeholder={t("szCard.execution.form.taskPlaceholder")}
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                {/* Ответственный — ровно один на резолюцию */}
                                <PlainCheckbox
                                    tone="brand"
                                    className="mt-3"
                                    checked={d.isPrimary}
                                    onChange={() => setDrafts((list) => list.map((x, xi) => ({...x, isPrimary: xi === i})))}
                                >
                                    {t("szCard.execution.form.primary")}
                                </PlainCheckbox>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <SzButton size="sm" className="gap-1.5" onClick={() => setDrafts((l) => [...l, emptyDraft(false)])}>
                            <Plus size={15}/>
                            {t("szCard.execution.form.addAssignee")}
                        </SzButton>
                        <SzButton variant="primary" size="sm" onClick={submitResolution} disabled={busy}>
                            {t("szCard.execution.form.submit")}
                        </SzButton>
                    </div>
                </div>
            )}

            {/* Поручения */}
            {assignments.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {assignments.map((a) => {
                        const isMine = a.assigneeUserId === user?.id;
                        const tone = a.isOverdue ? STATE_TONE.Overdue : STATE_TONE[a.state];
                        return (
                            <div key={a.id} className="rounded-[10px] border border-[#eef2f7] bg-white px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#1c2740]">
                                            <span>{a.text}</span>
                                            {a.isPrimary && (
                                                <span className="rounded-full bg-[#eef3ff] px-2 py-[1px] text-[11px] font-semibold text-[#2f68f5]">
                                                    {t("szCard.execution.primaryBadge")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                                            {a.assigneeName ?? t("szCard.execution.unknownUser", {id: a.assigneeUserId})}
                                            {a.assigneeUnit && ` · ${a.assigneeUnit}`}
                                            {a.dueDate && ` · ${t("szCard.execution.dueTo", {date: formatDate(a.dueDate)})}`}
                                        </div>
                                    </div>
                                    <span
                                        className="flex-none whitespace-nowrap rounded-full px-[9px] py-[2px] text-[11.5px] font-semibold"
                                        style={{color: tone.fg, background: tone.bg}}
                                    >
                                        {a.isOverdue ? t("szCard.execution.overdue") : t(`szCard.execution.state.${a.state}`)}
                                    </span>
                                </div>

                                {a.reportText && (
                                    <div className="mt-2 rounded-[8px] bg-[#f8fafc] px-3 py-2 text-[12.5px] text-[#55617a]">
                                        <span className="font-semibold">{t("szCard.execution.reportLabel")}:</span> {a.reportText}
                                    </div>
                                )}
                                {a.returnReason && (
                                    <div className="mt-2 rounded-[8px] bg-[#fdf3e0] px-3 py-2 text-[12.5px] text-[#b3730a]">
                                        <span className="font-semibold">{t("szCard.execution.returnedLabel")}:</span> {a.returnReason}
                                    </div>
                                )}

                                {/* Отчёт сдаёт исполнитель, принимает — тот, кто распоряжается исполнением. */}
                                {isMine && (a.state === "Open" || a.state === "Reported") && (
                                    <div className="mt-2.5">
                                        <textarea
                                            value={reports[a.id] ?? ""}
                                            onChange={(e) => setReports((r) => ({...r, [a.id]: e.target.value}))}
                                            rows={2}
                                            placeholder={t("szCard.execution.reportPlaceholder")}
                                            className={textareaClass}
                                        />
                                        <SzButton
                                            variant="success"
                                            size="sm"
                                            className="mt-2"
                                            // Пустой отчёт ничего не сообщает тому, кто его принимает.
                                            disabled={busy || !(reports[a.id] ?? "").trim()}
                                            onClick={() => void run(async () => {
                                                await szExecutionService.report(a.id, (reports[a.id] ?? "").trim());
                                                // Поле освобождаем: сданный отчёт уже показан выше.
                                                setReports((r) => ({...r, [a.id]: ""}));
                                            }, t("szCard.execution.reportFailed"), t("szCard.execution.reportedToast"))}
                                        >
                                            {a.state === "Reported"
                                                ? t("szCard.execution.resubmitReport")
                                                : t("szCard.execution.submitReport")}
                                        </SzButton>
                                    </div>
                                )}

                                {canControl && a.state === "Reported" && returnFor !== a.id && (
                                    <div className="mt-2.5 flex flex-wrap gap-2">
                                        <SzButton
                                            variant="success"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => void run(
                                                () => szExecutionService.accept(a.id),
                                                t("szCard.execution.acceptFailed"),
                                                t("szCard.execution.acceptedToast"),
                                            )}
                                        >
                                            {t("szCard.execution.accept")}
                                        </SzButton>
                                        <SzButton
                                            variant="warning"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => {
                                                setReturnFor(a.id);
                                                setReturnReason("");
                                            }}
                                        >
                                            {t("szCard.execution.return")}
                                        </SzButton>
                                    </div>
                                )}

                                {canControl && a.state === "Open" && (
                                    <SzButton
                                        size="sm"
                                        className="mt-2.5"
                                        disabled={busy}
                                        onClick={() => void run(
                                            () => szExecutionService.cancel(a.id),
                                            t("szCard.execution.cancelFailed"),
                                            t("szCard.execution.cancelledToast"),
                                        )}
                                    >
                                        {t("szCard.execution.cancelAssignment")}
                                    </SzButton>
                                )}

                                {returnFor === a.id && (
                                    <div className="mt-2.5 rounded-[10px] border border-[#f0dcae] bg-[#fffaf0] p-3">
                                        <Field label={t("szCard.execution.returnReason")} required>
                                            <input
                                                value={returnReason}
                                                onChange={(e) => setReturnReason(e.target.value)}
                                                placeholder={t("szCard.execution.returnReasonPlaceholder")}
                                                className={inputClass}
                                            />
                                        </Field>
                                        <div className="mt-2.5 flex gap-2">
                                            <SzButton
                                                variant="warningSolid"
                                                size="sm"
                                                disabled={busy || !returnReason.trim()}
                                                onClick={() => void run(async () => {
                                                    await szExecutionService.returnForRework(a.id, returnReason.trim());
                                                    setReturnFor(null);
                                                }, t("szCard.execution.returnFailed"), t("szCard.execution.returnedToast"))}
                                            >
                                                {t("szCard.execution.returnForRework")}
                                            </SzButton>
                                            <SzButton size="sm" onClick={() => setReturnFor(null)}>
                                                {t("szCard.execution.cancel")}
                                            </SzButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Продление и закрытие */}
            {onExecution && canControl && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SzButton size="sm" className="gap-1.5" onClick={() => setExtendOpen((v) => !v)}>
                        <CalendarClock size={15}/>
                        {t("szCard.execution.extend")}
                    </SzButton>
                    {!closesItself && (
                        <SzButton variant="successOutline" size="sm" className="gap-1.5" onClick={() => setCompleteOpen((v) => !v)}>
                            <CheckCircle2 size={15}/>
                            {t("szCard.execution.complete")}
                        </SzButton>
                    )}
                    {closesItself && (
                        <span className="text-[12.5px] text-[#8b97ab]">
                            {t("szCard.execution.closesItself", {n: live.length})}
                        </span>
                    )}
                </div>
            )}

            {extendOpen && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3">
                        <Field label={t("szCard.execution.extendDate")} required>
                            <DatePickerInput value={extendDate} onChange={setExtendDate} className={datePickerClass}/>
                        </Field>
                        <Field label={t("szCard.execution.extendReason")} required>
                            <input
                                value={extendReason}
                                onChange={(e) => setExtendReason(e.target.value)}
                                placeholder={t("szCard.execution.extendReasonPlaceholder")}
                                className={inputClass}
                            />
                        </Field>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <SzButton variant="primary" size="sm" onClick={submitExtend} disabled={busy}>
                            {t("szCard.execution.confirmExtend")}
                        </SzButton>
                        <SzButton size="sm" onClick={() => setExtendOpen(false)}>
                            {t("szCard.execution.cancel")}
                        </SzButton>
                    </div>
                </div>
            )}

            {completeOpen && (
                <div className="mt-2.5 rounded-[10px] border border-[#c9e6d5] bg-[#f6fbf8] p-4">
                    <Field label={t("szCard.execution.summaryLabel")} required>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={2}
                            placeholder={t("szCard.execution.summaryPlaceholder")}
                            className={textareaClass}
                        />
                    </Field>
                    <div className="mt-3 flex gap-2">
                        <SzButton
                            variant="success"
                            size="sm"
                            disabled={busy || !summary.trim()}
                            onClick={() => void run(async () => {
                                await szExecutionService.complete(sz.id, summary.trim());
                                setCompleteOpen(false);
                                setSummary("");
                            }, t("szCard.execution.completeFailed"), t("szCard.execution.completedToast"))}
                        >
                            {t("szCard.execution.complete")}
                        </SzButton>
                        <SzButton size="sm" onClick={() => setCompleteOpen(false)}>
                            {t("szCard.execution.cancel")}
                        </SzButton>
                    </div>
                </div>
            )}

            {!hasResolution && !canControl && mine.length === 0 && (
                <div className="text-[13px] text-[#8b97ab]">{t("szCard.execution.noResolution")}</div>
            )}
        </div>
    );
}
