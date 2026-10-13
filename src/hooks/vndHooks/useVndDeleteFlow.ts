// Двухшагового удаления ВНД: 1) пароль, 2) «пароль верный, точно удалить?» + капча-фраза
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {vndService} from "@/service/vndService/vndService.ts";
import {toast} from "@/service/toastService.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

export function useVndDeleteFlow(vnd: VndResponse | null | undefined) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    // Шаг подтверждения: 0 — пароль, 1 — "пароль верный, точно удалить?" + капча
    const [step, setStep] = useState<0 | 1>(0);
    const [captcha, setCaptcha] = useState("");
    const confirmPhrase = t("openVndPage.deleteConfirmPhrase");

    const reset = () => {
        setOpen(false);
        setError(null);
        setPassword("");
        setStep(0);
        setCaptcha("");
    };
    // Пока идёт запрос, закрыть окно нельзя
    const close = () => {
        if (!deleting) reset();
    };
    const changePassword = (value: string) => {
        setPassword(value);
        if (error) setError(null);
    };
    const changeCaptcha = (value: string) => {
        setCaptcha(value);
        if (error) setError(null);
    };

    const submit = async () => {
        if (!vnd) return;
        if (!password) {
            setError(t("openVndPage.deletePasswordRequired"));
            return;
        }

        // Шаг 1: проверяем пароль и переходим к финальному подтверждению
        if (step === 0) {
            setDeleting(true);
            setError(null);
            try {
                await vndService.verifyDeletePassword(password);
                setCaptcha("");
                setStep(1);
            } catch (err) {
                setError(err instanceof Error ? err.message : t("openVndPage.deleteError"));
                setPassword("");
            } finally {
                setDeleting(false);
            }
            return;
        }

        // Шаг 2: капча и само удаление (сервер ещё раз проверит пароль)
        if (captcha.trim().replace(/\s+/g, " ").toLowerCase() !== confirmPhrase.toLowerCase()) {
            setError(t("openVndPage.deleteCaptchaWrong"));
            return;
        }
        setDeleting(true);
        setError(null);
        try {
            await vndService.remove(vnd.id, password);
            toast.success(t("openVndPage.deletedToastTitle"), t("openVndPage.deletedToastDescription", {name: vnd.name}));
            navigate("/base-vnd");
        } catch (err) {
            setError(err instanceof Error ? err.message : t("openVndPage.deleteError"));
            toast.error(t("openVndPage.deleteFailedToastTitle"), err instanceof Error ? err.message : undefined);
            setPassword("");
            setStep(0);
            setDeleting(false);
        }
    };

    return {
        open, openModal: () => setOpen(true), deleting, error, password, step, captcha, confirmPhrase,
        changePassword, changeCaptcha, close, submit,
    };
}

export type VndDeleteFlow = ReturnType<typeof useVndDeleteFlow>;
