import {useCallback, useEffect, useState} from "react";
import {
    qualifiedSigningService,
    type MyCertificate,
} from "@/service/signingService/qualifiedSigningService.ts";
import {detectProvider, type ProviderInfo} from "@/service/signingService/cryptoProvider.ts";
import {formatDate, formatDateTime} from "@/utils/dateUtils.ts";

/**
 * Рабочее место квалифицированной подписи (Б-17).
 *
 * Страница отвечает на вопрос «смогу ли я подписать», заданный заранее, а не в
 * момент, когда документ уже лежит на подписи и ждать некогда. Поэтому проверка
 * идёт по шагам и каждый шаг говорит, что делать, если он не пройден.
 *
 * Сертификат закрепляется за сотрудником при первой подписи. Здесь видно, какой
 * именно закреплён и до какого числа он действует: сертификат заканчивается
 * молча, и узнать об этом лучше не в день подписания приказа.
 */

const ОСТАЛОСЬ_ПРЕДУПРЕДИТЬ = 30;

export function SigningWorkplacePage() {
    const [провайдер, setПровайдер] = useState<ProviderInfo | null>(null);
    const [сертификаты, setСертификаты] = useState<MyCertificate[]>([]);
    const [центрыЗаведены, setЦентрыЗаведены] = useState<boolean | null>(null);
    const [занято, setЗанято] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const проверить = useCallback(async () => {
        setЗанято(true);
        setОшибка(null);

        try {
            const [найденный, свои] = await Promise.all([
                detectProvider(),
                qualifiedSigningService.myCertificates(),
            ]);

            setПровайдер(найденный.info);
            setСертификаты(свои);
        } catch {
            setОшибка("Не удалось проверить рабочее место");
        } finally {
            setЗанято(false);
        }

        // Список доверенных центров доступен администратору; рядовому подписанту
        // отказ здесь ничего не говорит — просто не показываем этот шаг.
        try {
            const {trustEnforced} = await qualifiedSigningService.authorities();
            setЦентрыЗаведены(trustEnforced);
        } catch {
            setЦентрыЗаведены(null);
        }
    }, []);

    useEffect(() => { void проверить(); }, [проверить]);

    const действующий = сертификаты.find((c) => !c.revokedAt && !c.expired);

    const днейОсталось = действующий
        ? Math.ceil((new Date(действующий.notAfter).getTime() - Date.now()) / 86_400_000)
        : null;

    return (
        <div className="flex max-w-[980px] flex-col gap-4 p-[22px_26px]">
            <div>
                <div className="text-[12.5px] text-[#8b97ab]">Система</div>
                <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">
                    Рабочее место квалифицированной подписи
                </h1>
                <p className="m-0 mt-1.5 max-w-[70ch] text-[13px] leading-[1.7] text-[#55617a]">
                    Проверка готовности подписывать. Закрытый ключ остаётся на вашем
                    компьютере: система отдаёт отпечаток документа, подписывает его
                    криптопровайдер, а обратно приходят только подпись и сертификат.
                </p>
            </div>

            {ошибка && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}

            <section className="flex flex-col gap-2.5">
                <Шаг
                    номер={1}
                    заголовок="Криптопровайдер"
                    состояние={занято ? "ждём" : провайдер?.ready ? "готово" : "внимание"}
                    описание={занято
                        ? "Ищем средство электронной подписи на рабочем месте…"
                        : провайдер?.ready
                            ? `${провайдер.title} отвечает`
                            : провайдер?.reason ?? "Средство электронной подписи не найдено"}
                    подсказка={!занято && !провайдер?.ready
                        ? "Подписать всё равно можно: в окне подписания есть ручной путь — " +
                          "скопировать отпечаток, подписать его своей утилитой и приложить результат."
                        : undefined}
                />

                <Шаг
                    номер={2}
                    заголовок="Ваш сертификат"
                    состояние={занято ? "ждём" : действующий ? "готово" : "внимание"}
                    описание={занято
                        ? "Проверяем…"
                        : действующий
                            ? `${действующий.subject} · действует до ${formatDate(действующий.notAfter)}`
                            : сертификаты.length > 0
                                ? "Все закреплённые за вами сертификаты отозваны или просрочены"
                                : "Сертификат ещё не закреплён — он закрепится сам при первой подписи"}
                    подсказка={днейОсталось !== null && днейОсталось <= ОСТАЛОСЬ_ПРЕДУПРЕДИТЬ
                        ? `До окончания срока ${днейОсталось} дн. — пора обращаться в удостоверяющий центр.`
                        : undefined}
                />

                {центрыЗаведены !== null && (
                    <Шаг
                        номер={3}
                        заголовок="Доверенные удостоверяющие центры"
                        состояние={центрыЗаведены ? "готово" : "внимание"}
                        описание={центрыЗаведены
                            ? "Заведены — цепочка сертификата проверяется до корня"
                            : "Не заведены — цепочка не проверяется, подпись помечается как непроверенная"}
                        подсказка={центрыЗаведены
                            ? undefined
                            : "Пока корневой сертификат УЦ не загружен в разделе «Система», подпись " +
                              "принимается, но доказать, кем выдан сертификат, система не может."}
                    />
                )}
            </section>

            {сертификаты.length > 0 && (
                <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                    <h2 className="m-0 text-[15px] font-semibold">Закреплённые за вами сертификаты</h2>
                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#f6f8fb] text-left text-[#55617a]">
                                    <th className="px-3 py-2.5 font-semibold">Кому выдан</th>
                                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Кем выдан</th>
                                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Действует до</th>
                                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Закреплён</th>
                                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Состояние</th>
                                </tr>
                            </thead>
                            <tbody>
                                {сертификаты.map((c) => (
                                    <tr key={c.id} className="border-t border-[#eef2f7] align-top">
                                        <td className="px-3 py-2.5 text-[#26324a]">{c.subject}</td>
                                        <td className="px-3 py-2.5 text-[#55617a]">{c.issuer}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#55617a]">
                                            {formatDate(c.notAfter)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#8b97ab]">
                                            {formatDateTime(c.registeredAt)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5">
                                            {c.revokedAt
                                                ? <span className="text-[#c0392b]">отозван{c.revokedReason ? `: ${c.revokedReason}` : ""}</span>
                                                : c.expired
                                                    ? <span className="text-[#b3730a]">срок истёк</span>
                                                    : <span className="text-[#1c7a4d]">действует</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <div>
                <button onClick={проверить} disabled={занято}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#2f68f5] disabled:opacity-50">
                    Проверить заново
                </button>
            </div>
        </div>
    );
}

interface ШагProps {
    номер: number;
    заголовок: string;
    состояние: "готово" | "внимание" | "ждём";
    описание: string;
    подсказка?: string;
}

const Шаг = ({номер, заголовок, состояние, описание, подсказка}: ШагProps) => {
    const цвет = состояние === "готово"
        ? {граница: "#cfe3d6", фон: "#f2f9f5", текст: "#1c7a4d", знак: "✓"}
        : состояние === "внимание"
            ? {граница: "#f0dcae", фон: "#fdf3e0", текст: "#8a5a00", знак: "!"}
            : {граница: "#e5e9f0", фон: "#f8fafc", текст: "#8b97ab", знак: "…"};

    return (
        <div className="flex items-start gap-3 rounded-[10px] border p-4"
             style={{borderColor: цвет.граница, background: цвет.фон}}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                 style={{background: "#fff", color: цвет.текст, border: `1px solid ${цвет.граница}`}}>
                {цвет.знак}
            </div>
            <div className="flex flex-col gap-1">
                <div className="text-[13.5px] font-semibold text-[#26324a]">
                    {номер}. {заголовок}
                </div>
                <div className="text-[12.5px] leading-[1.6]" style={{color: цвет.текст}}>{описание}</div>
                {подсказка && (
                    <div className="text-[12.5px] leading-[1.6] text-[#55617a]">{подсказка}</div>
                )}
            </div>
        </div>
    );
};
