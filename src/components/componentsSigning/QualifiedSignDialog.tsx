import {useCallback, useEffect, useState} from "react";
import {
    qualifiedSigningService,
    type SignChallenge,
    type SignatureInfo,
} from "@/service/signingService/qualifiedSigningService.ts";
import {
    detectProvider,
    type CertificateChoice,
    type CryptoProvider,
} from "@/service/signingService/cryptoProvider.ts";

/**
 * Подписание квалифицированной подписью (SIG-02).
 *
 * Окно устроено вокруг одного вопроса: что именно подписывается. Сначала человек
 * видит документ и его отпечаток, и только потом — кнопку. Отпечаток показан
 * целиком не для красоты: подписывается именно он, и при разбирательстве
 * сверяют его.
 *
 * Когда плагина на рабочем месте нет, окно не закрывается с отказом, а
 * переключается на ручной путь: хеш копируется, подпись приносится файлом.
 * Это медленно и неудобно ровно настолько, чтобы плагин поставили, — но
 * подписать документ можно уже сегодня.
 */

interface Props {
    /** Подписывается карточка документа — обычный случай для этапа маршрута. */
    documentId?: number;

    /** Либо отдельное вложение. */
    attachmentId?: number;

    onSigned: (signature: SignatureInfo) => void;
    onClose: () => void;
}

