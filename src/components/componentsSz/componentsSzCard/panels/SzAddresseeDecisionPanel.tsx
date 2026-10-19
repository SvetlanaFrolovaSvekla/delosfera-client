/**
 * Решение адресата по существу вопроса.
 *
 * Поле ввода видит только пользователь из «Кому»: это его ответ, а не резолюция
 * согласующего, и подменять его нельзя даже делопроизводителю. Всем остальным
 * решение показывается уже вынесенным.
 */
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {szApprovalService, type SzDetails} from "@/service/szService/szService.ts";
import type {SzAssignmentDraft} from "@/service/szService/szExecutionService.ts";
import {formatDateTime, isPastIso, ruToIso} from "@/utils/szProcess/szCardUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import type {OrgUnitPickerPerson} from "@/components/componentsGeneral/userPicker/UserOrgUnitPickerModal.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Plus, X} from "lucide-react";

interface Props {
    sz: SzDetails;
    currentUserId: number | undefined;
    /** Пользователи системы — из них назначаются исполнители поручений. */
    users: OrgUnitPickerPerson[];
    onDecided: (updated: SzDetails) => void;
}

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

/**
 * Строка поручения в форме. rowKey — постоянный ключ строки для React: с key={index}
 * при удалении строки из середины состояние полей переезжало к соседней строке.
 * Срок — как его набирает человек (дд.мм.гггг, как в блоке «Исполнение»); в гггг-мм-дд
 * переводится при отправке. На сервер rowKey не уходит.
 */
type AssignmentRow = Omit<SzAssignmentDraft, "dueDate"> & { rowKey: number; dueDate: string };

const datePickerClass = "!h-10 !rounded-[9px] !text-[13px]";
let assignmentRowSeq = 0;

