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
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {CheckCircle2, History} from "lucide-react";

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

    const [items, setItems] = useState<MyAck[]>([]);
    const [showAnswered, setShowAnswered] = useState(false);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /** Открыт отказ по этой строке — показываем поле причины. */
    const [refusalForId, setRefusalForId] = useState<number | null>(null);
    const [reason, setReason] = useState("");

    const load = useCallback(async () => {
        try {
            setBusy(true);
            setError(null);
            setItems(await acknowledgementService.mine(showAnswered));
        } catch {
            setError("Не удалось загрузить список документов для ознакомления");
        } finally {
            setBusy(false);
        }
    }, [showAnswered]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        void load();
    }, [load]);

    const acknowledge = async (row: MyAck) => {
        try {
            setBusy(true);
            setError(null);
            setSuccess(null);
            await acknowledgementService.acknowledge(row.id);
            setSuccess(`Ознакомление зафиксировано: ${row.documentTitle}`);
            await load();
        } catch (e) {
            // Сервер отказывает по существу — не принят регламент подписи, документ
            // изменился. Общее «не удалось» спрятало бы причину.
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось зафиксировать ознакомление");
        } finally {
            setBusy(false);
        }
    };

    const refuse = async (row: MyAck) => {
        if (!reason.trim()) {
            setError("У отказа должна быть причина — без неё его нечего обсуждать");
            return;
        }

        try {
            setBusy(true);
            setError(null);
            setSuccess(null);
            await acknowledgementService.refuse(row.id, reason.trim());
            setRefusalForId(null);
            setReason("");
            setSuccess("Отказ зафиксирован, кадровая служба уведомлена");
            await load();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось зафиксировать отказ");
        } finally {
            setBusy(false);
        }
    };

    const pending = items.filter((x) => x.state === "Pending");
    const overdueItems = pending.filter((x) => x.overdue);

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em]">Ознакомление</h1>
                    <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">
                        Кадровый документооборот. Документы, с которыми вы обязаны ознакомиться. Ознакомление
                        подписывается
                        вашей простой электронной подписью — под ней остаётся время и отпечаток
                        той версии документа, которую вы видели.
                    </p>
                </div>
            </div>

            <RegulationConsentGate/>

            {overdueItems.length > 0 && (
                <div
                    className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    Просрочено: {overdueItems.length}. Срок ознакомления прошёл.
                </div>
            )}

            {error && (
                <div
                    className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}
            {success && (
                <div
                    className="rounded-[9px] border border-[#cfe3d6] bg-[#f2f9f5] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    {success}
                </div>
            )}

            <div className="py-4">
                <CheckBoxOne
                    checked={showAnswered}
                    onChange={setShowAnswered}
                >
                    Показывать то, на что уже ответил
                </CheckBoxOne>
            </div>

            {items.length === 0 ? (
                busy ? (
                    <div
                        className="rounded-[12px] border border-[#e5e9f0] bg-white p-8 text-center text-[13px] text-[#8b97ab]">
                        Загрузка…
                    </div>
                ) : showAnswered ? (
                    <EmptyState
                        icon={History}
                        title="Ознакомлений пока не было"
                        description="Здесь появится история того, с чем вы уже ознакомились или от чего отказались."
                    />
                ) : (
                    <EmptyState

                        icon={CheckCircle2}
                        title="Всё прочитано"
                        description="Документов, ждущих ознакомления, нет — новые появятся здесь, как только поступят."
                    />
                )
            ) : (
                <div className="flex flex-col gap-2.5">
                    {items.map((row) => (
                        <article key={row.id}
                                 className={`rounded-[12px] border bg-white p-4 ${
                                     row.overdue ? "border-[#f1c9c2]" : "border-[#e5e9f0]"}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-[240px] flex-1">
                                    {/* Карточка есть не у всякого документа — тогда
                                        название остаётся текстом, а не мёртвой ссылкой. */}
                                    {ackDocumentPath(row) ? (
                                        <button
                                            onClick={() => navigate(ackDocumentPath(row)!)}
                                            className="border-none bg-transparent p-0 text-left text-[14px] font-semibold text-[#2f68f5] hover:underline"
                                        >
                                            {row.documentNumber && (
                                                <span className="text-[#8b97ab]">{row.documentNumber} · </span>
                                            )}
                                            {row.documentTitle}
                                        </button>
                                    ) : (
                                        <div className="text-[14px] font-semibold text-[#26324a]">
                                            {row.documentNumber && (
                                                <span className="text-[#8b97ab]">{row.documentNumber} · </span>
                                            )}
                                            {row.documentTitle}
                                        </div>
                                    )}

                                    {row.instruction && (
                                        <p className="m-0 mt-1 text-[13px] leading-[1.6] text-[#55617a]">
                                            {row.instruction}
                                        </p>
                                    )}

                                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[#8b97ab]">
                                        <span>получено {formatDateTime(row.createdAt)}</span>
                                        {row.dueDate && (
                                            <span className={row.overdue ? "font-semibold text-[#c0392b]" : ""}>
                                                срок {formatDate(row.dueDate)}
                                            </span>
                                        )}
                                        {!row.requireSignature && <span>без подписи</span>}
                                    </div>
                                </div>

                                {row.state === "Pending" ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => acknowledge(row)} disabled={busy}
                                                className="h-9 rounded-[9px] border-none bg-[#1c7a4d] px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">
                                            Ознакомлен
                                        </button>
                                        <button
                                            onClick={() => {
                                                setRefusalForId(refusalForId === row.id ? null : row.id);
                                                setReason("");
                                            }}
                                            disabled={busy}
                                            className="h-9 rounded-[9px] border border-[#f1c9c2] bg-white px-4 text-[12.5px] font-semibold text-[#c0392b] disabled:opacity-50"
                                        >
                                            Отказаться
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <div className={`text-[12.5px] font-semibold ${
                                            row.state === "Acknowledged" ? "text-[#1c7a4d]" : "text-[#c0392b]"}`}>
                                            {ACK_STATE_LABEL[row.state]}
                                        </div>
                                        {row.respondedAt && (
                                            <div className="text-[11.5px] text-[#8b97ab]">
                                                {formatDateTime(row.respondedAt)}
                                            </div>
                                        )}
                                        {row.comment && (
                                            <div className="mt-0.5 max-w-[280px] text-[11.5px] text-[#8b97ab]">
                                                {row.comment}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {refusalForId === row.id && (
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
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="mt-2 w-full resize-y rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2f68f5]"
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={() => refuse(row)} disabled={busy}
                                                className="h-9 rounded-[9px] border-none bg-[#c0392b] px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">
                                            Подтвердить отказ
                                        </button>
                                        <button onClick={() => setRefusalForId(null)} disabled={busy}
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