export const QualifiedSignDialog = ({documentId, attachmentId, onSigned, onClose}: Props) => {
    const [вызов, setВызов] = useState<SignChallenge | null>(null);
    const [провайдер, setПровайдер] = useState<CryptoProvider | null>(null);
    const [сертификаты, setСертификаты] = useState<CertificateChoice[]>([]);
    const [выбран, setВыбран] = useState<number>(0);
    const [занято, setЗанято] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);

    // Ручной путь: подпись и сертификат приносят текстом.
    const [вручную, setВручную] = useState(false);
    const [подписьТекстом, setПодписьТекстом] = useState("");
    const [сертификатТекстом, setСертификатТекстом] = useState("");
    const [скопировано, setСкопировано] = useState(false);

    const загрузить = useCallback(async () => {
        try {
            setЗанято(true);
            setОшибка(null);

            const данные = documentId
                ? await qualifiedSigningService.documentChallenge(documentId)
                : await qualifiedSigningService.attachmentChallenge(attachmentId!);
            setВызов(данные);

            const найденный = await detectProvider();
            setПровайдер(найденный);

            if (найденный.info.kind === "manual") {
                setВручную(true);
            } else {
                try {
                    setСертификаты(await найденный.listCertificates());
                } catch (e) {
                    // Провайдер есть, но сертификаты не отдал: токен не вставлен либо
                    // человек закрыл окно ввода PIN. Это не повод закрывать подписание.
                    setОшибка(текстОшибки(e, "Не удалось получить список сертификатов"));
                }
            }
        } catch (e) {
            setОшибка(текстОшибки(e, "Не удалось подготовить данные для подписи"));
        } finally {
            setЗанято(false);
        }
    }, [documentId, attachmentId]);

    useEffect(() => { void загрузить(); }, [загрузить]);

    const подписатьПлагином = async () => {
        if (!провайдер || !вызов) return;

        try {
            setЗанято(true);
            setОшибка(null);

            const {signature, certificate} = await провайдер.sign(вызов.dataToSign, сертификаты[выбран]);
            await отправить(signature, certificate);
        } catch (e) {
            setОшибка(текстОшибки(e, "Подписать не удалось"));
            setЗанято(false);
        }
    };

    const подписатьВручную = async () => {
        if (!подписьТекстом.trim() || !сертификатТекстом.trim()) {
            setОшибка("Нужны и подпись, и сертификат — без сертификата подпись не проверить");
            return;
        }

        try {
            setЗанято(true);
            setОшибка(null);
            await отправить(очистить(подписьТекстом), очистить(сертификатТекстом));
        } catch (e) {
            setОшибка(текстОшибки(e, "Подпись не принята"));
            setЗанято(false);
        }
    };

    const отправить = async (signature: string, certificate: string) => {
        const результат = documentId
            ? await qualifiedSigningService.signDocument(documentId, signature, certificate)
            : await qualifiedSigningService.signAttachment(attachmentId!, signature, certificate);

        onSigned(результат);
    };

    /**
     * Копирует данные для подписи в буфер обмена.
     *
     * Через navigator.clipboard — там, где он есть. Браузер отдаёт его только
     * на защищённых страницах, а стенд открывается по http: там обращение
     * упало бы, и кнопка перестала бы работать молча, посреди подписания.
     *
     * Запасной путь — выделить и скопировать старым способом. Он работает
     * везде, потому и остаётся про запас.
     */
    const скопироватьХеш = async () => {
        if (!вызов) return;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(вызов.dataToSign);
            } else {
                const поле = document.createElement("textarea");
                поле.value = вызов.dataToSign;
                поле.setAttribute("readonly", "");
                поле.style.position = "fixed";
                поле.style.opacity = "0";
                document.body.appendChild(поле);
                поле.select();
                document.execCommand("copy");
                document.body.removeChild(поле);
            }

            setСкопировано(true);
            setTimeout(() => setСкопировано(false), 2000);
        } catch {
            // Скопировать не вышло — не беда: строка видна на экране и её
            // можно выделить руками. Прерывать подписание из-за этого нельзя.
            setСкопировано(false);
        }
    };

    const поле = "w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[12px] font-mono outline-none focus:border-[#2f68f5]";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
             role="dialog" aria-modal="true" aria-label="Подписание квалифицированной подписью">
            <div className="flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-y-auto rounded-[14px] bg-white p-6 shadow-xl">
                <h2 className="m-0 text-[17px] font-semibold text-[#0f1b2d]">
                    Подписание квалифицированной подписью
                </h2>

                {вызов && (
                    <>
                        <p className="m-0 mt-1.5 text-[13px] text-[#55617a]">{вызов.fileName}</p>

                        <div className="mt-4 rounded-[10px] border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                            <div className="text-[11.5px] text-[#8b97ab]">
                                Отпечаток ({вызов.hashAlgorithm}) — подписывается именно он
                            </div>
                            <div className="mt-1 break-all font-mono text-[11.5px] leading-[1.6] text-[#26324a]">
                                {вызов.hash}
                            </div>
                        </div>
                    </>
                )}

                {провайдер && (
                    <div className={`mt-3 rounded-[9px] border px-3 py-2.5 text-[12.5px] leading-[1.6] ${
                        провайдер.info.ready
                            ? "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]"
                            : "border-[#f0dcae] bg-[#fdf3e0] text-[#8a5a00]"}`}>
                        <b>{провайдер.info.title}</b>
                        {провайдер.info.reason && <div className="mt-0.5">{провайдер.info.reason}</div>}
                    </div>
                )}

                {ошибка && (
                    <div className="mt-3 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#c0392b]">
                        {ошибка}
                    </div>
                )}

                {!вручную && сертификаты.length > 0 && (
                    <label className="mt-4 flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Чем подписать</span>
                        <select className="h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                                value={выбран} onChange={(e) => setВыбран(Number(e.target.value))}>
                            {сертификаты.map((c, i) => (
                                <option key={`${c.certificate.slice(0, 24)}-${i}`} value={i}>
                                    {c.subject}{c.validTo ? ` · до ${c.validTo}` : ""}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {вручную && вызов && (
                    <div className="mt-4 flex flex-col gap-3">
                        <div className="rounded-[10px] border border-[#e5e9f0] bg-white p-4">
                            <div className="text-[12.5px] font-semibold text-[#26324a]">Как подписать вручную</div>
                            <ol className="m-0 mt-2 flex list-decimal flex-col gap-1 pl-5 text-[12.5px] leading-[1.65] text-[#55617a]">
                                <li>Скопируйте отпечаток в кодировке base64 кнопкой ниже.</li>
                                <li>Подпишите его своей утилитой (SHA-256, без повторного хеширования).</li>
                                <li>Вставьте сюда подпись и свой сертификат в base64.</li>
                            </ol>
                            <button onClick={скопироватьХеш}
                                    className="mt-3 h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#2f68f5]">
                                {скопировано ? "Скопировано" : "Скопировать base64"}
                            </button>
                        </div>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Подпись, base64</span>
                            <textarea className={поле} rows={3} value={подписьТекстом}
                                      onChange={(e) => setПодписьТекстом(e.target.value)}/>
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Сертификат, base64 или PEM</span>
                            <textarea className={поле} rows={4} value={сертификатТекстом}
                                      onChange={(e) => setСертификатТекстом(e.target.value)}/>
                        </label>
                    </div>
                )}

                {!вручную && провайдер?.info.ready && (
                    <button onClick={() => setВручную(true)}
                            className="mt-3 self-start border-none bg-transparent p-0 text-[12.5px] text-[#2f68f5] underline">
                        Подписать вручную
                    </button>
                )}

                <div className="mt-5 flex justify-end gap-2.5">
                    <button onClick={onClose} disabled={занято}
                            className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] text-[#55617a] disabled:opacity-50">
                        Отмена
                    </button>
                    <button onClick={вручную ? подписатьВручную : подписатьПлагином}
                            disabled={занято || (!вручную && !провайдер?.info.ready)}
                            className="h-10 rounded-[10px] border-none bg-[#2f68f5] px-5 text-[13px] font-semibold text-white disabled:opacity-40">
                        {занято ? "Подождите…" : "Подписать"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/** Сообщение сервера полезнее нашего: в нём сказано, какая именно проверка не прошла. */
function текстОшибки(e: unknown, запасное: string): string {
    const ответ = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
    if (ответ) return ответ;

    const сообщение = (e as {message?: string}).message;
    return сообщение && сообщение !== "Network Error" ? сообщение : запасное;
}

function очистить(value: string): string {
    return value
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s+/g, "")
        .trim();
}
