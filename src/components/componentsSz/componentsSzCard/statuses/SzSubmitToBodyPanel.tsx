/**
 * Отметка «вынести на коллегиальный орган».
 *
 * Это заявка, а не распоряжение: записка встаёт в очередь к секретарю органа, и
 * он решает, включать ли её в повестку. Формулировка здесь — предложение автора,
 * секретарь вправе её поправить.
 *
 * Ставит автор записки или её адресат: первый знает, что вопрос выходит за его
 * полномочия, второй приходит к этому при вынесении решения.
 *
 * Оформлена так же, как «Исполнение» и «Бумажный оригинал»: карточка с серым
 * заголовком капсом, SzButton, Field, переводы.
 */

import {useState} from "react";
import {useTranslation} from "react-i18next";
import {CheckCircle2, Landmark} from "lucide-react";
import {szService} from "@/service/szService/szService.ts";
import {szExecutionService} from "@/service/szService/szExecutionService.ts";
import {bodyOptions, type MeetingBody} from "@/service/meetingsService/meetingsService.ts";
import {toast} from "@/service/toastService.ts";
import {inputClass, serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";

const textareaClass =
    "w-full px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5] resize-y";

interface Props {
    szId: number;
    /** Текущая отметка: код органа или пусто. */
    body: string | null;
    question: string | null;
    /** Записка уже включена в повестку — менять отметку поздно. */
    inAgenda: boolean;
    /** Может ли текущий пользователь ставить отметку. */
    canEdit: boolean;
    onChanged: () => void;
}

export function SzSubmitToBodyPanel({szId, body, question, inAgenda, canEdit, onChanged}: Props) {
    const {t} = useTranslation();
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState<MeetingBody | "">((body as MeetingBody) ?? "");
    const [text, setText] = useState(question ?? "");
    const [closing, setClosing] = useState(false);
    const [summary, setSummary] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Название органа — из общих переводов заседаний; неизвестный код показываем как есть.
    const bodyTitle = (code: string) => t(`meetings.bodies.${code}`, {
        defaultValue: bodyOptions.find((o) => o.value === code)?.title ?? code,
    });
    const currentTitle = body ? bodyTitle(body) : null;

    const run = async (action: () => Promise<unknown>, fallback: string, successMessage: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            toast.success(successMessage);
            onChanged();
            return true;
        } catch (e) {
            setError(serverMessage(e) ?? fallback);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const save = async (next: MeetingBody | null) => {
        const ok = await run(
            () => next
                ? szService.submitToBody(szId, next, text.trim() || undefined)
                : szService.withdrawFromBody(szId),
            t("szCard.toBody.saveFailed"),
            next ? t("szCard.toBody.submittedToast") : t("szCard.toBody.withdrawnToast"),
        );
        if (ok) setEditing(false);
    };

    // После рассмотрения органом записку закрывают здесь: иначе она навсегда
    // остаётся «на рассмотрении». Итог — обязательный, как при обычном закрытии.
    const closeAfterBoard = async () => {
        if (!summary.trim()) return;
        const ok = await run(
            () => szExecutionService.complete(szId, summary.trim()),
            t("szCard.toBody.closeFailed"),
            t("szCard.toBody.closedToast"),
        );
        if (ok) {
            setClosing(false);
            setSummary("");
        }
    };

    const cancelEditing = () => {
        setEditing(false);
        setSelected((body as MeetingBody) ?? "");
        setText(question ?? "");
        setError(null);
    };

    // Плашка состояния справа от заголовка.
    const status = inAgenda
        ? {label: t("szCard.toBody.statusInAgenda"), fg: "#1c7a4d", bg: "#e9f6ee"}
        : body
            ? {label: t("szCard.toBody.statusPending"), fg: "#2f68f5", bg: "#eef3ff"}
            : {label: t("szCard.toBody.statusNone"), fg: "#8b97ab", bg: "#f2f5f9"};

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            {/* Заголовок + состояние */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    <Landmark size={15}/>
                    {/* Коллегиальный орган */}
                    {t("szCard.toBody.title")}
                </div>
                <span
                    className="rounded-full px-[9px] py-[2px] text-[11.5px] font-semibold"
                    style={{color: status.fg, background: status.bg}}
                >
                    {status.label}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {inAgenda ? (
                /* Включена в повестку — отметку показываем как факт */
                <>
                    <div className="rounded-[10px] border border-[#c9e6d5] bg-[#eef8f2] px-4 py-3">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1c4d35]">
                            <CheckCircle2 size={15} className="text-[#1c7a4d]"/>
                            {currentTitle
                                ? t("szCard.toBody.inAgendaOf", {body: currentTitle, interpolation: {escapeValue: false}})
                                : t("szCard.toBody.inAgenda")}
                        </div>
                        {question && (
                            <div className="mt-1 text-[12.5px] text-[#4d5a72]">
                                {t("szCard.toBody.questionLabel")}: {question}
                            </div>
                        )}
                        <div className="mt-1 text-[12.5px] text-[#8b97ab]">{t("szCard.toBody.inAgendaHint")}</div>
                    </div>

                    {canEdit && !closing && (
                        <SzButton variant="successOutline" size="sm" className="mt-3 gap-1.5" onClick={() => setClosing(true)}>
                            <CheckCircle2 size={15}/>
                            {t("szCard.toBody.closeAfterBoard")}
                        </SzButton>
                    )}

                    {closing && (
                        <div className="mt-2.5 rounded-[10px] border border-[#c9e6d5] bg-[#f6fbf8] p-4">
                            <Field label={t("szCard.toBody.summary")} required>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={2}
                                    placeholder={t("szCard.toBody.summaryPlaceholder")}
                                    className={textareaClass}
                                />
                            </Field>
                            <div className="mt-3 flex gap-2">
                                <SzButton variant="success" size="sm" disabled={busy || !summary.trim()} onClick={() => void closeAfterBoard()}>
                                    {busy ? t("szCard.toBody.closing") : t("szCard.toBody.confirmClose")}
                                </SzButton>
                                <SzButton size="sm" onClick={() => setClosing(false)}>
                                    {t("szCard.toBody.cancel")}
                                </SzButton>
                            </div>
                        </div>
                    )}
                </>
            ) : !editing ? (
                /* Просмотр отметки */
                <>
                    {body ? (
                        <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
                            <div className="text-[13px] text-[#1c2740]">
                                {t("szCard.toBody.submittedTo", {body: currentTitle, interpolation: {escapeValue: false}})}
                                <span className="text-[#8b97ab]"> · {t("szCard.toBody.awaitingSecretary")}</span>
                            </div>
                            {question && (
                                <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                                    {t("szCard.toBody.questionLabel")}: {question}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-[13px] text-[#8b97ab]">{t("szCard.toBody.notSubmitted")}</div>
                    )}

                    {canEdit && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {body ? (
                                <>
                                    <SzButton size="sm" disabled={busy} onClick={() => setEditing(true)}>
                                        {t("szCard.toBody.change")}
                                    </SzButton>
                                    <SzButton variant="danger" size="sm" disabled={busy} onClick={() => void save(null)}>
                                        {t("szCard.toBody.withdraw")}
                                    </SzButton>
                                </>
                            ) : (
                                <SzButton size="sm" className="gap-1.5" disabled={busy} onClick={() => setEditing(true)}>
                                    <Landmark size={15}/>
                                    {t("szCard.toBody.submit")}
                                </SzButton>
                            )}
                        </div>
                    )}
                </>
            ) : (
                /* Форма отметки */
                <div className="rounded-[12px] border border-[#cbddff] bg-[#f5f8ff] p-4">
                    <div className="text-[13.5px] font-semibold text-[#0f1b2d]">{t("szCard.toBody.formTitle")}</div>
                    <div className="mt-0.5 mb-3 text-[12px] text-[#8b97ab]">{t("szCard.toBody.formHint")}</div>

                    {/* Орган */}
                    <div className="mb-[5px] text-[11.5px] text-[#4d5a72]">
                        {t("szCard.toBody.body")}<span className="text-[#c0392b]"> *</span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {bodyOptions.map((option) => {
                            const active = selected === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelected(option.value)}
                                    className={`h-9 cursor-pointer rounded-[9px] border px-3.5 text-[12.5px] font-semibold transition-colors ${
                                        active
                                            ? "border-[#2f68f5] bg-[#eaf1ff] text-[#2f68f5]"
                                            : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                                    }`}
                                >
                                    {bodyTitle(option.value)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Формулировка — необязательно */}
                    {selected && (
                        <Field label={t("szCard.toBody.question")}>
                            <input
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                placeholder={t("szCard.toBody.questionPlaceholder")}
                                className={inputClass}
                            />
                        </Field>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                        <SzButton
                            variant="primary"
                            size="sm"
                            disabled={busy || !selected}
                            onClick={() => void save(selected as MeetingBody)}
                        >
                            {busy ? t("szCard.toBody.saving") : t("szCard.toBody.confirmSubmit")}
                        </SzButton>
                        <SzButton size="sm" onClick={cancelEditing}>
                            {t("szCard.toBody.cancel")}
                        </SzButton>
                    </div>
                </div>
            )}
        </div>
    );
}
