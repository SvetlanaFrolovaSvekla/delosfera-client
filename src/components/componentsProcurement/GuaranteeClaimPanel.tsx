import {useCallback, useEffect, useState} from "react";
import {
    claimService,
    guaranteeService,
    type Claim,
    type Guarantee,
} from "@/service/procurementService/guaranteeService.ts";

/**
 * Гарантийные обеспечения (PRC-20) и претензионная работа (PRC-21) по закупке.
 *
 * ГОКЗ относится к конкурсу, ГОИД — к договору, поэтому панель получает оба id
 * и показывает то, что применимо. Просроченный возврат и неотвеченная претензия
 * подсвечиваются: и то и другое — деньги и сроки, а не просто записи.
 */

interface Props {
    tenderId?: number | null;
    contractId?: number | null;
    onChanged?: () => void;
}

function money(value: number): string {
    return `${value.toLocaleString("ru-RU")} сом`;
}

export const GuaranteeClaimPanel = ({tenderId, contractId, onChanged}: Props) => {
    const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [gForm, setGForm] = useState({supplier: "", amount: 0, validUntil: "", ref: ""});
    const [cForm, setCForm] = useState({violation: "", demand: "", amount: 0});

    const load = useCallback(async () => {
        try {
            const [g, c] = await Promise.all([
                guaranteeService.list({tenderId: tenderId ?? undefined, contractId: contractId ?? undefined}),
                contractId ? claimService.list({contractId}) : Promise.resolve([]),
            ]);
            setGuarantees(g);
            setClaims(c);
        } catch {
            setError("Не удалось загрузить обеспечения и претензии");
        }
    }, [tenderId, contractId]);

    useEffect(() => {
        void load();
    }, [load]);

    const run = async (action: () => Promise<unknown>) => {
        try {
            setBusy(true);
            setError(null);
            await action();
            await load();
            onChanged?.();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    // Обеспечения появляются только там, где есть к чему их привязать.
    if (!tenderId && !contractId) return null;

    const settle = (g: Guarantee, forfeit: boolean) => {
        const note = forfeit
            ? window.prompt(`Основание удержания обеспечения «${g.supplierTitle}»:`)?.trim()
            : window.prompt("Примечание к возврату (необязательно):")?.trim();

        if (forfeit && !note) return;
        return run(() => guaranteeService.settle(g.id, forfeit, note || undefined));
    };

    return (
        <section style={card}>
            <div style={cardTitle}>Гарантийные обеспечения и претензии</div>

            {error && <div style={{marginBottom: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}

            {guarantees.length > 0 && (
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 12}}>
                    <thead>
                        <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                            <th style={th}>Вид</th>
                            <th style={th}>Поставщик</th>
                            <th style={{...th, textAlign: "right"}}>Сумма</th>
                            <th style={th}>Действует до</th>
                            <th style={th}>Состояние</th>
                        </tr>
                    </thead>
                    <tbody>
                        {guarantees.map(g => (
                            <tr key={g.id} style={{
                                borderTop: "1px solid #eef2f7",
                                background: g.isReturnOverdue ? "#fdf6f5" : undefined,
                            }}>
                                <td style={td}>
                                    {g.kind === "BidSecurity" ? "ГОКЗ" : "ГОИД"}
                                    <div style={{fontSize: 11, color: "#8b97ab"}}>{g.formTitle}</div>
                                </td>
                                <td style={td}>{g.supplierTitle}</td>
                                <td style={{...td, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap"}}>
                                    {money(g.amount)}
                                </td>
                                <td style={td}>
                                    {g.validUntil}
                                    <div style={{fontSize: 11, color: g.isReturnOverdue ? "#c0392b" : "#8b97ab"}}>
                                        {g.isReturnOverdue
                                            ? `просрочен возврат на ${-g.daysLeft} дн.`
                                            : `осталось ${g.daysLeft} дн.`}
                                    </div>
                                </td>
                                <td style={td}>
                                    {g.returnedOn
                                        ? <span style={{color: "#1f8a4c"}}>возвращено {g.returnedOn}</span>
                                        : g.isForfeited
                                            ? <span style={{color: "#c0392b"}}>удержано · {g.note}</span>
                                            : (
                                                <div style={{display: "flex", gap: 6}}>
                                                    <button onClick={() => settle(g, false)} disabled={busy} style={smallButton}>Вернуть</button>
                                                    <button onClick={() => settle(g, true)} disabled={busy} style={smallButton}>Удержать</button>
                                                </div>
                                            )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16}}>
                <input value={gForm.supplier} onChange={e => setGForm({...gForm, supplier: e.target.value})}
                       placeholder="Поставщик" style={{...input, width: 200}}/>
                <input type="number" value={gForm.amount || ""}
                       onChange={e => setGForm({...gForm, amount: Number(e.target.value) || 0})}
                       placeholder="Сумма обеспечения" style={{...input, width: 170}}/>
                <input type="date" value={gForm.validUntil}
                       onChange={e => setGForm({...gForm, validUntil: e.target.value})}
                       title="Действует до" style={{...input, width: 165}}/>
                <input value={gForm.ref} onChange={e => setGForm({...gForm, ref: e.target.value})}
                       placeholder="Реквизиты п/п или БГ" style={{...input, width: 190}}/>
                <button
                    onClick={() => run(() => guaranteeService.create({
                        kind: contractId ? "PerformanceSecurity" : "BidSecurity",
                        tenderId: contractId ? undefined : tenderId ?? undefined,
                        contractId: contractId ?? undefined,
                        supplierTitle: gForm.supplier.trim(),
                        amount: gForm.amount,
                        validUntil: gForm.validUntil,
                        documentRef: gForm.ref.trim() || undefined,
                    })).then(() => setGForm({supplier: "", amount: 0, validUntil: "", ref: ""}))}
                    disabled={busy || !gForm.supplier.trim() || gForm.amount <= 0 || !gForm.validUntil}
                    style={secondaryButton}
                >
                    Принять {contractId ? "ГОИД" : "ГОКЗ"}
                </button>
            </div>

            {/* Претензии ведутся по договору: без него нарушать нечего. */}
            {contractId && (
                <>
                    <div style={{...cardTitle, marginTop: 4}}>Претензии по договору</div>

                    {claims.map(c => (
                        <div key={c.id} style={{
                            padding: "10px 12px", borderRadius: 10, marginBottom: 6,
                            background: c.isResponseOverdue ? "#fdf6f5" : "#f6f8fb",
                        }}>
                            <div style={{display: "flex", alignItems: "center", gap: 10}}>
                                <span style={{fontWeight: 600, color: "#26324a"}}>{c.regNumber}</span>
                                <span style={{fontSize: 12, color: "#55617a"}}>{c.statusTitle}</span>
                                {c.amount && <span style={{fontSize: 12, color: "#55617a"}}>· {money(c.amount)}</span>}
                                <div style={{flex: 1}}/>
                                {c.status === "Draft" && (
                                    <button onClick={() => run(() => claimService.send(c.id))} disabled={busy} style={smallButton}>
                                        Направить
                                    </button>
                                )}
                                {c.status === "Sent" && (
                                    <button
                                        onClick={() => {
                                            const response = window.prompt("Ответ контрагента:");
                                            if (!response?.trim()) return;
                                            return run(() => claimService.answer(c.id, response.trim()));
                                        }}
                                        disabled={busy}
                                        style={smallButton}
                                    >
                                        Ответ получен
                                    </button>
                                )}
                                {c.status === "Answered" && (
                                    <button
                                        onClick={() => {
                                            const outcome = window.prompt("Итог претензионной работы:");
                                            if (!outcome?.trim()) return;
                                            return run(() => claimService.close(c.id, "Satisfied", outcome.trim()));
                                        }}
                                        disabled={busy}
                                        style={smallButton}
                                    >
                                        Удовлетворена
                                    </button>
                                )}
                            </div>
                            <div style={{marginTop: 4, fontSize: 12, color: "#55617a"}}>
                                {c.violation}
                                {c.demand && ` · требование: ${c.demand}`}
                            </div>
                            {c.sentOn && (
                                <div style={{marginTop: 2, fontSize: 11.5, color: c.isResponseOverdue ? "#c0392b" : "#8b97ab"}}>
                                    направлена {c.sentOn} · ответ до {c.responseDeadline}
                                    {c.isResponseOverdue && " — срок ответа истёк"}
                                    {c.answeredOn && ` · ответ ${c.answeredOn}`}
                                </div>
                            )}
                            {c.outcome && <div style={{marginTop: 2, fontSize: 11.5, color: "#1f8a4c"}}>{c.outcome}</div>}
                        </div>
                    ))}

                    <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8}}>
                        <input value={cForm.violation} onChange={e => setCForm({...cForm, violation: e.target.value})}
                               placeholder="Нарушение условий договора" style={{...input, flex: 1, minWidth: 220}}/>
                        <input value={cForm.demand} onChange={e => setCForm({...cForm, demand: e.target.value})}
                               placeholder="Требование Банка" style={{...input, flex: 1, minWidth: 200}}/>
                        <input type="number" value={cForm.amount || ""}
                               onChange={e => setCForm({...cForm, amount: Number(e.target.value) || 0})}
                               placeholder="Сумма" style={{...input, width: 140}}/>
                        <button
                            onClick={() => run(() => claimService.create(contractId, {
                                violation: cForm.violation.trim(),
                                demand: cForm.demand.trim() || undefined,
                                amount: cForm.amount || undefined,
                            })).then(() => setCForm({violation: "", demand: "", amount: 0}))}
                            disabled={busy || !cForm.violation.trim()}
                            style={secondaryButton}
                        >
                            Зафиксировать нарушение
                        </button>
                    </div>
                </>
            )}
        </section>
    );
};

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab",
    textTransform: "uppercase", marginBottom: 10,
};

const input: React.CSSProperties = {
    height: 34, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const secondaryButton: React.CSSProperties = {
    height: 34, padding: "0 13px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const smallButton: React.CSSProperties = {
    height: 28, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
};

const th: React.CSSProperties = {padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "9px 10px", verticalAlign: "top", color: "#26324a"};
