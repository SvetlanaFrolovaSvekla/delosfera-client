import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useLocation} from "react-router-dom";
import {AlertTriangle, CircleHelp, Lightbulb, MessageSquarePlus, X} from "lucide-react";
import {
    feedbackService,
    KIND_ORDER,
    KIND_TITLE,
    type FeedbackKind,
} from "@/service/feedbackService/feedbackService.ts";

/**
 * Кнопка «Сообщить» на каждом экране системы.
 *
 * Стоит именно на экране, а не в отдельном разделе: сотруднику, который наткнулся
 * на неудобство посреди работы, некогда искать, куда об этом писать. Кнопка рядом —
 * порог в одно нажатие, и тогда замечание вообще случается.
 *
 * Где человек находился, что за экран, какой браузер и какого размера окно —
 * система записывает сама. Половина сообщений вида «кнопка не помещается»
 * объясняется размером окна, и спрашивать об этом потом значит потерять день.
 */

const KIND_ICON: Record<FeedbackKind, typeof AlertTriangle> = {
    Problem: AlertTriangle,
    Wish: Lightbulb,
    Question: CircleHelp,
};

const KIND_HINT: Record<FeedbackKind, string> = {
    Problem: "Ошибка, пустой экран, действие не проходит",
    Wish: "Работает, но неудобно или чего-то не хватает",
    Question: "Не разобрался, что делать на этом экране",
};

export function FeedbackButton() {
    const location = useLocation();

    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<FeedbackKind>("Wish");
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const textRef = useRef<HTMLTextAreaElement>(null);

    // Экран сменился — прежнее сообщение к нему не относится.
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!open) return;

        textRef.current?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    const reset = () => {
        setText("");
        setKind("Wish");
        setSent(false);
        setError(null);
    };

    const close = () => {
        setOpen(false);
        // Сбрасываем после закрытия, а не сразу: иначе на глазах у человека
        // форма мигает пустотой прежде, чем исчезнуть.
        window.setTimeout(reset, 200);
    };

    const submit = async () => {
        if (text.trim().length < 3) {
            setError("Напишите, что не так или чего не хватает.");
            return;
        }

        setSending(true);
        setError(null);

        try {
            await feedbackService.send(kind, text.trim());
            setSent(true);
            window.setTimeout(close, 1600);
        } catch {
            setError("Не удалось отправить. Попробуйте ещё раз.");
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Сообщить о проблеме или предложить улучшение"
                className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full
                           bg-[#2f68f5] px-4 py-3 text-sm font-medium text-white shadow-lg
                           transition hover:bg-[#2554cc] focus:outline-none focus-visible:ring-2
                           focus-visible:ring-[#2f68f5] focus-visible:ring-offset-2"
            >
                <MessageSquarePlus size={18}/>
                <span className="hidden sm:inline">Сообщить</span>
            </button>

            {open && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
                    onClick={close}
                >
                    <div
                        className="w-full max-w-[520px] rounded-[16px] bg-white p-6 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Сообщение о работе системы"
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#101a2c]">
                                    Что не так на этом экране?
                                </h2>
                                <p className="mt-1 text-[13px] text-[#8593a8]">
                                    Пишем разработчикам. Страницу и браузер система укажет сама.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                aria-label="Закрыть"
                                className="rounded-lg p-1 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        {sent ? (
                            <div className="rounded-[12px] bg-[#e6f4ec] px-4 py-6 text-center">
                                <p className="text-[15px] font-medium text-[#1c7a4d]">Спасибо, записали</p>
                                <p className="mt-1 text-[13px] text-[#4d5a72]">
                                    Ответ придёт в раздел «Мои сообщения».
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 flex flex-col gap-2">
                                    {KIND_ORDER.map((value) => {
                                        const Icon = KIND_ICON[value];
                                        const active = kind === value;

                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setKind(value)}
                                                className={`flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-left transition
                                                    ${active
                                                    ? "border-[#2f68f5] bg-[#eaf0ff]"
                                                    : "border-[#e1e7ef] bg-white hover:border-[#c3cede]"}`}
                                            >
                                                <Icon
                                                    size={18}
                                                    className={active ? "mt-0.5 text-[#2f68f5]" : "mt-0.5 text-[#8593a8]"}
                                                />
                                                <span>
                                                    <span className="block text-[14px] font-medium text-[#101a2c]">
                                                        {KIND_TITLE[value]}
                                                    </span>
                                                    <span className="block text-[12.5px] text-[#8593a8]">
                                                        {KIND_HINT[value]}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <textarea
                                    ref={textRef}
                                    value={text}
                                    onChange={(event) => setText(event.target.value)}
                                    rows={5}
                                    maxLength={4000}
                                    placeholder="Что произошло или чего не хватает. Чем конкретнее, тем быстрее поправим."
                                    className="w-full resize-y rounded-[12px] border border-[#e1e7ef] px-3 py-2.5
                                               text-[14px] text-[#101a2c] outline-none transition
                                               placeholder:text-[#a8b3c4] focus:border-[#2f68f5]"
                                />

                                {error && (
                                    <p className="mt-2 text-[13px] text-[#c0392b]">{error}</p>
                                )}

                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <span className="truncate font-mono text-[11.5px] text-[#a8b3c4]">
                                        {location.pathname}
                                    </span>

                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={close}
                                            className="rounded-[10px] px-4 py-2 text-[14px] text-[#4d5a72]
                                                       transition hover:bg-[#eef2f7]"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            type="button"
                                            onClick={submit}
                                            disabled={sending}
                                            className="rounded-[10px] bg-[#2f68f5] px-4 py-2 text-[14px] font-medium
                                                       text-white transition hover:bg-[#2554cc] disabled:opacity-60"
                                        >
                                            {sending ? "Отправляем…" : "Отправить"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
