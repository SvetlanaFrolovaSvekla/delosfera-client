/**
 * Открывается ТОЛЬКО когда действующей ЭЦП-сессии ещё нет. Пока полученный в 2.3 токен не
 * истёк, повторные подписания идут тихо, без этого окна (см. useEcpApproval).
 *
 * Шаги: ПИН физ. лица (14 цифр, вводится вручную) → способ получения пин-кода (2.1) → пин-код
 * (2.2) → токен (2.3) → get-cert-info (2.4, best-effort) → хэш резолюции от backend → подпись
 * хэша (2.5). ИНН организации необязателен: пусто — подпись как физ. лица, заполнено — от имени
 * организации (представитель юр. лица). Полученная сессия (токен + срок действия
 * + ПИН) хранится в EcpSessionContext — только в памяти, не в localStorage.
 *
 * Хэш для 2.5 запрашивается у backend (coordinationService.getResolutionHash), а НЕ считается
 * здесь — см. обоснование в useEcpApproval.ts.
 */
import {useEffect, useState} from "react";
import {infocomEcpService, infocomErrorText, isValidOrganizationInn, isValidPersonIdnp} from "@/service/infocomEcpService.ts";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import {ecpCredentialService} from "@/service/ecpCredentialService.ts";
import {toast} from "@/service/toastService.ts";
import {formatEcpDuration} from "@/utils/formatEcpDuration.ts";

interface Props {
    vndId: number;
    stageId: number;
    /** То, что подписывается — например, итоговый текст резолюции. Хэш считает backend. */
    payloadText: string;
    onSigned: (result: ResolutionEcpSignature) => void;
    onClose: () => void;
}

type Step = "methods" | "pin" | "signing";

