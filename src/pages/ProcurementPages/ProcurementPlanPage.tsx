import {useCallback, useEffect, useState} from "react";
import {planService, type Plan} from "@/service/procurementService/planService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";

/**
 * Годовой План закупок и отчёт об исполнении (PRC-22, приложение №5).
 *
 * Факт по позиции считает сервер из заявок, сославшихся на её номер, поэтому
 * отчёт всегда сходится с реестром закупок, а не ведётся отдельно.
 */

function money(value: number): string {
    return value.toLocaleString("ru-RU");
}

export const ProcurementPlanPage = () => {
    const currentYear = new Date().getFullYear();

    const [year, setYear] = useState(currentYear);
    const [years, setYears] = useState<number[]>([]);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({code: "", subject: "", amount: 0, quarter: "", unitId: ""});

    const load = useCallback(async () => {
        try {
            setPlan(await planService.get(year));
        } catch {
            setError("Не удалось загрузить план закупок");
        }
    }, [year]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        planService.years().then(setYears).catch(() => undefined);
        organizationUnitService.getAll().then(setUnits).catch(() => undefined);
    }, [plan?.id]);

    const run = async (action: () => Promise<Plan>) => {
        try {
            setBusy(true);
            setError(null);
            setPlan(await action());
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    const approve = () => {
        if (!plan) return;
        const protocol = window.prompt("Протокол Правления, которым утверждён план:");
        if (!protocol?.trim()) return;
        return run(() => planService.approve(plan.id, protocol.trim()));
    };

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap"}}>
                <div style={{flex: 1}}>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>План закупок</h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        Приложение №5 к Положению · отчёт об исполнении считается из заявок года
                    </div>
                </div>

                <select value={year} onChange={e => setYear(Number(e.target.value))} style={{...input, width: 120}}>
                    {[...new Set([currentYear, currentYear + 1, ...years])].sort((a, b) => b - a).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {plan?.status === "Draft" && (
                    <button onClick={approve} disabled={busy} style={primaryButton}>Утвердить план</button>
                )}
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {!plan ? (
                <section style={card}>
                    <div style={{fontSize: 13, color: "#55617a", lineHeight: 1.7}}>
                        План закупок на {year} год не заведён. Заявки без позиции плана считаются
                        внеплановыми и идут по отдельной ветке согласования (PRC-03).
                    </div>
                    <button
                        onClick={() => run(() => planService.create(year))}
                        disabled={busy}
                        style={{...primaryButton, marginTop: 12}}
                    >
                        Завести план на {year} год
                    </button>
                </section>
            ) : (
                <>
                    <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12}}>
                        <Tile label="Статус" value={plan.statusTitle}
                              note={plan.approvalProtocol ?? undefined}/>
                        <Tile label="Плановая сумма" value={`${money(plan.plannedTotal)} сом`}/>
                        <Tile label="Фактически по заявкам" value={`${money(plan.actualTotal)} сом`}/>
                        <Tile
                            label="Внеплановые закупки"
                            value={`${plan.unplannedRequestCount} шт.`}
                            note={plan.unplannedAmount > 0 ? `на ${money(plan.unplannedAmount)} сом` : undefined}
                            danger={plan.unplannedRequestCount > 0}
                        />
                    </div>

                    <section style={{...card, padding: 0, overflow: "hidden"}}>
                        <div style={{overflowX: "auto"}}>
                            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                                <thead>
                                    <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                        <th style={th}>Позиция</th>
                                        <th style={th}>Предмет закупки</th>
                                        <th style={th}>Подразделение</th>
                                        <th style={th}>Кв.</th>
                                        <th style={{...th, textAlign: "right"}}>План</th>
                                        <th style={{...th, textAlign: "right"}}>Факт</th>
                                        <th style={{...th, textAlign: "right"}}>Отклонение</th>
                                        <th style={th}/>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.items.map(i => (
                                        <tr key={i.id} style={{
                                            borderTop: "1px solid #eef2f7",
                                            background: i.isOverrun ? "#fdf6f5" : undefined,
                                        }}>
                                            <td style={{...td, fontWeight: 600}}>{i.code}</td>
                                            <td style={td}>
                                                {i.subject}
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>{i.subjectKindTitle}</div>
                                            </td>
                                            <td style={td}>{i.orgUnitTitle ?? "—"}</td>
                                            <td style={td}>{i.quarter ?? "—"}</td>
                                            <td style={{...td, textAlign: "right", whiteSpace: "nowrap"}}>{money(i.plannedAmount)}</td>
                                            <td style={{...td, textAlign: "right", whiteSpace: "nowrap"}}>
                                                {money(i.actualAmount)}
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>{i.requestCount} заявок</div>
                                            </td>
                                            <td style={{
                                                ...td, textAlign: "right", whiteSpace: "nowrap",
                                                color: i.isOverrun ? "#c0392b" : "#55617a",
                                            }}>
                                                {i.deviationPercent === null
                                                    ? "—"
                                                    : `${i.deviationPercent > 0 ? "+" : ""}${i.deviationPercent}%`}
                                            </td>
                                            <td style={td}>
                                                {plan.status === "Draft" && i.requestCount === 0 && (
                                                    <button onClick={() => run(() => planService.removeItem(i.id))}
                                                            disabled={busy} style={linkButton}>исключить</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {plan.items.length === 0 && (
                            <div style={{padding: 24, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                                Позиций пока нет
                            </div>
                        )}
                    </section>

                    {plan.status === "Draft" && (
                        <section style={card}>
                            <div style={cardTitle}>Добавить позицию</div>
                            <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                                <input value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                                       placeholder="№ позиции, напр. п. 4.2" style={{...input, width: 180}}/>
                                <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                                       placeholder="Предмет закупки" style={{...input, flex: 1, minWidth: 200}}/>
                                <input type="number" value={form.amount || ""}
                                       onChange={e => setForm({...form, amount: Number(e.target.value) || 0})}
                                       placeholder="Плановая сумма" style={{...input, width: 160}}/>
                                <select value={form.quarter} onChange={e => setForm({...form, quarter: e.target.value})}
                                        style={{...input, width: 110}}>
                                    <option value="">квартал</option>
                                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>{q} кв.</option>)}
                                </select>
                                <select value={form.unitId} onChange={e => setForm({...form, unitId: e.target.value})}
                                        style={{...input, width: 220}}>
                                    <option value="">— подразделение —</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{u.titleRu}</option>)}
                                </select>
                                <button
                                    onClick={() => run(() => planService.addItem(plan.id, {
                                        code: form.code.trim(),
                                        subject: form.subject.trim(),
                                        plannedAmount: form.amount,
                                        quarter: form.quarter ? Number(form.quarter) : undefined,
                                        orgUnitId: form.unitId ? Number(form.unitId) : undefined,
                                    })).then(() => setForm({code: "", subject: "", amount: 0, quarter: "", unitId: ""}))}
                                    disabled={busy || !form.code.trim() || !form.subject.trim() || form.amount <= 0}
                                    style={secondaryButton}
                                >
                                    Добавить
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

const Tile = ({label, value, note, danger}: { label: string; value: string; note?: string; danger?: boolean }) => (
    <div style={{
        padding: "12px 14px", borderRadius: 12,
        background: danger ? "#fdf6f5" : "#fff",
        border: `1px solid ${danger ? "#f3c9c2" : "#e5e9f0"}`,
    }}>
        <div style={{fontSize: 11.5, color: "#8b97ab"}}>{label}</div>
        <div style={{marginTop: 4, fontSize: 17, fontWeight: 700, color: danger ? "#c0392b" : "#0f1b2d"}}>{value}</div>
        {note && <div style={{marginTop: 2, fontSize: 11.5, color: "#8b97ab"}}>{note}</div>}
    </div>
);

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab",
    textTransform: "uppercase", marginBottom: 10,
};

const input: React.CSSProperties = {
    height: 36, padding: "0 11px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const primaryButton: React.CSSProperties = {
    height: 36, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 36, padding: "0 14px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const linkButton: React.CSSProperties = {
    border: "none", background: "none", color: "#8b97ab", font: "inherit", fontSize: 12, cursor: "pointer",
};

const th: React.CSSProperties = {padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 12px", verticalAlign: "top", color: "#26324a"};
