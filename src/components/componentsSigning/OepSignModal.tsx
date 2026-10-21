import {useState} from "react";
import {
    oepSigningService,
    type OepAuthMethod,
    type OepSignResult,
    type OepSubjectRef,
} from "@/service/signingService/oepSigningService.ts";

/**
 * Подписание облачной ЭП ГП «Инфоком» (ОЭП, INT-03).
 *
 * Шаги: ПИН физлица (и ИНН для представителя юрлица) → метод доставки кода
 * (SMS/email) → ввод кода → подпись. Закрытый ключ в облаке УЦ, на сервер не
 * передаётся; сюда возвращается только идентификатор поставленной подписи.
 */

interface Props {
    documentId?: number;
    attachmentId?: number;
    fileName?: string;
    onSigned: (result: OepSignResult) => void;
    onClose: () => void;
}

type Step = "subject" | "method" | "pin";

const input = "h-9 w-full px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] " +
    "outline-none focus:border-[#2f68f5]";

const methodTitle = (m: string | null) =>
    m === "sms" ? "СМS на телефон" : m === "email" ? "Письмо на e-mail" : (m ?? "—");

export const OepSignModal = ({documentId, attachmentId, fileName, onSigned, onClose}: Props) => {
    const [step, setStep] = useState<Step>("subject");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [personIdnp, setPersonIdnp] = useState("");
    const [organizationInn, setOrganizationInn] = useState("");
    const [methods, setMethods] = useState<OepAuthMethod[]>([]);
    const [method, setMethod] = useState<string>("");
    const [pinSent, setPinSent] = useState(false);
    const [pin, setPin] = useState("");

    const ref = (): OepSubjectRef => ({
        personIdnp: personIdnp.trim() || undefined,
        organizationInn: organizationInn.trim() || undefined,
    });

    const run = async (fn: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (e) {
            setError(extractError(e));
        } finally {
            setBusy(false);
        }
    };

    const loadMethods = () => run(async () => {
        if (!personIdnp.trim() && !organizationInn.trim()) {
            setError("Укажите ПИН физлица или ИНН организации");
            return;
        }
        const res = await oepSigningService.authMethods(ref());
        if (res.isActive === false) {
            setError(`Учётная запись неактивна${res.inactiveReason ? `: ${res.inactiveReason}` : ""}`);
            return;
        }
        const active = res.userAuthMethodList.filter((m) => m.isActive);
        if (active.length === 0) {
            setError("Нет доступных методов авторизации для этой учётной записи");
            return;
        }
        setMethods(active);
        setMethod(active[0].authType ?? "");
        setStep("method");
    });

    const sendPin = () => run(async () => {
        await oepSigningService.sendPin(ref(), method);
        setPinSent(true);
        setStep("pin");
    });

    const sign = () => run(async () => {
        if (!pin.trim()) {
            setError("Введите код");
            return;
        }
        const result = documentId
            ? await oepSigningService.signDocument(documentId, ref(), pin.trim())
            : await oepSigningService.signAttachment(attachmentId!, ref(), pin.trim());
        onSigned(result);
    });

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-[440px] rounded-[14px] border border-[#e5e9f0] bg-white p-5 shadow-xl"
                 onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="m-0 text-[16px] font-semibold text-[#0f1b2d]">Облачная ЭП (ОЭП)</h3>
                        <p className="mt-1 text-[12.5px] text-[#8b97ab]">
                            Подпись ГП «Инфоком» по пин-коду{fileName ? ` · ${fileName}` : ""}
                        </p>
                    </div>
                    <button onClick={onClose}
                            className="grid h-7 w-7 flex-none place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#f0f3f8]">
                        ✕
                    </button>
                </div>

                {/* индикатор шага */}
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium">
                    {(["subject", "method", "pin"] as Step[]).map((s, i) => (
                        <span key={s}
                              className="flex items-center gap-1.5"
                              style={{color: step === s ? "#2f68f5" : "#a3adbd"}}>
                            <span className="grid h-5 w-5 place-items-center rounded-full text-white"
                                  style={{background: step === s ? "#2f68f5" : "#c7d2e2"}}>{i + 1}</span>
                            {s === "subject" ? "Кто" : s === "method" ? "Код" : "Подпись"}
                            {i < 2 && <span className="text-[#c7d2e2]">→</span>}
                        </span>
                    ))}
                </div>

                {error && (
                    <div className="mt-3 rounded-[9px] border border-[#f3c9c9] bg-[#fdf0f0] px-3 py-2 text-[12.5px] text-[#b5352f]">
                        {error}
                    </div>
                )}

                {step === "subject" && (
                    <div className="mt-3 flex flex-col gap-2.5">
                        <label className="text-[12.5px] text-[#55617a]">
                            ПИН физлица
                            <input className={`${input} mt-1`} value={personIdnp} inputMode="numeric"
                                   placeholder="напр. 20101200100111"
                                   onChange={(e) => setPersonIdnp(e.target.value)}/>
                        </label>
                        <label className="text-[12.5px] text-[#55617a]">
                            ИНН организации <span className="text-[#a3adbd]">(для представителя юрлица)</span>
                            <input className={`${input} mt-1`} value={organizationInn} inputMode="numeric"
                                   placeholder="необязательно"
                                   onChange={(e) => setOrganizationInn(e.target.value)}/>
                        </label>
                        <button onClick={loadMethods} disabled={busy}
                                className="mt-1 h-9 rounded-[9px] bg-[#2f68f5] text-white text-[13px] font-semibold hover:brightness-[1.06] disabled:opacity-50">
                            {busy ? "Проверяем…" : "Продолжить"}
                        </button>
                    </div>
                )}

                {step === "method" && (
                    <div className="mt-3 flex flex-col gap-2.5">
                        <div className="text-[12.5px] text-[#55617a]">Куда отправить код подтверждения:</div>
                        <div className="flex flex-col gap-1.5">
                            {methods.map((m) => (
                                <label key={m.authType}
                                       className="flex items-center gap-2 rounded-[9px] border px-3 py-2 cursor-pointer"
                                       style={{borderColor: method === m.authType ? "#2f68f5" : "#e5e9f0",
                                               background: method === m.authType ? "#f5f8ff" : "#fff"}}>
                                    <input type="radio" name="oep-method" checked={method === m.authType}
                                           onChange={() => setMethod(m.authType ?? "")}/>
                                    <span className="text-[13px] text-[#1c2740]">{methodTitle(m.authType)}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setStep("subject")} disabled={busy}
                                    className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#55617a] hover:bg-[#f6f8fb]">
                                Назад
                            </button>
                            <button onClick={sendPin} disabled={busy || !method}
                                    className="h-9 flex-1 rounded-[9px] bg-[#2f68f5] text-white text-[13px] font-semibold hover:brightness-[1.06] disabled:opacity-50">
                                {busy ? "Отправляем…" : "Отправить код"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "pin" && (
                    <div className="mt-3 flex flex-col gap-2.5">
                        <div className="text-[12.5px] text-[#55617a]">
                            {pinSent
                                ? `Код отправлен (${methodTitle(method)}). Введите его:`
                                : "Введите код подтверждения:"}
                        </div>
                        <input className={input} value={pin} inputMode="numeric" autoFocus
                               placeholder="Код из SMS / письма"
                               onChange={(e) => setPin(e.target.value)}
                               onKeyDown={(e) => { if (e.key === "Enter" && !busy) void sign(); }}/>
                        <div className="flex gap-2">
                            <button onClick={() => void sendPin()} disabled={busy}
                                    className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12.5px] text-[#55617a] hover:bg-[#f6f8fb]">
                                Выслать заново
                            </button>
                            <button onClick={sign} disabled={busy}
                                    className="h-9 flex-1 rounded-[9px] bg-[#1c7a4d] text-white text-[13px] font-semibold hover:brightness-[1.06] disabled:opacity-50">
                                {busy ? "Подписываем…" : "Подписать"}
                            </button>
                        </div>
                        <p className="text-[11.5px] text-[#a3adbd]">
                            Код действует ограниченное время. Закрытый ключ остаётся в облаке УЦ.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

function extractError(e: unknown): string {
    if (e && typeof e === "object" && "response" in e) {
        const r = (e as {response?: {data?: {message?: string}}}).response;
        if (r?.data?.message) return r.data.message;
    }
    return "Не удалось выполнить операцию. Повторите попытку.";
}