/** Щит с галочкой — значок «подтверждено электронной подписью». */
const ShieldCheckIcon = ({className = "h-5 w-5"}: {className?: string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/>
        <path d="M8.5 12.2l2.5 2.5 4.5-5"/>
    </svg>
);

/** Круг с галочкой — для шага подписания. */
const CheckCircleIcon = ({className = "h-5 w-5"}: {className?: string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 12.5l2.7 2.7L16 9.5"/>
    </svg>
);

export const EcpSignModal = ({vndId, stageId, payloadText, onSigned, onClose}: Props) => {
    const {setSession} = useEcpSession();

    // ПИН физ. лица вводится вручную — без подстановки тестовых значений.
    const [personIdnp, setPersonIdnp] = useState("");
    // ИНН организации - необязателен: если заполнен, подписываем от имени организации.
    const [organizationInn, setOrganizationInn] = useState("");

    const [step, setStep] = useState<Step>("methods");
    const [methods, setMethods] = useState<string[]>([]);
    const [method, setMethod] = useState("sms");
    const [pin, setPin] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Сохранение идентификации на сервере (см. личный кабинет → "Электронная подпись"). Предлагается,
    // только если на сервере настроено шифрование; по умолчанию выключено - пользователь соглашается явно.
    const [rememberAvailable, setRememberAvailable] = useState(false);
    const [rememberDays, setRememberDays] = useState(0);
    const [remember, setRemember] = useState(false);
    useEffect(() => {
        let cancelled = false;
        ecpCredentialService.status()
            .then((s) => {
                if (cancelled) return;
                setRememberAvailable(s.available);
                setRememberDays(s.retentionDays);
            })
            .catch(() => { /* не критично: галочки просто не будет */ });
        return () => { cancelled = true; };
    }, []);

    const idnpValid = isValidPersonIdnp(personIdnp);
    const innValid = organizationInn === "" || isValidOrganizationInn(organizationInn);

    const changePersonIdnp = (value: string) => {
        setPersonIdnp(value.replace(/\D/g, "").slice(0, 14));
        // Способы получения пин-кода относятся к конкретному ПИН — при его смене загружаем заново.
        setMethods([]);
        setError(null);
    };

    const changeOrganizationInn = (value: string) => {
        setOrganizationInn(value.replace(/\D/g, "").slice(0, 14));
        setMethods([]);
        setError(null);
    };

    const loadMethods = async () => {
        if (!idnpValid) {
            setError("ПИН должен состоять ровно из 14 цифр");
            return;
        }
        if (!innValid) {
            setError("ИНН организации — от 10 до 14 цифр (или оставьте поле пустым)");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const {userAuthMethodList} = await infocomEcpService.authMethods(personIdnp, organizationInn);
            const active = userAuthMethodList.filter((m) => m.isActive).map((m) => m.authType);
            const available = active.length > 0 ? active : userAuthMethodList.map((m) => m.authType);
            setMethods(available);
            if (available[0]) setMethod(available[0]);
            if (available.length === 0) setError("Для этого ПИН нет доступных способов получения пин-кода");
        } catch (e) {
            setError(infocomErrorText(e, "Не удалось получить методы авторизации"));
        } finally {
            setBusy(false);
        }
    };

    const requestPin = async () => {
        setBusy(true);
        setError(null);
        try {
            await infocomEcpService.pinCode(personIdnp, method, organizationInn);
            setStep("pin");
        } catch (e) {
            setError(infocomErrorText(e, "Не удалось запросить пин-код"));
        } finally {
            setBusy(false);
        }
    };

    /** 2.3 → показать срок действия → сразу 2.4 (best-effort) + хэш от backend + 2.5. */
    const confirmPinAndSign = async () => {
        if (!pin.trim()) {
            setError("Введите пин-код");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const auth = await infocomEcpService.token(personIdnp, pin.trim(), organizationInn);
            if (!auth.token || !auth.expireAt) throw new Error("Токен доступа не получен");

            const createAt = auth.createAt ?? new Date().toISOString();
            const durationText = formatEcpDuration(new Date(auth.expireAt).getTime() - Date.now());
            toast.info("Электронная подпись подключена",
                `Будет действовать ещё ${durationText} — повторный пин-код на это время не понадобится`);

            setStep("signing");

            let signerFio: string | null = null;
            try {
                const certInfo = await infocomEcpService.certInfo(auth.token);
                signerFio = certInfo.commonName;
            } catch {
                // Некритичный (best-effort) шаг: весь флоу продолжается без ФИО подписанта.
            }

            // Хэш — от backend (текст резолюции + содержимое редакции + код ВНД), не считаем сами.
            const {hash} = await coordinationService.getResolutionHash(vndId, stageId, payloadText);
            const signed = await infocomEcpService.signHash(hash, auth.token);
            if (!signed.isSuccesfull || !signed.sign) throw new Error("Подпись не получена");

            setSession({
                token: auth.token,
                createAt,
                expireAt: auth.expireAt,
                personIdnp,
                signerFio,
            });

            onSigned({
                signatureBase64: signed.sign,
                certToken: auth.token,
                hash,
                personIdnp,
                timestamp: signed.timestamp,
            });

            // Подпись уже получена - сохранение идентификации не должно её задерживать или ронять.
            // Сервер сам проверит код обменом на токен (тот же код принимается повторно).
            if (remember) {
                const savedPin = pin.trim();
                void ecpCredentialService.save(personIdnp, savedPin, organizationInn)
                    .then(() => toast.success("Идентификация сохранена",
                        "Следующие резолюции будут подписываться без ввода ПИН и кода"))
                    .catch((err) => toast.warning("Идентификацию сохранить не удалось",
                        infocomErrorText(err, "Подпись при этом поставлена")));
            }
        } catch (e) {
            setError(infocomErrorText(e, "Подписать не удалось"));
            setStep("pin");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
             role="dialog" aria-modal="true" aria-label="Подтверждение ЭЦП ГП Инфоком">
            <div className="flex w-full max-w-[480px] flex-col rounded-[14px] bg-white p-6 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[#2f68f5] ring-4 ring-[#f3f6ff]">
                        <ShieldCheckIcon className="h-6 w-6"/>
                    </div>
                    <div className="min-w-0">
                        <h2 className="m-0 text-[16px] font-semibold text-[#0f1b2d]">Подтверждение электронной подписью</h2>
                        <p className="m-0 mt-0.5 text-[12px] text-[#8b97ab]">
                            Пожалуйста, подтвердите свою резолюцию электронной подписью.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#c0392b]">
                        {error}
                    </div>
                )}

                {step === "methods" && (
                    <div className="mt-4 flex flex-col gap-3">
                        <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">
                            ПИН (персональный идентификационный номер, 14 цифр)
                            <input className="h-9 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[12.5px] font-mono"
                                   value={personIdnp} inputMode="numeric" autoComplete="off" maxLength={14}
                                   placeholder="00000000000000" autoFocus
                                   onChange={(e) => changePersonIdnp(e.target.value)}
                                   onKeyDown={(e) => {
                                       if (e.key === "Enter" && idnpValid && methods.length === 0 && !busy) void loadMethods();
                                   }}/>
                        </label>

                        <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">
                            ИНН организации (необязательно — заполните, чтобы подписать от имени организации)
                            <input className="h-9 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[12.5px] font-mono"
                                   value={organizationInn} inputMode="numeric" autoComplete="off" maxLength={14}
                                   placeholder="ИНН организации"
                                   onChange={(e) => changeOrganizationInn(e.target.value)}/>
                        </label>

                        {methods.length > 0 && (
                            <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">Способ получения пин-кода
                                <select className="h-9 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[12.5px]"
                                        value={method} onChange={(e) => setMethod(e.target.value)}>
                                    {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                )}

                {step === "pin" && (
                    <div className="mt-4 flex flex-col gap-3">
                        <p className="m-0 text-[12.5px] text-[#55617a]">Пин-код отправлен ({method}). Введите его ниже.</p>
                        <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">Пин-код
                            <input className="h-9 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[13px] font-mono"
                                   value={pin} onChange={(e) => setPin(e.target.value)} autoFocus/>
                        </label>
                        {rememberAvailable && (
                            <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-[1.5] text-[#55617a]">
                                <input type="checkbox" className="mt-[3px]" checked={remember}
                                       onChange={(e) => setRemember(e.target.checked)}/>
                                <span>
                                    Запомнить на {rememberDays} дн.: следующие резолюции подписываются без ввода ПИН и кода.
                                    ПИН и код хранятся на сервере в зашифрованном виде, отозвать можно в личном кабинете.
                                </span>
                            </label>
                        )}
                    </div>
                )}

                {step === "signing" && (
                    <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-[#cfe3d6] bg-[#f2f9f5] px-3.5 py-3 text-[12.5px] text-[#1c7a4d]">
                        <CheckCircleIcon className="h-6 w-6 shrink-0 animate-pulse"/>
                        Токен получен, подписываем резолюцию…
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2.5">
                    <button onClick={onClose} disabled={busy}
                            className="cursor-pointer h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] text-[#55617a] disabled:opacity-50">
                        Отмена
                    </button>

                    {step === "methods" && methods.length === 0 && (
                        <button onClick={loadMethods} disabled={busy || !idnpValid || !innValid}
                                className="cursor-pointer h-10 rounded-[10px] border-none bg-[#2f68f5] px-5 text-[13px] font-semibold text-white disabled:opacity-40">
                            {busy ? "Подождите…" : "Далее"}
                        </button>
                    )}
                    {step === "methods" && methods.length > 0 && (
                        <button onClick={requestPin} disabled={busy}
                                className="cursor-pointer h-10 rounded-[10px] border-none bg-[#2f68f5] px-5 text-[13px] font-semibold text-white disabled:opacity-40">
                            {busy ? "Подождите…" : "Получить пин-код"}
                        </button>
                    )}
                    {step === "pin" && (
                        <button onClick={confirmPinAndSign} disabled={busy}
                                className="inline-flex cursor-pointer items-center gap-1.5 h-10 rounded-[10px] border-none bg-[#2f68f5] px-5 text-[13px] font-semibold text-white disabled:opacity-40">
                            {!busy && <CheckCircleIcon className="h-4 w-4"/>}
                            {busy ? "Подписываем…" : "Подтвердить и подписать"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
