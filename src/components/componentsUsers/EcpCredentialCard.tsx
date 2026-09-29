/**
 * Личный кабинет → «Электронная подпись» (ГП «Инфоком»). Идентификация один раз: ПИН → способ получения
 * кода → код из СМС/почты. Сервер проверяет код обменом на токен (2.3) и сохраняет ПИН и код
 * зашифрованно на ограниченный срок; дальше «Согласовать (ЭЦП)» подписывает без повторного ввода.
 * Идентификацию можно в любой момент отозвать.
 */
import {useCallback, useEffect, useState} from "react";
import {infocomEcpService, infocomErrorText, isValidPersonIdnp} from "@/service/infocomEcpService.ts";
import {ecpCredentialService, type EcpCredentialStatus} from "@/service/ecpCredentialService.ts";
import {toast} from "@/service/toastService.ts";

type Step = "idnp" | "code";

const inputCls = "h-9 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[12.5px] font-mono";
const primaryBtn = "cursor-pointer h-9 rounded-[9px] border-none bg-[#2f68f5] px-4 text-[12.5px] font-semibold text-white disabled:opacity-40";
const secondaryBtn = "cursor-pointer h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] text-[#55617a] disabled:opacity-50";

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ru-RU") : "—");

export function EcpCredentialCard() {
    const [status, setStatus] = useState<EcpCredentialStatus | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const [step, setStep] = useState<Step>("idnp");
    const [personIdnp, setPersonIdnp] = useState("");
    const [methods, setMethods] = useState<string[]>([]);
    const [method, setMethod] = useState("sms");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setStatus(await ecpCredentialService.status());
            setLoadError(null);
        } catch (e) {
            setLoadError(infocomErrorText(e, "Не удалось загрузить состояние электронной подписи"));
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const resetForm = () => {
        setFormOpen(false);
        setStep("idnp");
        setPersonIdnp("");
        setMethods([]);
        setCode("");
        setError(null);
    };

    const idnpValid = isValidPersonIdnp(personIdnp);

    const changeIdnp = (value: string) => {
        setPersonIdnp(value.replace(/\D/g, "").slice(0, 14));
        setMethods([]);
        setError(null);
    };

    const loadMethods = async () => {
        if (!idnpValid) { setError("ПИН должен состоять ровно из 14 цифр"); return; }
        setBusy(true);
        setError(null);
        try {
            const {userAuthMethodList} = await infocomEcpService.authMethods(personIdnp);
            const active = userAuthMethodList.filter((m) => m.isActive).map((m) => m.authType);
            const available = active.length > 0 ? active : userAuthMethodList.map((m) => m.authType);
            setMethods(available);
            if (available[0]) setMethod(available[0]);
            if (available.length === 0) setError("Для этого ПИН нет доступных способов получения кода");
        } catch (e) {
            setError(infocomErrorText(e, "Не удалось получить способы получения кода"));
        } finally {
            setBusy(false);
        }
    };

    const requestCode = async () => {
        setBusy(true);
        setError(null);
        try {
            await infocomEcpService.pinCode(personIdnp, method);
            setStep("code");
        } catch (e) {
            setError(infocomErrorText(e, "Не удалось запросить код"));
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        if (!code.trim()) { setError("Введите код"); return; }
        setBusy(true);
        setError(null);
        try {
            setStatus(await ecpCredentialService.save(personIdnp, code.trim()));
            toast.success("Электронная подпись подключена", "Теперь резолюции можно подписывать без повторного ввода ПИН и кода");
            resetForm();
        } catch (e) {
            setError(infocomErrorText(e, "Не удалось сохранить идентификацию"));
        } finally {
            setBusy(false);
        }
    };

    const revoke = async () => {
        setBusy(true);
        try {
            await ecpCredentialService.revoke();
            toast.info("Идентификация отозвана", "При следующем подписании потребуется ПИН и код");
            await load();
        } catch (e) {
            toast.error("Не удалось отозвать идентификацию", infocomErrorText(e, ""));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-6 rounded-[14px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 text-[15px] font-semibold text-[#0f1b2d]">Электронная подпись</h2>
            <p className="m-0 mt-1 text-[12.5px] leading-[1.6] text-[#55617a]">
                Пройдите идентификацию один раз — и резолюции «Согласовать (ЭЦП)» будут подписываться без
                повторного ввода ПИН и кода из СМС/почты.
            </p>

            {loadError && <div className="mt-3 text-[12.5px] text-[#c0392b]">{loadError}</div>}
            {!status && !loadError && <div className="mt-3 text-[12.5px] text-[#8b97ab]">Загрузка…</div>}

            {status && !status.available && (
                <div className="mt-3 rounded-[9px] border border-[#f3dfb0] bg-[#fdf7e8] px-3.5 py-2.5 text-[12.5px] text-[#8a6100]">
                    Сохранение электронной подписи не настроено на сервере: ПИН и код будут запрашиваться при
                    каждом подписании.
                </div>
            )}

            {status?.available && status.enrolled && !formOpen && (
                <div className="mt-3 flex flex-col gap-2 rounded-[10px] border border-[#cfe3d6] bg-[#f2f9f5] px-4 py-3 text-[12.5px] text-[#1c7a4d]">
                    <div className="font-semibold">Идентификация действует</div>
                    <div>ПИН: <span className="font-mono">{status.personIdnpMasked}</span></div>
                    <div>Действует до: {formatDate(status.expiresAt)}</div>
                    <div>Последнее подписание: {formatDate(status.lastUsedAt)}</div>
                    <div className="mt-2 flex gap-2">
                        <button className={secondaryBtn} disabled={busy} onClick={() => setFormOpen(true)}>Пройти заново</button>
                        <button className={secondaryBtn} disabled={busy} onClick={revoke}>Отозвать</button>
                    </div>
                </div>
            )}

            {status?.available && !status.enrolled && !formOpen && (
                <div className="mt-3">
                    <button className={primaryBtn} onClick={() => setFormOpen(true)}>Пройти идентификацию</button>
                    <p className="m-0 mt-2 text-[11.5px] text-[#8b97ab]">
                        Идентификация действует {status.retentionDays} дн. Её можно отозвать в любой момент.
                    </p>
                </div>
            )}

            {status?.available && formOpen && (
                <div className="mt-3 flex max-w-[420px] flex-col gap-3">
                    {error && (
                        <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#c0392b]">
                            {error}
                        </div>
                    )}

                    {step === "idnp" && (
                        <>
                            <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">
                                ПИН (персональный идентификационный номер, 14 цифр)
                                <input className={inputCls} value={personIdnp} inputMode="numeric" autoComplete="off"
                                       maxLength={14} placeholder="00000000000000"
                                       onChange={(e) => changeIdnp(e.target.value)}/>
                            </label>
                            {methods.length > 0 && (
                                <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">Способ получения кода
                                    <select className="h-9 rounded-[8px] border border-[#e5e9f0] px-2.5 text-[12.5px]"
                                            value={method} onChange={(e) => setMethod(e.target.value)}>
                                        {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </label>
                            )}
                            <div className="flex gap-2">
                                <button className={secondaryBtn} disabled={busy} onClick={resetForm}>Отмена</button>
                                {methods.length === 0 ? (
                                    <button className={primaryBtn} disabled={busy || !idnpValid} onClick={loadMethods}>
                                        {busy ? "Подождите…" : "Далее"}
                                    </button>
                                ) : (
                                    <button className={primaryBtn} disabled={busy} onClick={requestCode}>
                                        {busy ? "Подождите…" : "Получить код"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {step === "code" && (
                        <>
                            <p className="m-0 text-[12.5px] text-[#55617a]">Код отправлен ({method}). Введите его ниже.</p>
                            <label className="flex flex-col gap-1 text-[11.5px] text-[#8b97ab]">Код
                                <input className={inputCls} value={code} autoComplete="off" autoFocus
                                       onChange={(e) => setCode(e.target.value)}
                                       onKeyDown={(e) => { if (e.key === "Enter" && !busy) void save(); }}/>
                            </label>
                            <div className="flex gap-2">
                                <button className={secondaryBtn} disabled={busy} onClick={resetForm}>Отмена</button>
                                <button className={primaryBtn} disabled={busy} onClick={save}>
                                    {busy ? "Проверяем…" : "Подтвердить"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
