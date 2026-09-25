import {useCallback, useEffect, useState} from "react";
import {
    qualifiedSigningService,
    type SigningSettings,
} from "@/service/signingService/qualifiedSigningService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";

/**
 * Метка времени и проверка отзыва (Б-18).
 *
 * Обе настройки отвечают на вопросы, которые задают через годы, когда сертификат
 * давно истёк: «подпись поставлена, пока сертификат действовал?» и «сертификат к
 * тому моменту не был отозван?». Поэтому здесь же сказано, чего стоит каждый
 * переключатель, и рядом — проверка связи со службой: первым, на кого упадёт
 * неверный адрес, не должен оказаться подписант приказа.
 *
 * Включение метки не действует задним числом. Сколько подписей уже стоит без
 * метки — видно тут же: эти подписи останутся без неё навсегда.
 */

type Черновик = Omit<SigningSettings, "updatedAt" | "signaturesWithoutTimestamp">;

export const SigningSettingsForm = () => {
    const [состояние, setСостояние] = useState<SigningSettings | null>(null);
    const [черновик, setЧерновик] = useState<Черновик | null>(null);
    const [занято, setЗанято] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);
    const [готово, setГотово] = useState<string | null>(null);

    const загрузить = useCallback(async () => {
        try {
            const данные = await qualifiedSigningService.settings();
            setСостояние(данные);
            setЧерновик({
                timestampEnabled: данные.timestampEnabled,
                timestampAuthorityUrl: данные.timestampAuthorityUrl,
                timestampRequired: данные.timestampRequired,
                timestampTimeoutSeconds: данные.timestampTimeoutSeconds,
                revocationCheckEnabled: данные.revocationCheckEnabled,
                revocationStrict: данные.revocationStrict,
                revocationRecheckHours: данные.revocationRecheckHours,
            });
        } catch {
            setОшибка("Не удалось загрузить настройки подписи");
        }
    }, []);

    useEffect(() => { void загрузить(); }, [загрузить]);

    const менять = (часть: Partial<Черновик>) => {
        if (!черновик) return;
        setЧерновик({...черновик, ...часть});
        setГотово(null);
    };

    const сохранить = async () => {
        if (!черновик) return;

        try {
            setЗанято(true);
            setОшибка(null);
            setГотово(null);
            await qualifiedSigningService.saveSettings(черновик);
            setГотово("Настройки сохранены");
            await загрузить();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось сохранить настройки");
        } finally {
            setЗанято(false);
        }
    };

    const проверить = async () => {
        try {
            setЗанято(true);
            setОшибка(null);
            setГотово(null);
            const {at, authority} = await qualifiedSigningService.testTimestamp();
            setГотово(
                `Служба ответила: ${formatDateTime(at)}${authority ? ` · ${authority}` : ""}`);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Проверка не прошла");
        } finally {
            setЗанято(false);
        }
    };

    if (!черновик || !состояние) {
        return (
            <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5 text-[13px] text-[#8b97ab]">
                Загрузка настроек подписи…
            </div>
        );
    }

    const изменено = состояние.timestampEnabled !== черновик.timestampEnabled
        || (состояние.timestampAuthorityUrl ?? "") !== (черновик.timestampAuthorityUrl ?? "")
        || состояние.timestampRequired !== черновик.timestampRequired
        || состояние.timestampTimeoutSeconds !== черновик.timestampTimeoutSeconds
        || состояние.revocationCheckEnabled !== черновик.revocationCheckEnabled
        || состояние.revocationStrict !== черновик.revocationStrict
        || состояние.revocationRecheckHours !== черновик.revocationRecheckHours;

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 text-[15px] font-semibold">Метка времени и отзыв сертификатов</h2>
            <p className="m-0 mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.7] text-[#8b97ab]">
                Сертификат действует несколько лет, документ живёт дольше. Метка времени
                от независимой службы доказывает, что подпись поставлена, пока сертификат
                действовал; проверка отзыва — что к тому моменту его не отозвали.
            </p>

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

            {/* --- метка времени --- */}
            <div className="mt-4 border-t border-[#eef2f7] pt-4">
                <label className="flex items-start gap-2.5">
                    <input type="checkbox" className="mt-0.5 h-4 w-4"
                           checked={черновик.timestampEnabled}
                           onChange={(e) => менять({
                               timestampEnabled: e.target.checked,
                               // Обязательность без самой метки означала бы, что
                               // подписать нельзя ничего — снимаем вместе.
                               timestampRequired: e.target.checked && черновик.timestampRequired,
                           })}/>
                    <span>
                        <span className="text-[13px] font-semibold text-[#26324a]">Ставить метку времени</span>
                        <span className="block text-[12px] leading-[1.6] text-[#8b97ab]">
                            Штампуется свёртка подписи, не документ — служба не видит подписанного
                        </span>
                    </span>
                </label>

                {черновик.timestampEnabled && (
                    <div className="mt-3 flex flex-col gap-3 pl-7">
                        <label className="flex max-w-[520px] flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Адрес службы меток времени</span>
                            <input
                                className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                                placeholder="http://tsa.example.kg/tsp"
                                value={черновик.timestampAuthorityUrl ?? ""}
                                onChange={(e) => менять({timestampAuthorityUrl: e.target.value || null})}
                            />
                        </label>

                        <label className="flex max-w-[200px] flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Ждать ответа, секунд</span>
                            <input
                                type="number" min={3} max={120}
                                className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] tabular-nums outline-none focus:border-[#2f68f5]"
                                value={черновик.timestampTimeoutSeconds}
                                onChange={(e) => менять({timestampTimeoutSeconds: Number(e.target.value)})}
                            />
                        </label>

                        <label className="flex items-start gap-2.5">
                            <input type="checkbox" className="mt-0.5 h-4 w-4"
                                   checked={черновик.timestampRequired}
                                   onChange={(e) => менять({timestampRequired: e.target.checked})}/>
                            <span>
                                <span className="text-[13px] font-semibold text-[#26324a]">
                                    Без метки не подписывать
                                </span>
                                <span className="block text-[12px] leading-[1.6] text-[#8b97ab]">
                                    Служба недоступна — подписать нельзя. Выключено: подпись
                                    принимается и помечается как без метки
                                </span>
                            </span>
                        </label>
                    </div>
                )}

                {состояние.timestampEnabled && (
                    <button onClick={проверить} disabled={занято || изменено}
                            title={изменено ? "Сначала сохраните настройки" : undefined}
                            className="mt-3 ml-7 h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 text-[12.5px] font-semibold text-[#2f68f5] disabled:opacity-50">
                        Проверить связь со службой
                    </button>
                )}
            </div>

            {/* --- отзыв --- */}
            <div className="mt-4 border-t border-[#eef2f7] pt-4">
                <label className="flex items-start gap-2.5">
                    <input type="checkbox" className="mt-0.5 h-4 w-4"
                           checked={черновик.revocationCheckEnabled}
                           onChange={(e) => менять({
                               revocationCheckEnabled: e.target.checked,
                               revocationStrict: e.target.checked && черновик.revocationStrict,
                           })}/>
                    <span>
                        <span className="text-[13px] font-semibold text-[#26324a]">Проверять отзыв сертификата</span>
                        <span className="block text-[12px] leading-[1.6] text-[#8b97ab]">
                            Точки распространения берутся из самого сертификата — их указывает
                            удостоверяющий центр
                        </span>
                    </span>
                </label>

                {черновик.revocationCheckEnabled && (
                    <div className="mt-3 flex flex-col gap-3 pl-7">
                        <label className="flex items-start gap-2.5">
                            <input type="checkbox" className="mt-0.5 h-4 w-4"
                                   checked={черновик.revocationStrict}
                                   onChange={(e) => менять({revocationStrict: e.target.checked})}/>
                            <span>
                                <span className="text-[13px] font-semibold text-[#26324a]">Строгий режим</span>
                                <span className="block text-[12px] leading-[1.6] text-[#8b97ab]">
                                    Не удалось проверить — считать отозванным. Для приказов
                                    правильно, для рядовой визы избыточно
                                </span>
                            </span>
                        </label>

                        <label className="flex max-w-[240px] flex-col gap-1.5">
                            <span className="text-[11.5px] text-[#8b97ab]">Перепроверять раз в, часов</span>
                            <input
                                type="number" min={1} max={720}
                                className="h-10 rounded-[9px] border border-[#e5e9f0] px-3 text-[13px] tabular-nums outline-none focus:border-[#2f68f5]"
                                value={черновик.revocationRecheckHours}
                                onChange={(e) => менять({revocationRecheckHours: Number(e.target.value)})}
                            />
                            <span className="text-[11.5px] leading-[1.5] text-[#8b97ab]">
                                Сертификаты отзывают между подписаниями — система узнаёт об этом
                                сама, не дожидаясь следующей подписи
                            </span>
                        </label>
                    </div>
                )}
            </div>

            {состояние.signaturesWithoutTimestamp > 0 && (
                <div className="mt-4 rounded-[9px] border border-[#e5e9f0] bg-[#f8fafc] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#55617a]">
                    Квалифицированных подписей без метки времени: <b>{состояние.signaturesWithoutTimestamp}</b>.
                    Включение метки не действует задним числом — эти подписи останутся без неё.
                </div>
            )}

            <div className="mt-4 flex items-center gap-3">
                <button onClick={сохранить} disabled={занято || !изменено}
                        className="h-10 rounded-[10px] border-none bg-[#2f68f5] px-4 text-[13px] font-semibold text-white disabled:opacity-40">
                    Сохранить
                </button>
                {состояние.updatedAt && (
                    <span className="text-[12px] text-[#8b97ab]">
                        изменено {formatDateTime(состояние.updatedAt)}
                    </span>
                )}
            </div>
        </div>
    );
};
