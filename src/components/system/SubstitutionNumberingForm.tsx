import {useCallback, useEffect, useState} from "react";
import {apiClient} from "@/service/apiClient.ts";

/**
 * Настройка нумерации заявок на замещение.
 *
 * Счётчик сквозной (HR-1, HR-2, …), без сброса по годам. Здесь администратор
 * задаёт формат номера и, при необходимости, текущее значение счётчика —
 * например, чтобы продолжить нумерацию с нужного числа.
 */
interface Numbering {
    pattern: string;
    nextSeq: number;
}

export const SubstitutionNumberingForm = () => {
    const [pattern, setPattern] = useState("HR-{seq}");
    const [nextSeq, setNextSeq] = useState(1);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const {data} = await apiClient.get<Numbering>("/substitution-numbering");
            setPattern(data.pattern);
            setNextSeq(data.nextSeq);
        } catch {
            setError("Не удалось загрузить настройки нумерации");
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const save = async () => {
        setBusy(true); setError(null); setDone(null);
        try {
            const {data} = await apiClient.put<Numbering>("/substitution-numbering", {pattern, nextSeq});
            setPattern(data.pattern);
            setNextSeq(data.nextSeq);
            setDone("Сохранено");
        } catch (e) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось сохранить");
        } finally {
            setBusy(false);
        }
    };

    const preview = pattern.replace(/\{seq(:[^}]+)?\}/, String(nextSeq)).replace(/\{year\}/, String(new Date().getFullYear()));

    return (
        <div className="max-w-[520px] flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#374253]">Формат номера</label>
                <input
                    className="h-10 px-3 rounded-[9px] border border-[#e5e9f0] text-[14px] outline-none focus:border-[#2f68f5]"
                    value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="HR-{seq}"/>
                <span className="text-[12px] text-[#8b97ab]">
                    Обязательно {"{seq}"} — место порядкового номера. Доступно {"{year}"} и формат вида {"{seq:D4}"} (HR-0001).
                </span>
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#374253]">Следующий номер (счётчик)</label>
                <input type="number" min={1}
                    className="h-10 px-3 rounded-[9px] border border-[#e5e9f0] text-[14px] outline-none focus:border-[#2f68f5] w-[160px]"
                    value={nextSeq} onChange={(e) => setNextSeq(Math.max(1, Number(e.target.value) || 1))}/>
                <span className="text-[12px] text-[#8b97ab]">Следующая заявка получит: <b>{preview}</b></span>
            </div>
            {error && <div className="text-[13px] text-[#c0392b]">{error}</div>}
            {done && <div className="text-[13px] text-[#1c7a4d]">{done}</div>}
            <div>
                <button type="button" onClick={() => void save()} disabled={busy}
                    className="h-10 px-5 rounded-[10px] bg-[#2f68f5] !text-white text-[14px] font-semibold cursor-pointer hover:bg-[#2554cc] disabled:opacity-50">
                    Сохранить
                </button>
            </div>
        </div>
    );
};
