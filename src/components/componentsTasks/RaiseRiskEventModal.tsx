/**
 * «Поднять оп-риск» с шага согласования (RISK-1, 716-П / НБКР). Событие привязывается
 * к задаче: сервер по её участнику маршрута (или документу) сам находит этап, маршрут
 * и документ. Форма — тип по классификации 716-П, серьёзность, описание и прямые потери.
 */
import {useState} from "react";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {
    riskEventService,
    RISK_TYPE_LABEL,
    RISK_SEVERITY_LABEL,
    type RiskEventType,
    type RiskEventSeverity,
} from "@/service/riskEventService/riskEventService.ts";

interface Props {
    task: InboxTask;
    onClose: () => void;
    onDone: () => void;
}

export function RaiseRiskEventModal({task, onClose, onDone}: Props) {
    const [type, setType] = useState<RiskEventType>("ExecutionDeliveryProcessManagement");
    const [severity, setSeverity] = useState<RiskEventSeverity>("Medium");
    const [description, setDescription] = useState("");
    const [loss, setLoss] = useState("");
    const [currency, setCurrency] = useState("KGS");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        if (!description.trim()) {
            setError("Опишите обстоятельства события");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await riskEventService.raise({
                type,
                severity,
                description: description.trim(),
                routeParticipantId: task.participantId ?? undefined,
                documentId: task.documentId,
                directLossAmount: loss.trim() ? Number(loss) : undefined,
                lossCurrency: currency.trim() || undefined,
            });
            onDone();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось поднять событие операционного риска");
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
                className="flex w-[min(520px,100%)] flex-col gap-3.5 rounded-[14px] bg-white p-5 shadow-[0_20px_60px_-20px_rgba(15,27,45,0.5)]"
            >
                <div>
                    <h2 className="m-0 text-[16px] font-bold text-[#0f1b2d]">Поднять оп-риск</h2>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        {task.documentTypeTitle} · {task.regNumber ?? "без номера"}
                        {task.stepOrder !== null && ` · этап ${task.stepOrder}`}
                    </div>
                </div>

                <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-[#55617a]">
                        Тип события (716-П)
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as RiskEventType)}
                        className="box-border h-9 w-full rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                    >
                        {(Object.keys(RISK_TYPE_LABEL) as RiskEventType[]).map((k) => (
                            <option key={k} value={k}>{RISK_TYPE_LABEL[k]}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-[#55617a]">
                        Серьёзность
                    </label>
                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as RiskEventSeverity)}
                        className="box-border h-9 w-full rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                    >
                        {(Object.keys(RISK_SEVERITY_LABEL) as RiskEventSeverity[]).map((k) => (
                            <option key={k} value={k}>{RISK_SEVERITY_LABEL[k]}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-[#55617a]">
                        Описание
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="box-border w-full resize-y rounded-[9px] border border-[#e5e9f0] px-2.5 py-2 font-[inherit] text-[13px]"
                        placeholder="Просрочка этапа, срыв контроля, обход «четырёх глаз» и т.п."
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-[12.5px] font-semibold text-[#55617a]">
                        Прямые потери (необязательно)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={loss}
                            onChange={(e) => setLoss(e.target.value)}
                            className="box-border h-9 flex-1 rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                            placeholder="0.00"
                        />
                        <input
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                            className="box-border h-9 w-[84px] rounded-[9px] border border-[#e5e9f0] px-2.5 text-[13px]"
                            placeholder="KGS"
                        />
                    </div>
                </div>

                {error && <div className="text-[12.5px] text-[#c0392b]">{error}</div>}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="cursor-pointer rounded-[9px] border-none bg-[#c0392b] px-3.5 py-2 text-[13px] font-semibold text-white disabled:cursor-default disabled:opacity-60"
                    >
                        {busy ? "Сохранение…" : "Поднять оп-риск"}
                    </button>
                </div>
            </div>
        </div>
    );
}
