import {useCallback, useEffect, useRef, useState} from "react";
import {regulationService, type RegulationState} from "@/service/signingService/regulationService.ts";

/**
 * Согласие с регламентом простой электронной подписи.
 *
 * Показывается один раз — при первом входе и снова при смене редакции. Пока
 * согласия нет, сервер отказывается ставить подпись, поэтому спросить нужно до
 * того, как человек дойдёт до кнопки «Согласовать» и упрётся в отказ.
 *
 * Окно не закрывается «крестиком»: это не уведомление, а условие, на которое
 * человек либо соглашается, либо продолжает работать без права подписи. Отказ
 * возможен — тогда доступны все разделы, кроме подписания.
 */

export const RegulationConsentGate = () => {
    const [state, setState] = useState<RegulationState | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deferred, setDeferred] = useState(false);

    // Прочитал ли человек текст: соглашаться вслепую он не должен, поэтому кнопка
    // включается, когда список доведён до конца.
    const [read, setRead] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        regulationService.get().then(setState).catch(() => setState(null));
    }, []);

    const onScroll = useCallback(() => {
        const el = textRef.current;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setRead(true);
    }, []);

    // Короткий текст помещается целиком, прокручивать нечего — тогда он прочитан.
    useEffect(() => {
        const el = textRef.current;
        if (el && el.scrollHeight <= el.clientHeight + 24) setRead(true);
    }, [state]);

    if (!state || !state.required || state.accepted || deferred) return null;

    const accept = async () => {
        if (!state.version) return;
        try {
            setBusy(true);
            setError(null);
            setState(await regulationService.accept(state.version));
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось сохранить согласие");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/45 p-4">
            <div className="flex max-h-[86vh] w-full max-w-[720px] flex-col rounded-[14px] bg-white shadow-xl">
                <div className="border-b border-[#eef2f7] px-6 py-4">
                    <h2 className="m-0 text-[16px] font-semibold text-[#0f1b2d]">
                        {state.title ?? "Регламент применения простой электронной подписи"}
                    </h2>
                    <div className="mt-1 text-[12px] text-[#8b97ab]">
                        Редакция {state.version} · подписание документов недоступно, пока регламент не принят
                    </div>
                </div>

                <div
                    ref={textRef}
                    onScroll={onScroll}
                    className="flex-1 overflow-y-auto whitespace-pre-line px-6 py-4 text-[13.5px] leading-[1.75] text-[#26324a]"
                >
                    {state.body}
                </div>

                {error && (
                    <div className="px-6 pb-1 text-[12.5px] text-[#c0392b]">{error}</div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-[#eef2f7] px-6 py-4">
                    <button
                        onClick={accept}
                        disabled={busy || !read}
                        className="h-10 rounded-[10px] border-none bg-[#1c7a4d] px-5 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                        Принимаю
                    </button>
                    <button
                        onClick={() => setDeferred(true)}
                        disabled={busy}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-5 text-[13px] text-[#55617a]"
                    >
                        Позже
                    </button>
                    {!read && (
                        <span className="text-[12px] text-[#8b97ab]">
                            Дочитайте текст до конца, чтобы принять
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