export function SzAddresseeDecisionPanel({sz, currentUserId, users, onDecided}: Props) {
    const {t, i18n} = useTranslation();
    const [text, setText] = useState("");
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!sz.addresseeUserId) return null;

    // Адресат или тот, кто его сейчас замещает (GEN-14): решение за отсутствующего
    // сервер принимает, а задача на него уже стоит в реестре замещающего.
    const isAddressee = currentUserId === sz.addresseeUserId
        || (sz.actingForUserIds ?? []).includes(sz.addresseeUserId);

    // Решение ждут в двух случаях. Подписант назван отдельно — после подписи записка
    // «на решении адресата». Подписал сам адресат — она сразу «на исполнении», и решение
    // с поручениями — его следующее действие (сервер принимает его и там). Раньше форма
    // открывалась только в первом случае, и адресат, подписавший записку, её не видел.
    // Если резолюцию по записке уже вынесли через исполнение — решения не ждём.
    const awaiting = sz.statusCode === "OnAddresseeDecision"
        || (sz.statusCode === "OnExecution" && !sz.executionResolution);

    // Ни решения, ни ожидания — блок скрыт: до конца согласования показывать нечего.
    if (!awaiting && !sz.addresseeDecision) return null;

    const patch = (index: number, changes: Partial<AssignmentRow>) =>
        setAssignments((list) => list.map((a, i) => (i === index ? {...a, ...changes} : a)));

    const submit = async () => {
        if (!text.trim()) {
            setError(t("szCard.addresseeDecision.errNoDecision")); // Напишите решение по записке
            return;
        }

        const filled = assignments.filter((a) => a.assigneeUserId && a.text.trim());
        if (assignments.length > 0 && filled.length !== assignments.length) {
            setError(t("szCard.addresseeDecision.errAssignmentIncomplete")); // У каждого поручения укажите исполнителя и текст
            return;
        }
        if (filled.filter((a) => a.isPrimary).length > 1) {
            setError(t("szCard.addresseeDecision.errOnePrimary")); // Ответственный исполнитель может быть только один
            return;
        }
        // Недонабранный срок не должен молча превратиться в «срок записки».
        if (filled.some((a) => a.dueDate.trim() && !ruToIso(a.dueDate.trim()))) {
            setError(t("szCard.execution.invalidDueDate"));
            return;
        }
        if (filled.some((a) => isPastIso(ruToIso(a.dueDate.trim())))) {
            setError(t("szCard.execution.pastDueDate")); // Срок поручения не может быть в прошлом
            return;
        }

        setSaving(true);
        setError(null);
        try {
            onDecided(await szApprovalService.decide(sz.id, text, filled.map((a): SzAssignmentDraft => ({
                assigneeUserId: a.assigneeUserId,
                text: a.text,
                isPrimary: a.isPrimary,
                dueDate: ruToIso(a.dueDate.trim()),
            }))));
            setText("");
            setAssignments([]);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? t("szCard.addresseeDecision.errSave")); // Не удалось сохранить решение
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            {/* Решение адресата */}
            <h2 className="m-0 mb-1 text-[15px] font-semibold">{t("szCard.addresseeDecision.title")}</h2>
            <div className="mb-3 text-[12.5px] text-[#8b97ab]">
                {/* Кому: {имя} */}
                {t("szCard.addresseeDecision.to", {name: sz.addresseeUser ?? "—", interpolation: {escapeValue: false}})}
            </div>

            {sz.addresseeDecision ? (
                <div className="rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] px-3 py-2.5 text-[13px] leading-[1.6] text-[#1c2740] whitespace-pre-wrap">
                    {sz.addresseeDecision}
                    <div className="mt-2 text-[11.5px] text-[#8b97ab]">
                        {formatDateTime(sz.addresseeDecisionAt, i18n.language)}
                    </div>
                </div>
            ) : isAddressee ? (
                <>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                        // Решение по существу вопроса
                        placeholder={t("szCard.addresseeDecision.decisionPlaceholder")}
                        className="w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] leading-[1.6] outline-none resize-y focus:border-[#2f68f5]"
                    />
                    {/* Поручения выдаются тем же решением: адресат отвечает по существу
                        и сразу назначает, кому что делать. */}
                    <div className="mt-4">
                        <div className="flex items-baseline justify-between mb-[5px]">
                            {/* Поручения */}
                            <span className="text-[11.5px] text-[#8b97ab]">{t("szCard.addresseeDecision.assignments")}</span>
                            {/* необязательно */}
                            <span className="text-[11.5px] text-[#a6b0c2]">{t("szCard.addresseeDecision.optional")}</span>
                        </div>

                        {assignments.map((a, i) => (
                            <div key={a.rowKey} className="mb-2 rounded-[9px] border border-[#e5e9f0] bg-[#fafbfd] p-3">
                                <div className="flex items-center gap-2">
                                    {/* Исполнитель — тот же выбор с поиском и деревом СП, что и в «Исполнении» */}
                                    <div className="min-w-0 flex-1">
                                        <UserPickerField
                                            people={users}
                                            value={a.assigneeUserId || null}
                                            onChange={(id) => patch(i, {assigneeUserId: id})}
                                            placeholder={t("szCard.addresseeDecision.assignee")}
                                            modalTitle={t("szCard.execution.form.assigneeModalTitle")}
                                            searchPlaceholder={t("szCard.fields.userSearch")}
                                            clearable
                                            onClear={() => patch(i, {assigneeUserId: 0})}
                                            accent="blue"
                                        />
                                    </div>
                                    {/* Срок поручения; пусто — срок записки */}
                                    <Tooltip content={t("szCard.addresseeDecision.dueTooltip")} side="top">
                                        <div className="w-[170px] shrink-0" aria-label={t("szCard.addresseeDecision.due")}>
                                            <DatePickerInput
                                                value={a.dueDate}
                                                onChange={(v) => patch(i, {dueDate: v})}
                                                className={datePickerClass}
                                            />
                                        </div>
                                    </Tooltip>
                                    {/* Убрать поручение */}
                                    <Tooltip content={t("szCard.addresseeDecision.removeAssignment")} side="top">
                                        <button
                                            type="button"
                                            aria-label={t("szCard.addresseeDecision.removeAssignment")}
                                            onClick={() => setAssignments((list) => list.filter((_, x) => x !== i))}
                                            className="shrink-0 border-none bg-transparent px-1 text-[#55617a] cursor-pointer hover:text-[#c0392b]"
                                        >
                                            <X size={16}/>
                                        </button>
                                    </Tooltip>
                                </div>

                                <input
                                    className={`${inputClass} mt-2`}
                                    // Что поручено
                                    placeholder={t("szCard.addresseeDecision.assignmentText")}
                                    value={a.text}
                                    onChange={(e) => patch(i, {text: e.target.value})}
                                />

                                <label className="mt-2 flex items-center gap-2 text-[12.5px] text-[#55617a]">
                                    <input
                                        type="checkbox"
                                        checked={a.isPrimary}
                                        onChange={(e) => patch(i, {isPrimary: e.target.checked})}
                                    />
                                    {/* Ответственный исполнитель — сводит результат */}
                                    {t("szCard.addresseeDecision.primary")}
                                </label>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setAssignments((list) => [
                                ...list,
                                {rowKey: ++assignmentRowSeq, assigneeUserId: 0, text: "", isPrimary: list.length === 0, dueDate: ""},
                            ])}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] font-semibold text-[#2f68f5] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            <Plus size={14}/>
                            {/* Добавить поручение */}
                            {t("szCard.addresseeDecision.addAssignment")}
                        </button>
                    </div>

                    {error && <div className="mt-2 text-[12.5px] text-[#c0392b]">{error}</div>}
                    <button
                        onClick={() => void submit()}
                        disabled={saving}
                        className="mt-3 h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        {/* Вынести решение */}
                        {t("szCard.addresseeDecision.submit")}
                    </button>
                </>
            ) : (
                <div className="text-[13px] text-[#8b97ab]">
                    {/* Записка согласована и ждёт решения адресата. */}
                    {t("szCard.addresseeDecision.waiting")}
                </div>
            )}
        </div>
    );
}
