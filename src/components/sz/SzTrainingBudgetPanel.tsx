import {useEffect, useRef, useState} from "react";
import {szService, type SzDetails} from "@/service/szService/szService.ts";
import {planItemLookupService, type PlanItemLookup} from "@/service/procurementService/planItemLookupService.ts";

/**
 * Кадровик УЧР на своём этапе маршрута отмечает по СЗ на обучение, заложено ли оно
 * в бюджет, и привязывает к позиции Плана закупок (КСЗ-08). Действует, пока записка
 * не завершена, — отдельно от правки черновика автором.
 */
export function SzTrainingBudgetPanel({sz, canEdit, onChanged}: {
    sz: SzDetails;
    canEdit: boolean;
    onChanged: () => void;
}) {
    const finished = ["Executed", "Rejected", "Withdrawn", "Archived"].includes(sz.statusCode);

    const [budget, setBudget] = useState<"" | "yes" | "no">(
        sz.hasBudget == null ? "" : sz.hasBudget ? "yes" : "no");
    const [planItemId, setPlanItemId] = useState<number | null>(sz.planItemId);
    const [planLabel, setPlanLabel] = useState<string | null>(sz.planItemLabel);

    const [query, setQuery] = useState("");
    const [options, setOptions] = useState<PlanItemLookup[]>([]);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (!open) return;
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(async () => {
            try { setOptions(await planItemLookupService.search(query, sz.employeeUnitId, 20)); }
            catch { setOptions([]); }
        }, 250);
        return () => { if (timer.current) window.clearTimeout(timer.current); };
    }, [query, open, sz.employeeUnitId]);

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const d = await szService.setTrainingBudget(sz.id, budget === "" ? null : budget === "yes", planItemId);
            setPlanLabel(d.planItemLabel);
            onChanged();
        } catch (e) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg || "Не удалось сохранить");
        } finally {
            setSaving(false);
        }
    }

    // Тем, кто не ведёт кадровые СЗ, показываем только результат — без органов управления.
    if (!canEdit) {
        if (sz.hasBudget == null && !sz.planItemLabel) return null;
        return (
            <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                <div className="text-[13px] font-semibold text-[#0f1b2d]">Бюджет обучения</div>
                <div className="mt-2 text-[13px] text-[#55617a]">
                    {sz.hasBudget == null ? "Признак бюджета не задан"
                        : sz.hasBudget ? "Заложено в бюджет" : "Вне бюджета"}
                    {sz.planItemLabel && <span> · План закупок: {sz.planItemLabel}</span>}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-4">
            <div className="text-[13px] font-semibold text-[#0f1b2d]">Бюджет обучения и план закупок (УЧР)</div>
            <div className="mt-1 text-[12px] text-[#8b97ab]">Заполняет кадровик УЧР на своём этапе маршрута.</div>

            {finished ? (
                <div className="mt-3 text-[13px] text-[#8b97ab]">
                    Записка завершена — изменение недоступно.
                    {sz.planItemLabel && <span> План закупок: {sz.planItemLabel}.</span>}
                </div>
            ) : (
                <div className="mt-3 flex flex-col gap-3">
                    <div className="flex items-center gap-4 text-[13px] text-[#374253]">
                        <span className="text-[#8b97ab]">Финансирование:</span>
                        {(["", "yes", "no"] as const).map((v) => (
                            <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" name={`budget-${sz.id}`} checked={budget === v}
                                       onChange={() => setBudget(v)}/>
                                {v === "" ? "Не задано" : v === "yes" ? "В бюджете" : "Вне бюджета"}
                            </label>
                        ))}
                    </div>

                    <div>
                        <div className="text-[12.5px] text-[#8b97ab] mb-1">Позиция плана закупок</div>
                        {planItemId && (
                            <div className="flex items-center gap-2 mb-1.5 text-[13px] text-[#0f1b2d]">
                                <span className="font-medium">{planLabel ?? `Позиция №${planItemId}`}</span>
                                <button type="button" onClick={() => { setPlanItemId(null); setPlanLabel(null); }}
                                        className="text-[12px] text-[#c0392b] hover:underline">убрать</button>
                            </div>
                        )}
                        <input
                            className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5]"
                            placeholder="Поиск по коду или предмету плана…"
                            value={query}
                            onFocus={() => setOpen(true)}
                            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        />
                        {open && options.length > 0 && (
                            <div className="mt-1 max-h-[220px] overflow-auto rounded-[9px] border border-[#e5e9f0] bg-white">
                                {options.map((o) => (
                                    <button key={o.id} type="button"
                                            onClick={() => {
                                                setPlanItemId(o.id);
                                                setPlanLabel(`${o.code} — ${o.subject}`);
                                                setQuery(""); setOpen(false);
                                            }}
                                            className="block w-full text-left px-3 py-2 text-[13px] hover:bg-[#f4f6fa] border-none bg-transparent cursor-pointer">
                                        <span className="font-medium text-[#0f1b2d]">{o.code}</span>
                                        <span className="text-[#55617a]"> — {o.subject}</span>
                                        <span className="block text-[11.5px] text-[#8b97ab]">
                                            {o.year} · остаток {o.remainingAmount.toLocaleString("ru-RU")}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <div className="text-[12.5px] text-[#c0392b]">{error}</div>}

                    <div>
                        <button type="button" onClick={() => void save()} disabled={saving}
                                className="h-9 px-4 rounded-[9px] bg-[#2f68f5] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#2554cc] disabled:opacity-50">
                            {saving ? "Сохраняем…" : "Сохранить"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
