/**
 * Карточка события операционного риска (RISK-1). Показывает обстоятельства, привязку к
 * документу/маршруту и прямые потери. При праве ManageRiskEvents позволяет сменить
 * статус (новое → в работе → закрыто) и уточнить сумму потерь.
 */
import {useEffect, useState} from "react";
import {
    riskEventService,
    RISK_STATUS_LABEL,
    type RiskEventDetails,
    type RiskEventStatus,
} from "@/service/riskEventService/riskEventService.ts";

interface Props {
    id: number;
    canManage: boolean;
    onClose: () => void;
    onChanged: () => void;
}

function Row({label, value}: {label: string; value: string}) {
    return (
        <div className="flex gap-3 py-1.5 border-t border-[#f0f3f7] first:border-t-0">
            <div className="w-[150px] flex-none text-[12px] text-[#8b97ab]">{label}</div>
            <div className="text-[13px] text-[#1c2740]">{value}</div>
        </div>
    );
}

export function RiskEventCard({id, canManage, onClose, onChanged}: Props) {
    const [event, setEvent] = useState<RiskEventDetails | null>(null);
    const [status, setStatus] = useState<RiskEventStatus>("New");
    const [comment, setComment] = useState("");
    const [loss, setLoss] = useState("");
    const [currency, setCurrency] = useState("KGS");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        riskEventService.get(id).then((d) => {
            if (!alive) return;
            setEvent(d);
            setStatus(d.status);
            setLoss(d.directLossAmount !== null ? String(d.directLossAmount) : "");
            setCurrency(d.lossCurrency || "KGS");
        }).catch(() => alive && setError("Не удалось загрузить событие"));
        return () => {
            alive = false;
        };
    }, [id]);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            await riskEventService.changeStatus(id, {
                status,
                comment: comment.trim() || undefined,
                directLossAmount: loss.trim() ? Number(loss) : undefined,
                lossCurrency: currency.trim() || undefined,
            });
            onChanged();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось сохранить изменения");
            setBusy(false);
        }
    }

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,27,45,0.4)] p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90vh] w-[min(560px,100%)] flex-col gap-3 overflow-y-auto rounded-[14px] bg-white p-5 shadow-[0_20px_60px_-20px_rgba(15,27,45,0.5)]"
            >
                {!event ? (
                    <div className="p-6 text-center text-[13px] text-[#8b97ab]">
                        {error ?? "Загрузка…"}
                    </div>
                ) : (
                    <>
                        <div>
                            <h2 className="m-0 text-[16px] font-bold text-[#0f1b2d]">{event.typeTitle}</h2>
                            <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                                Событие №{event.id} · {event.statusTitle}
                            </div>
                        </div>

                        <div className="rounded-[10px] bg-[#f9fbfe] p-3">
                            <Row label="Дата события" value={new Date(event.occurredOn).toLocaleDateString("ru-RU")}/>
                            <Row label="Серьёзность" value={event.severityTitle}/>
                            <Row label="Инициатор" value={event.initiatorName ?? `#${event.initiatorUserId}`}/>
                            {event.documentTitle && <Row label="Документ" value={event.documentTitle}/>}
                            {event.routeInstanceId !== null && <Row label="Маршрут" value={`#${event.routeInstanceId}`}/>}
                            {event.routeStepId !== null && <Row label="Этап" value={`#${event.routeStepId}`}/>}
                            <Row
                                label="Прямые потери"
                                value={event.directLossAmount !== null
                                    ? `${event.directLossAmount.toLocaleString("ru-RU")} ${event.lossCurrency}`
                                    : "—"}
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 text-[12px] font-semibold text-[#55617a]">Описание</div>
                            <div className="whitespace-pre-wrap rounded-[9px] border border-[#e5e9f0] p-2.5 text-[13px] text-[#1c2740]">
                                {event.description}
                            </div>
                        </div>

                        {event.resolutionComment && (
                            <div>
                                <div className="mb-1.5 text-[12px] font-semibold text-[#55617a]">Решение / комментарий</div>
                                <div className="whitespace-pre-wrap rounded-[9px] border border-[#e5e9f0] p-2.5 text-[13px] text-[#1c2740]">
                                    {event.resolutionComment}
                                </div>
                            </div>
                        )}

                        {canManage && (
                            <div className="flex flex-col gap-3 rounded-[10px] border border-[#e5e9f0] p-3">
                                <div className="text-[12.5px] font-bold text-[#0f1b2d]">Разбор события</div>

                                <div className="flex gap-2 flex-wrap">
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as RiskEventStatus)}
                                        className="h-9 flex-1 min-w-[160px] rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                                    >
                                        {(Object.keys(RISK_STATUS_LABEL) as RiskEventStatus[]).map((k) => (
                                            <option key={k} value={k}>{RISK_STATUS_LABEL[k]}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={loss}
                                        onChange={(e) => setLoss(e.target.value)}
                                        className="h-9 w-[130px] rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                                        placeholder="Потери"
                                    />
                                    <input
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                                        className="h-9 w-[74px] rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                                        placeholder="KGS"
                                    />
                                </div>

                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={2}
                                    className="box-border w-full resize-y rounded-[9px] border border-[#e5e9f0] px-2.5 py-2 font-[inherit] text-[13px]"
                                    placeholder="Комментарий/принятые меры (необязательно)"
                                />
                            </div>
                        )}

                        {error && <div className="text-[12.5px] text-[#c0392b]">{error}</div>}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                className="cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-60"
                            >
                                Закрыть
                            </button>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={busy}
                                    className="cursor-pointer rounded-[9px] border-none bg-[#2f68f5] px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                                >
                                    {busy ? "Сохранение…" : "Сохранить"}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
