import {useState} from "react";
import {Landmark} from "lucide-react";
import {submitSzToBody} from "@/service/meetingsService/agendaCandidateService.ts";
import {bodyOptions, type MeetingBody} from "@/service/meetingsService/meetingsService.ts";

/**
 * Отметка «вынести на коллегиальный орган».
 *
 * Это заявка, а не распоряжение: записка встаёт в очередь к секретарю органа, и
 * он решает, включать ли её в повестку. Формулировка здесь — предложение автора,
 * секретарь вправе её поправить.
 *
 * Ставит автор записки или её адресат: первый знает, что вопрос выходит за его
 * полномочия, второй приходит к этому при вынесении решения.
 */

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
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState<MeetingBody | "">((body as MeetingBody) ?? "");
    const [text, setText] = useState(question ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentTitle = body
        ? bodyOptions.find((o) => o.value === body)?.title ?? body
        : null;

    const save = async (next: MeetingBody | null) => {
        setBusy(true);
        setError(null);
        try {
            await submitSzToBody(szId, next, next ? text.trim() || undefined : undefined);
            setEditing(false);
            onChanged();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? "Не удалось сохранить отметку.");
        } finally {
            setBusy(false);
        }
    };

    // Вопрос заведён — отметку показываем как факт, без органов управления.
    if (inAgenda) {
        return (
            <div className="rounded-[12px] border border-[#cfe6da] bg-[#e6f4ec] px-4 py-3">
                <div className="flex items-center gap-2">
                    <Landmark size={17} className="text-[#1c7a4d]"/>
                    <span className="text-[13.5px] font-medium text-[#1c4d35]">
                        Включена в повестку{currentTitle ? `: ${currentTitle}` : ""}
                    </span>
                </div>
                <p className="mt-1 text-[12.5px] text-[#4d5a72]">
                    Снять вопрос теперь можно только с повестки заседания.
                </p>
            </div>
        );
    }

    if (!editing) {
        return (
            <div className="rounded-[12px] border border-[#e1e7ef] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Landmark size={17} className={body ? "text-[#2f68f5]" : "text-[#8593a8]"}/>

                    {body ? (
                        <>
                            <span className="text-[13.5px] font-medium text-[#101a2c]">
                                Вынести на: {currentTitle}
                            </span>
                            <span className="text-[12.5px] text-[#8593a8]">
                                ожидает отбора секретарём
                            </span>
                        </>
                    ) : (
                        <span className="text-[13.5px] text-[#8593a8]">
                            На коллегиальный орган не выносится
                        </span>
                    )}

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="ml-auto text-[12.5px] text-[#2f68f5] hover:underline"
                        >
                            {body ? "изменить" : "вынести на орган"}
                        </button>
                    )}
                </div>

                {body && question && (
                    <p className="mt-1.5 text-[12.5px] text-[#4d5a72]">
                        Формулировка: {question}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-[12px] border border-[#c7d8fb] bg-[#f7f9ff] px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
                <Landmark size={17} className="text-[#2f68f5]"/>
                <span className="text-[13.5px] font-medium text-[#101a2c]">
                    Вынести вопрос на коллегиальный орган
                </span>
            </div>

            <p className="mb-3 text-[12.5px] text-[#8593a8]">
                Записка встанет в очередь к секретарю органа. Включать ли её в повестку
                и на какое заседание — решает он.
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
                {bodyOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelected(option.value)}
                        className={`rounded-[9px] border px-3 py-1.5 text-[13px] transition
                            ${selected === option.value
                            ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                            : "border-[#e1e7ef] bg-white text-[#4d5a72] hover:border-[#c3cede]"}`}
                    >
                        {option.title}
                    </button>
                ))}
            </div>

            {selected && (
                <div className="mb-3">
                    <label className="mb-1 block text-[12.5px] font-medium text-[#4d5a72]">
                        Формулировка вопроса — необязательно
                    </label>
                    <input
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Пусто — секретарь возьмёт тему записки."
                        className="w-full rounded-[10px] border border-[#e1e7ef] px-3 py-2
                                   text-[14px] outline-none transition focus:border-[#2f68f5]"
                    />
                </div>
            )}

            {error && <p className="mb-2 text-[13px] text-[#c0392b]">{error}</p>}

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={busy || !selected}
                    onClick={() => save(selected as MeetingBody)}
                    className="rounded-[9px] bg-[#2f68f5] px-4 py-1.5 text-[13px] font-medium text-white
                               transition hover:bg-[#2554cc] disabled:opacity-50"
                >
                    {busy ? "Сохраняем…" : "Поставить отметку"}
                </button>

                {body && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => save(null)}
                        className="rounded-[9px] border border-[#e1e7ef] bg-white px-4 py-1.5 text-[13px]
                                   text-[#4d5a72] transition hover:border-[#c0392b] hover:text-[#c0392b]"
                    >
                        Снять отметку
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => {
                        setEditing(false);
                        setSelected((body as MeetingBody) ?? "");
                        setText(question ?? "");
                        setError(null);
                    }}
                    className="rounded-[9px] px-4 py-1.5 text-[13px] text-[#4d5a72] transition hover:bg-[#eef2f7]"
                >
                    Отмена
                </button>
            </div>
        </div>
    );
}
