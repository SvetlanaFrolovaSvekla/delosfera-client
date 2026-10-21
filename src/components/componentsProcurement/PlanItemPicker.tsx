import {useEffect, useRef, useState} from "react";
import {Check, ChevronDown, Search, X} from "lucide-react";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import {
    planItemLookupService,
    type PlanItemLookup,
} from "@/service/procurementService/planItemLookupService.ts";

/**
 * Выбор позиции Плана закупок.
 *
 * Показывает остаток по позиции, а не только плановую сумму: инициатору важно
 * знать, сколько по ней уже выбрали другие подразделения. Иначе перерасход
 * обнаруживается в отчёте об исполнении, когда договоры уже заключены.
 */

interface Props {
    value: PlanItemLookup | null;
    onChange: (item: PlanItemLookup | null) => void;
    /** Подразделение инициатора — его позиции показываются первыми. */
    orgUnitId?: number | null;
    /** Сумма заявки: если она больше остатка, предупреждаем до отправки. */
    amount?: number;
}

const деньги = (v: number) => `${v.toLocaleString("ru-RU")} сом`;

export function PlanItemPicker({value, onChange, orgUnitId, amount}: Props) {
    const [open, setOpen] = useState(false);
    const [запрос, setЗапрос] = useState("");
    const [позиции, setПозиции] = useState<PlanItemLookup[]>([]);
    const [загрузка, setЗагрузка] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, open, () => setOpen(false));

    // Ищем не на каждое нажатие: справочник живёт на сервере, а человек
    // печатает быстрее, чем нужен ответ.
    useEffect(() => {
        if (!open) return;

        let отменено = false;
        const таймер = setTimeout(async () => {
            setЗагрузка(true);
            setОшибка(null);
            try {
                const найдено = await planItemLookupService.search(запрос, orgUnitId);
                if (!отменено) setПозиции(найдено);
            } catch {
                if (!отменено) setОшибка("Позиции Плана не загрузились");
            } finally {
                if (!отменено) setЗагрузка(false);
            }
        }, 250);

        return () => {
            отменено = true;
            clearTimeout(таймер);
        };
    }, [запрос, open, orgUnitId]);

    // Не хватает остатка — предупреждаем, но не запрещаем: решение о превышении
    // принимает не система, а согласующие по маршруту.
    const нехватка =
        value !== null && amount !== undefined && amount > value.remainingAmount;

    return (
        <div ref={ref} style={{position: "relative"}}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    width: "100%", minHeight: 38, padding: "8px 12px", textAlign: "left",
                    border: "1px solid #e5e9f0", borderRadius: 10, background: "#fff",
                    font: "inherit", fontSize: 13, color: value ? "#26324a" : "#8b97ab",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
            >
                <span style={{flex: 1, minWidth: 0}}>
                    {value ? (
                        <>
                            <span style={{fontWeight: 600}}>{value.code}</span>
                            {" — "}
                            <span>{value.subject}</span>
                            <span style={{display: "block", fontSize: 11.5, color: "#8b97ab", marginTop: 2}}>
                                План {value.year} · остаток {деньги(value.remainingAmount)}
                                {value.orgUnitTitle && ` · ${value.orgUnitTitle}`}
                            </span>
                        </>
                    ) : (
                        "— выберите позицию Плана —"
                    )}
                </span>

                {value && (
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label="Убрать позицию"
                        onClick={(e) => { e.stopPropagation(); onChange(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(null); } }}
                        style={{flex: "none", display: "grid", placeItems: "center", cursor: "pointer", color: "#c3cbdb"}}
                    >
                        <X size={14}/>
                    </span>
                )}
                <ChevronDown size={15} style={{flex: "none", color: "#8b97ab"}}/>
            </button>

            {нехватка && (
                <div style={{marginTop: 6, fontSize: 11.5, color: "#c77700"}}>
                    Сумма заявки больше остатка по позиции ({деньги(value!.remainingAmount)}) —
                    потребуется корректировка Плана
                </div>
            )}

            {open && (
                <div
                    style={{
                        position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, right: 0,
                        background: "#fff", border: "1px solid #e5e9f0", borderRadius: 11,
                        boxShadow: "0 12px 32px -18px rgba(16,26,44,.35)", overflow: "hidden",
                    }}
                >
                    <div style={{display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #f2f5f9"}}>
                        <Search size={14} style={{color: "#8b97ab", flex: "none"}}/>
                        <input
                            autoFocus
                            value={запрос}
                            onChange={(e) => setЗапрос(e.target.value)}
                            placeholder="Код или предмет закупки…"
                            style={{flex: 1, border: "none", outline: "none", font: "inherit", fontSize: 13}}
                        />
                    </div>

                    <div style={{maxHeight: 280, overflowY: "auto"}}>
                        {загрузка && <div style={{padding: "12px 14px", fontSize: 12.5, color: "#8b97ab"}}>Ищем…</div>}

                        {ошибка && <div style={{padding: "12px 14px", fontSize: 12.5, color: "#c0392b"}}>{ошибка}</div>}

                        {!загрузка && !ошибка && позиции.length === 0 && (
                            <div style={{padding: "12px 14px", fontSize: 12.5, color: "#8b97ab", lineHeight: 1.6}}>
                                {запрос
                                    ? "Ничего не нашли. Позиция есть только в утверждённом Плане."
                                    : "Утверждённых позиций Плана нет — закупка пойдёт как внеплановая."}
                            </div>
                        )}

                        {позиции.map((item) => {
                            const выбрана = value?.id === item.id;
                            const перебрана = item.remainingAmount < 0;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { onChange(item); setOpen(false); }}
                                    style={{
                                        display: "flex", gap: 8, width: "100%", padding: "10px 14px",
                                        border: "none", background: выбрана ? "#f6f8fb" : "#fff",
                                        textAlign: "left", font: "inherit", cursor: "pointer",
                                        borderBottom: "1px solid #f6f8fb",
                                    }}
                                >
                                    <span style={{flex: "none", width: 16, color: "#2f68f5"}}>
                                        {выбрана && <Check size={14}/>}
                                    </span>
                                    <span style={{minWidth: 0, flex: 1}}>
                                        <span style={{fontSize: 13, color: "#26324a"}}>
                                            <b>{item.code}</b> — {item.subject}
                                        </span>
                                        <span style={{display: "block", fontSize: 11.5, color: "#8b97ab", marginTop: 3}}>
                                            План {item.year}
                                            {item.quarter && ` · ${item.quarter} квартал`}
                                            {" · план "}{деньги(item.plannedAmount)}
                                            {" · "}
                                            <span style={{color: перебрана ? "#c0392b" : "#8b97ab"}}>
                                                {перебрана
                                                    ? `перебор ${деньги(-item.remainingAmount)}`
                                                    : `остаток ${деньги(item.remainingAmount)}`}
                                            </span>
                                            {item.orgUnitTitle && ` · ${item.orgUnitTitle}`}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
