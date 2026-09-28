import {useState} from "react";
import {infocomEcpService, infocomErrorText} from "@/service/infocomEcpService.ts";

/**
 * Dev/test-страница ЭЦП ГП «Инфоком» (тестовый контур). Не для продакшена — минимальный UI,
 * чтобы руками прогнать все 6 методов по отдельности (см. документацию провайдера, раздел 2)
 * без похода в Postman: поля ввода с мок-данными из документации, кнопка шлёт запрос на
 * delosfera-server (/api/signing/infocom/*), результат/ошибка показываются под кнопкой.
 *
 * Полный пользовательский флоу (метод → пин → токен → подпись) собран отдельно в EcpSignModal —
 * там же он используется в резолюции "Согласовать" на этапе ВНД.
 */

type ResultState = { kind: "success"; data: unknown } | { kind: "error"; message: string } | null;

function ResultBlock({result}: { result: ResultState }) {
    if (!result) return null;
    if (result.kind === "error") {
        return (
            <div className="mt-2 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#c0392b]">
                {result.message}
            </div>
        );
    }
    return (
        <pre className="mt-2 max-h-64 overflow-auto rounded-[9px] border border-[#cfe3d6] bg-[#f2f9f5] px-3 py-2.5 text-[11.5px] leading-[1.5] text-[#1c7a4d]">
            {JSON.stringify(result.data, null, 2)}
        </pre>
    );
}

const inputCls = "h-9 w-full rounded-[8px] border border-[#e5e9f0] bg-white px-2.5 text-[12.5px] font-mono outline-none focus:border-[#2f68f5]";
const labelCls = "flex flex-col gap-1 text-[11.5px] text-[#8b97ab]";
const cardCls = "rounded-[14px] border border-[#e9edf3] bg-white p-5";
const buttonCls = "h-9 rounded-[9px] border-none bg-[#2f68f5] px-4 text-[12.5px] font-semibold text-white disabled:opacity-40";

