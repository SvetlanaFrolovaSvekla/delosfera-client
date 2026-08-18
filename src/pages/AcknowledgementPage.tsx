import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    acknowledgementService,
    ackDocumentPath,
    ACK_STATE_LABEL,
    type MyAck,
} from "@/service/acknowledgementService/acknowledgementService.ts";
import {RegulationConsentGate} from "@/components/signing/RegulationConsentGate.tsx";
import {formatDate, formatDateTime} from "@/utils/dateUtils.ts";

/**
 * Ознакомление с документами (Б-19).
 *
 * Страница отвечает сотруднику на один вопрос: что я обязан прочитать. Поэтому
 * сверху — то, что ждёт ответа, а отвеченное убрано под переключатель: оно не
 * исчезает совсем, потому что «я это уже читал» тоже надо чем-то подтвердить.
 *
 * Ознакомление подписывается простой электронной подписью по тем же правилам, что
 * виза на маршруте. Отсюда согласие с регламентом — без него сервер подписывать
 * откажется, и человек упрётся в отказ в самый неподходящий момент.
 *
 * Отказ требует причины и спрашивается отдельным полем: отказ от ознакомления —
 * законное действие, а не ошибка, и прятать его нельзя.
 */

export function AcknowledgementPage() {
    const navigate = useNavigate();

    const [список, setСписок] = useState<MyAck[]>([]);
    const [показыватьОтвеченные, setПоказыватьОтвеченные] = useState(false);
    const [занято, setЗанято] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);
    const [готово, setГотово] = useState<string | null>(null);

    /** Открыт отказ по этой строке — показываем поле причины. */
    const [отказПо, setОтказПо] = useState<number | null>(null);
    const [причина, setПричина] = useState("");

    const загрузить = useCallback(async () => {
        try {
            setЗанято(true);
            setОшибка(null);
            setСписок(await acknowledgementService.mine(показыватьОтвеченные));
        } catch {
            setОшибка("Не удалось загрузить список документов для ознакомления");
        } finally {
            setЗанято(false);
        }
    }, [показыватьОтвеченные]);

    useEffect(() => { void загрузить(); }, [загрузить]);

    const ознакомиться = async (строка: MyAck) => {
        try {
            setЗанято(true);
            setОшибка(null);
            setГотово(null);
            await acknowledgementService.acknowledge(строка.id);
            setГотово(`Ознакомление зафиксировано: ${строка.documentTitle}`);
            await загрузить();
        } catch (e) {
            // Сервер отказывает по существу — не принят регламент подписи, документ
            // изменился. Общее «не удалось» спрятало бы причину.
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось зафиксировать ознакомление");
        } finally {
            setЗанято(false);
        }
    };

    const отказаться = async (строка: MyAck) => {
        if (!причина.trim()) {
            setОшибка("У отказа должна быть причина — без неё его нечего обсуждать");
            return;
        }

        try {
            setЗанято(true);
            setОшибка(null);
            setГотово(null);
            await acknowledgementService.refuse(строка.id, причина.trim());
            setОтказПо(null);
            setПричина("");
            setГотово("Отказ зафиксирован, кадровая служба уведомлена");
            await загрузить();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось зафиксировать отказ");
        } finally {
            setЗанято(false);
        }
    };

    const ждут = список.filter((x) => x.state === "Pending");
    const просрочены = ждут.filter((x) => x.overdue);

    return (
        <div className="flex max-w-[1000px] flex-col gap-4 p-[22px_26px]">
            <div>
                <div className="text-[12.5px] text-[#8b97ab]">Кадровый документооборот</div>
                <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">Ознакомление</h1>
                <p className="m-0 mt-1.5 max-w-[70ch] text-[13px] leading-[1.7] text-[#55617a]">
                    Документы, с которыми вы обязаны ознакомиться. Ознакомление подписывается
                    вашей простой электронной подписью — под ней остаётся время и отпечаток
                    той версии документа, которую вы видели.
                </p>
            </div>

            <RegulationConsentGate/>

            {просрочены.length > 0 && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    Просрочено: {просрочены.length}. Срок ознакомления прошёл.
                </div>
            )}

            {ошибка && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}
            {готово && (
                <div className="rounded-[9px] border border-[#cfe3d6] bg-[#f2f9f5] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    {готово}
                </div>
            )}

            <label className="flex w-fit items-center gap-2 text-[12.5px] text-[#55617a]">
                <input type="checkbox" className="h-4 w-4"
                       checked={показыватьОтвеченные}
                       onChange={(e) => setПоказыватьОтвеченные(e.target.checked)}/>
                Показывать то, на что уже ответил
            </label>

            {список.length === 0 ? (
                <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-8 text-center text-[13px] text-[#8b97ab]">
                    {занято
                        ? "Загрузка…"
                        : показыватьОтвеченные
                            ? "Ознакомлений пока не было"
                            : "Всё прочитано — документов, ждущих ознакомления, нет"}
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {список.map((строка) => (
                        <article key={строка.id}
                                 className={`rounded-[12px] border bg-white p-4 ${
                                     строка.overdue ? "border-[#f1c9c2]" : "border-[#e5e9f0]"}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-[240px] flex-1">
                                    {/* Карточка есть не у всякого документа — тогда
                                        название остаётся текстом, а не мёртвой ссылкой. */}
                                    {ackDocumentPath(строка) ? (
                                        <button
                                            onClick={() => navigate(ackDocumentPath(строка)!)}
                                            className="border-none bg-transparent p-0 text-left text-[14px] font-semibold text-[#2f68f5] hover:underline"
                                        >
                                            {строка.documentNumber && (
                                                <span className="text-[#8b97ab]">{строка.documentNumber} · </span>
                                            )}
                                            {строка.documentTitle}
                                        </button>
                                    ) : (
                                        <div className="text-[14px] font-semibold text-[#26324a]">
                                            {строка.documentNumber && (
                                                <span className="text-[#8b97ab]">{строка.documentNumber} · </span>
                                            )}
                                            {строка.documentTitle}
                                        </div>
                                    )}

                                    {строка.instruction && (
                                        <p className="m-0 mt-1 text-[13px] leading-[1.6] text-[#55617a]">
                                            {строка.instruction}
                                        </p>
                                    )}

                                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[#8b97ab]">
                                        <span>получено {formatDateTime(строка.createdAt)}</span>
                                        {строка.dueDate && (
                                            <span className={строка.overdue ? "font-semibold text-[#c0392b]" : ""}>
                                                срок {formatDate(строка.dueDate)}
                                            </span>
                                        )}
                                        {!строка.requireSignature && <span>без подписи</span>}
                                    </div>
                                </div>

                                {строка.state === "Pending" ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => ознакомиться(строка)} disabled={занято}
                                                className="h-9 rounded-[9px] border-none bg-[#1c7a4d] px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">
                                            Ознакомлен
                                        </button>
                                        <button
                                            onClick={() => {
                                                setОтказПо(отказПо === строка.id ? null : строка.id);
                                                setПричина("");
                                            }}
                                            disabled={занято}
                                            className="h-9 rounded-[9px] border border-[#f1c9c2] bg-white px-4 text-[12.5px] font-semibold text-[#c0392b] disabled:opacity-50"
                                        >
                                            Отказаться
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <div className={`text-[12.5px] font-semibold ${
                                            строка.state === "Acknowledged" ? "text-[#1c7a4d]" : "text-[#c0392b]"}`}>
                                            {ACK_STATE_LABEL[строка.state]}
                                        </div>
                                        {строка.respondedAt && (
                                            <div className="text-[11.5px] text-[#8b97ab]">
                                                {formatDateTime(строка.respondedAt)}
                                            </div>
                                        )}
                                        {строка.comment && (
                                            <div className="mt-0.5 max-w-[280px] text-[11.5px] text-[#8b97ab]">
                                                {строка.comment}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {отказПо === строка.id && (
                                <div className="mt-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] p-3">
                                    <div className="text-[12.5px] font-semibold text-[#8a5a00]">
                                        Причина отказа
                                    </div>
                                    <p className="m-0 mt-0.5 text-[12px] leading-[1.6] text-[#8a5a00]">
                                        Отказ — ваше право. Причина попадёт в лист ознакомления и
                                        будет видна кадровой службе.
                                    </p>
                                    <textarea
                                        rows={2}
                                        value={причина}
                                        onChange={(e) => setПричина(e.target.value)}
                                        className="mt-2 w-full resize-y rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2f68f5]"
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={() => отказаться(строка)} disabled={занято}
                                                className="h-9 rounded-[9px] border-none bg-[#c0392b] px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">
                                            Подтвердить отказ
                                        </button>
                                        <button onClick={() => setОтказПо(null)} disabled={занято}
                                                className="h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] text-[#55617a]">
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
