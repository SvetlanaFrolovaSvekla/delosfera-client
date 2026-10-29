// Окно «Запросить права» из профиля. Заявка — обычное сообщение в «Пожелания и замечания»
// (вид AccessRequest): там его увидит и разберёт тот, кто отвечает за настройки, а ответ
// придёт сотруднику в «Мои сообщения». Отдельной таблицы и маршрута согласования нет —
// это просьба человеку, а не автоматическая выдача прав.
import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {KeyRound, X} from "lucide-react";
import {feedbackService} from "@/service/feedbackService/feedbackService.ts";

interface AccessRequestModalProps {
    open: boolean;
    onClose: () => void;
}

export function AccessRequestModal({open, onClose}: AccessRequestModalProps) {
    const {t} = useTranslation();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!open) return;
        textRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const close = () => {
        onClose();
        // Сбрасываем после закрытия, чтобы форма не мигала пустотой на глазах
        window.setTimeout(() => {
            setText("");
            setSent(false);
            setError(null);
        }, 200);
    };

    const submit = async () => {
        if (text.trim().length < 3) {
            setError(t("userProfile.accessRequest.validationError"));
            return;
        }
        setSending(true);
        setError(null);
        try {
            await feedbackService.send("AccessRequest", text.trim(), t("userProfile.accessRequest.pageTitle"));
            setSent(true);
            window.setTimeout(close, 1800);
        } catch {
            setError(t("userProfile.accessRequest.sendError"));
        } finally {
            setSending(false);
        }
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={close}>
            <div
                className="w-full max-w-[480px] rounded-[16px] bg-white p-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={t("userProfile.accessRequest.title")}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="w-[34px] h-[34px] flex-none rounded-[10px] bg-[#ececfc] text-[#4e57d6] grid place-items-center">
                            <KeyRound size={18} strokeWidth={1.9}/>
                        </span>
                        <div>
                            <h2 className="m-0 text-[17px] font-semibold text-[#101a2c]">
                                {/* Запросить права */}
                                {t("userProfile.accessRequest.title")}
                            </h2>
                            <p className="mt-1 mb-0 text-[13px] text-[#8593a8] leading-[1.5]">
                                {t("userProfile.accessRequest.description")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        aria-label={t("feedbackButton.closeAriaLabel")}
                        className="cursor-pointer rounded-lg p-1 text-[#8593a8] transition hover:bg-[#eef2f7] hover:text-[#101a2c]"
                    >
                        <X size={20}/>
                    </button>
                </div>

                {sent ? (
                    <div className="rounded-[12px] bg-[#e6f4ec] px-4 py-6 text-center">
                        <p className="m-0 text-[15px] font-medium text-[#1c7a4d]">{t("userProfile.accessRequest.sentTitle")}</p>
                        <p className="mt-1 mb-0 text-[13px] text-[#4d5a72]">{t("userProfile.accessRequest.sentDescription")}</p>
                    </div>
                ) : (
                    <>
                        <textarea
                            ref={textRef}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            rows={5}
                            maxLength={4000}
                            placeholder={t("userProfile.accessRequest.placeholder")}
                            className="w-full box-border resize-y rounded-[12px] border border-[#e1e7ef] px-3 py-2.5 text-[14px] text-[#101a2c] outline-none transition placeholder:text-[#a8b3c4] focus:border-[#4e57d6]"
                        />
                        {error && <p className="mt-2 mb-0 text-[13px] text-[#c0392b]">{error}</p>}
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={close}
                                className="cursor-pointer rounded-[10px] px-4 py-2 text-[14px] text-[#4d5a72] transition hover:bg-[#eef2f7]"
                            >
                                {t("feedbackButton.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={submit}
                                disabled={sending}
                                className="cursor-pointer rounded-[10px] bg-[#4e57d6] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#3f47c0] disabled:opacity-60"
                            >
                                {sending ? t("feedbackButton.sending") : t("userProfile.accessRequest.send")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