export const EcpTestPage = () => {
    // ПИН вводится вручную (в плейсхолдере — пример из документации ГП Инфоком). ИНН организации
    // не нужен: по документации он "не обязателен для физ. лица", backend его не отправляет.
    const [personIdnp, setPersonIdnp] = useState("");
    const [method, setMethod] = useState("sms");
    const [byPin, setByPin] = useState("123456");
    const [userToken, setUserToken] = useState("");
    const [hash, setHash] = useState("3FBCE39F6274CBE69D9A843C8CB04C0B9E43776E2D6A6C17C9948C81017B92F0");
    const [signBase64, setSignBase64] = useState("");

    const [loading, setLoading] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, ResultState>>({});

    const run = async (key: string, action: () => Promise<unknown>) => {
        setLoading(key);
        setResults((prev) => ({...prev, [key]: null}));
        try {
            const data = await action();
            setResults((prev) => ({...prev, [key]: {kind: "success", data}}));
        } catch (e) {
            setResults((prev) => ({...prev, [key]: {kind: "error", message: infocomErrorText(e, "Запрос не выполнен")}}));
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="mx-auto flex max-w-[720px] flex-col gap-4 p-6">
            <div>
                <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">ЭЦП ГП «Инфоком» — тестовая страница</h1>
                <p className="m-0 mt-1 text-[12.5px] text-[#55617a]">
                    Тестовый контур (cdsapi-test.srs.kg). Запросы идут через delosfera-server → delosfera-ecp-service.
                    Реального токена доступа к ГП Инфоком в этой среде может не быть — ошибка сети/401 здесь ожидаема.
                </p>
            </div>

            {/* 2.1 */}
            <div className={cardCls}>
                <div className="text-[13.5px] font-semibold text-[#1c2740]">2.1 Получение метода авторизации</div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                    <label className={labelCls}>personIdnp (ПИН, 14 цифр)
                        <input className={inputCls} value={personIdnp} inputMode="numeric" maxLength={14}
                               placeholder="20101200100111"
                               onChange={(e) => setPersonIdnp(e.target.value.replace(/\D/g, ""))}/>
                    </label>
                </div>
                <button className={`${buttonCls} mt-3`} disabled={loading === "authMethods"}
                        onClick={() => run("authMethods", () => infocomEcpService.authMethods(personIdnp))}>
                    {loading === "authMethods" ? "Отправка…" : "Отправить"}
                </button>
                <ResultBlock result={results.authMethods ?? null}/>
            </div>

            {/* 2.2 */}
            <div className={cardCls}>
                <div className="text-[13.5px] font-semibold text-[#1c2740]">2.2 Запрос на отправку пин-кода</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className={labelCls}>personIdnp (ПИН, 14 цифр)
                        <input className={inputCls} value={personIdnp} inputMode="numeric" maxLength={14}
                               placeholder="20101200100111"
                               onChange={(e) => setPersonIdnp(e.target.value.replace(/\D/g, ""))}/>
                    </label>
                    <label className={labelCls}>method (sms / email)
                        <input className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}/>
                    </label>
                </div>
                <button className={`${buttonCls} mt-3`} disabled={loading === "pinCode"}
                        onClick={() => run("pinCode", () => infocomEcpService.pinCode(personIdnp, method))}>
                    {loading === "pinCode" ? "Отправка…" : "Отправить"}
                </button>
                <ResultBlock result={results.pinCode ?? null}/>
            </div>

            {/* 2.3 */}
            <div className={cardCls}>
                <div className="text-[13.5px] font-semibold text-[#1c2740]">2.3 Получение токена доступа</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className={labelCls}>personIdnp (ПИН, 14 цифр)
                        <input className={inputCls} value={personIdnp} inputMode="numeric" maxLength={14}
                               placeholder="20101200100111"
                               onChange={(e) => setPersonIdnp(e.target.value.replace(/\D/g, ""))}/>
                    </label>
                    <label className={labelCls}>byPin
                        <input className={inputCls} value={byPin} onChange={(e) => setByPin(e.target.value)}/>
                    </label>
                </div>
                <button className={`${buttonCls} mt-3`} disabled={loading === "token"}
                        onClick={() => run("token", async () => {
                            const data = await infocomEcpService.token(personIdnp, byPin);
                            if (data.token) setUserToken(data.token); // подставляем в 2.4/2.5 автоматически
                            return data;
                        })}>
                    {loading === "token" ? "Отправка…" : "Отправить"}
                </button>
                <ResultBlock result={results.token ?? null}/>
            </div>

            {/* 2.4 */}
            <div className={cardCls}>
                <div className="text-[13.5px] font-semibold text-[#1c2740]">2.4 Сведения о сертификате по токену</div>
                <label className={`${labelCls} mt-3`}>userToken (живёт ~1 минуту после 2.3)
                    <input className={inputCls} value={userToken} onChange={(e) => setUserToken(e.target.value)}/>
                </label>
                <button className={`${buttonCls} mt-3`} disabled={loading === "certInfo"}
                        onClick={() => run("certInfo", () => infocomEcpService.certInfo(userToken))}>
                    {loading === "certInfo" ? "Отправка…" : "Отправить"}
                </button>
                <ResultBlock result={results.certInfo ?? null}/>
            </div>

            {/* 2.5 */}
            <div className={cardCls}>
                <div className="text-[13.5px] font-semibold text-[#1c2740]">2.5 Подписание хэша</div>
                <div className="mt-3 flex flex-col gap-3">
                    <label className={labelCls}>hash (SHA-256, hex)
                        <input className={inputCls} value={hash} onChange={(e) => setHash(e.target.value)}/>
                    </label>
                    <label className={labelCls}>userToken
                        <input className={inputCls} value={userToken} onChange={(e) => setUserToken(e.target.value)}/>
                    </label>
                </div>
                <button className={`${buttonCls} mt-3`} disabled={loading === "signHash"}
                        onClick={() => run("signHash", async () => {
                            const data = await infocomEcpService.signHash(hash, userToken);
                            if (data.sign) setSignBase64(data.sign); // подставляем в 2.6 автоматически
                            return data;
                        })}>
                    {loading === "signHash" ? "Отправка…" : "Отправить"}
                </button>
                <ResultBlock result={results.signHash ?? null}/>
            </div>

            {/* 2.6 */}
            <div className={cardCls}>
                <div className="text-[13.5px] font-semibold text-[#1c2740]">2.6 Проверка подписи</div>
                <div className="mt-3 flex flex-col gap-3">
                    <label className={labelCls}>signBase64
                        <textarea className={`${inputCls} h-16`} value={signBase64} onChange={(e) => setSignBase64(e.target.value)}/>
                    </label>
                    <label className={labelCls}>hash
                        <input className={inputCls} value={hash} onChange={(e) => setHash(e.target.value)}/>
                    </label>
                </div>
                <button className={`${buttonCls} mt-3`} disabled={loading === "checkSign"}
                        onClick={() => run("checkSign", () => infocomEcpService.checkSign(signBase64, hash))}>
                    {loading === "checkSign" ? "Отправка…" : "Отправить"}
                </button>
                <ResultBlock result={results.checkSign ?? null}/>
            </div>
        </div>
    );
};
