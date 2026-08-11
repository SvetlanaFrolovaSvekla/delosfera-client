import {useCallback, useEffect, useState} from "react";
import {colors} from "@/design/tokens";
import {szProcurementService, type SzProcurement} from "@/service/szService/szProcurementService.ts";

const inputClass =
    "w-full h-10 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none focus:border-[#2f68f5]";

function formatMoney(value: number | null): string {
    if (value == null) return "—";
    return value.toLocaleString("ru-RU", {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU");
}

interface Props {
    szId: number;
    /** Форма вида записки: панель нужна только закупочным. */
    formKey: string;
}

/**
 * Запуск закупки по записке (PRC-01). Закупочный контур появится отдельным модулем,
 * здесь — передача реквизитов и связь записки с заявкой.
 */
export function SzProcurementPanel({szId, formKey}: Props) {
    const [state, setState] = useState<SzProcurement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [note, setNote] = useState("");

    const load = useCallback(async () => {
        try {
            setState(await szProcurementService.get(szId));
        } catch {
            setError("Не удалось загрузить состояние закупки");
        }
    }, [szId]);

    useEffect(() => {
        if (formKey === "Procurement") void load();
    }, [formKey, load]);

    // Панель показывается только у записок «на закупку».
    if (formKey !== "Procurement") return null;

    const handOver = () => {
        setBusy(true);
        setError(null);
        szProcurementService.handOver(szId, subject.trim() || undefined, note.trim() || undefined)
            .then(() => {
                setFormOpen(false);
                setSubject("");
                setNote("");
                return load();
            })
            .catch((e) => {
                const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                setError(message ?? "Не удалось запустить закупку");
            })
            .finally(() => setBusy(false));
    };

    const canHandOver = state != null && !state.isHandedOver && state.blockers.length === 0;

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="m-0 text-[15px] font-semibold">Закупка</h2>
                <span className="text-[12.5px] font-semibold"
                      style={{color: state?.isHandedOver ? colors.ryg.green.fg : colors.inkSubtle}}>
                    {state?.isHandedOver ? `Запущена ${formatDate(state.handedOverAt)}` : "Не запускалась"}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px]">
                <div className="text-[#1c2740]">
                    Сумма: {formatMoney(state?.amount ?? null)}
                    <span className="text-[#8b97ab]">
                        {" · "}бюджет: {state?.hasBudget == null ? "не указан" : state.hasBudget ? "заложен" : "не заложен"}
                    </span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                    Инициатор: {state?.initiatorName ?? "—"}
                    {state?.initiatorUnit && `, ${state.initiatorUnit}`}
                </div>
            </div>

            {state?.isHandedOver ? (
                <div className="mt-3 rounded-[10px] border border-[#c9e6d5] bg-[#eef8f2] px-4 py-2.5 text-[13px] text-[#1c7a4d]">
                    Заявка: {state.procurementRegNumber ?? "без номера"} · {state.procurementTitle}
                </div>
            ) : state && state.blockers.length > 0 ? (
                <div className="mt-3 rounded-[10px] border border-[#f0dcae] bg-[#fdf3e0] px-4 py-2.5 text-[13px] text-[#b3730a]">
                    <div className="font-semibold">Закупку пока запустить нельзя:</div>
                    <ul className="mt-1 mb-0 pl-5">
                        {state.blockers.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                </div>
            ) : null}

            {canHandOver && (
                <button
                    onClick={() => setFormOpen((v) => !v)}
                    className="mt-3 h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                >
                    Запустить закупку
                </button>
            )}

            {formOpen && canHandOver && (
                <div className="mt-2.5 rounded-[10px] border border-[#e5e9f0] p-4">
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Предмет закупки — так будет называться заявка"
                        className={inputClass}
                    />
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Комментарий к передаче (необязательно)"
                        className={`${inputClass} mt-2`}
                    />
                    <button
                        onClick={handOver}
                        disabled={busy}
                        className="mt-2.5 h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                    >
                        Создать заявку
                    </button>
                </div>
            )}
        </div>
    );
}
