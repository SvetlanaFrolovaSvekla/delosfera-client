import {useCallback, useEffect, useRef, useState} from "react";
import {
    qualifiedSigningService,
    type AuthorityList,
} from "@/service/signingService/qualifiedSigningService.ts";
import {formatDate} from "@/utils/dateUtils.ts";

/**
 * Удостоверяющие центры, которым доверяет банк (SIG-02).
 *
 * Пока список пуст, подпись принимается без проверки цепочки: отказывать было бы
 * строже, но тогда до загрузки первого корня нельзя было бы подписать ничего.
 * Об этом сказано прямо — непроверенная подпись не должна выглядеть проверенной.
 *
 * Загрузка первого корня меняет поведение системы, поэтому рядом видно, сколько
 * сертификатов уже закреплено за людьми: часть из них может не пройти новую
 * проверку, и узнать об этом лучше сейчас.
 */

export const CertificateAuthoritiesForm = () => {
    const [состояние, setСостояние] = useState<AuthorityList | null>(null);
    const [название, setНазвание] = useState("");
    const [занято, setЗанято] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);
    const [готово, setГотово] = useState<string | null>(null);
    const файл = useRef<HTMLInputElement>(null);

    const загрузить = useCallback(async () => {
        try {
            setСостояние(await qualifiedSigningService.authorities());
        } catch {
            setОшибка("Не удалось загрузить список удостоверяющих центров");
        }
    }, []);

    useEffect(() => { void загрузить(); }, [загрузить]);

    const добавить = async (file: File) => {
        try {
            setЗанято(true);
            setОшибка(null);
            setГотово(null);

            const base64 = await прочитать(file);
            await qualifiedSigningService.addAuthority(base64, название.trim() || undefined);

            setНазвание("");
            setГотово(`Сертификат «${file.name}» заведён`);
            await загрузить();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось завести сертификат");
        } finally {
            setЗанято(false);
            if (файл.current) файл.current.value = "";
        }
    };

    const переключить = async (id: number, включён: boolean) => {
        try {
            setЗанято(true);
            setОшибка(null);

            if (включён) {
                const причина = window.prompt("Почему снимаете доверие? Причина попадёт в журнал.");
                // Отмена в окне причины — это отказ от действия, а не пустая причина.
                if (причина === null) return;
                await qualifiedSigningService.disableAuthority(id, причина.trim() || undefined);
            } else {
                await qualifiedSigningService.enableAuthority(id);
            }

            await загрузить();
        } catch {
            setОшибка("Не удалось изменить доверие");
        } finally {
            setЗанято(false);
        }
    };

    const центры = состояние?.items ?? [];

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 text-[15px] font-semibold">Доверенные удостоверяющие центры</h2>
            <p className="m-0 mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.7] text-[#8b97ab]">
                По этим корневым сертификатам проверяется, кем выдан сертификат подписанта.
                Системное хранилище сервера намеренно не используется: доверие — решение
                банка, а не свойство образа контейнера.
            </p>

            {состояние && !состояние.trustEnforced && (
                <div className="mt-3 rounded-[9px] border border-[#f0dcae] bg-[#fdf3e0] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#8a5a00]">
                    Ни одного центра не заведено — цепочка сертификатов не проверяется.
                    Подпись принимается и помечается как непроверенная: система не может
                    доказать, кем выдан сертификат.
                </div>
            )}

            {состояние && состояние.registeredCertificates > 0 && !состояние.trustEnforced && (
                <p className="mt-2 text-[12.5px] leading-[1.6] text-[#55617a]">
                    За сотрудниками закреплено сертификатов: {состояние.registeredCertificates}.
                    После загрузки корня они начнут проверяться по цепочке — те, что выданы
                    другим центром, подписывать перестанут.
                </p>
            )}

            {ошибка && (
                <div className="mt-3 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2 text-[12.5px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}
            {готово && (
                <div className="mt-3 rounded-[9px] border border-[#cfe3d6] bg-[#f2f9f5] px-3 py-2 text-[12.5px] text-[#1c7a4d]">
                    {готово}
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">Название центра (необязательно)</span>
                    <input
                        className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                        placeholder="возьмём из самого сертификата"
                        value={название}
                        onChange={(e) => setНазвание(e.target.value)}
                    />
                </label>

                <input
                    ref={файл}
                    type="file"
                    accept=".cer,.crt,.der,.pem"
                    className="hidden"
                    onChange={(e) => {
                        const выбранный = e.target.files?.[0];
                        if (выбранный) void добавить(выбранный);
                    }}
                />

                <button
                    onClick={() => файл.current?.click()}
                    disabled={занято}
                    className="h-10 rounded-[10px] border-none bg-[#2f68f5] px-4 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                    Загрузить сертификат
                </button>
            </div>

            {центры.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-[#f6f8fb] text-left text-[#55617a]">
                                <th className="px-3 py-2.5 font-semibold">Центр</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Вид</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Действует до</th>
                                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Доверие</th>
                                <th className="px-3 py-2.5"/>
                            </tr>
                        </thead>
                        <tbody>
                            {центры.map((c) => (
                                <tr key={c.id} className="border-t border-[#eef2f7] align-top">
                                    <td className="px-3 py-2.5">
                                        <div className="font-semibold text-[#26324a]">{c.title}</div>
                                        <div className="font-mono text-[11px] text-[#a3adbd]">{c.thumbprint}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-[#55617a]">
                                        {c.selfSigned ? "корневой" : "промежуточный"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#55617a]">
                                        {formatDate(c.notAfter)}
                                        {c.expired && <span className="ml-1.5 text-[#c0392b]">истёк</span>}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5">
                                        {c.isActive
                                            ? <span className="text-[#1c7a4d]">доверяем</span>
                                            : <span className="text-[#8b97ab]">
                                                снято{c.disabledReason ? `: ${c.disabledReason}` : ""}
                                            </span>}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                        <button
                                            onClick={() => переключить(c.id, c.isActive)}
                                            disabled={занято}
                                            className="h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#55617a] disabled:opacity-50"
                                        >
                                            {c.isActive ? "Снять доверие" : "Вернуть"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

/**
 * Сертификат приходит файлом в DER или PEM. Читаем как base64 и отдаём серверу
 * как есть: PEM-обёртку он снимет сам, а определять формат на клиенте значило бы
 * гадать по расширению файла.
 */
function прочитать(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Файл не прочитан"));
        reader.onload = () => {
            const результат = String(reader.result);
            const запятая = результат.indexOf(",");
            resolve(запятая >= 0 ? результат.slice(запятая + 1) : результат);
        };

        reader.readAsDataURL(file);
    });
}
