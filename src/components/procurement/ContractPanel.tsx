import {useCallback, useEffect, useState} from "react";
import {contractService, type Contract} from "@/service/procurementService/contractService.ts";

/**
 * Договор по итогам закупки и контроль исполнения (PRC-18/19) на карточке:
 * реквизиты, акты приёма-передачи и их утверждение.
 *
 * Требования к визам считает сервер: акт свыше порога дополнительно утверждает
 * курирующий член Правления, и только после начальника подразделения.
 */

interface Props {
    requestId: number;
    onChanged?: () => void;
}

function money(value: number): string {
    return `${value.toLocaleString("ru-RU")} сом`;
}

export const ContractPanel = ({requestId, onChanged}: Props) => {
    const [contract, setContract] = useState<Contract | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({signedOn: "", deliveryDeadline: "", paymentDeadline: ""});
    const [actForm, setActForm] = useState({number: "", amount: 0, subject: "", actDate: ""});

    const load = useCallback(async () => {
        try {
            const list = await contractService.list(requestId);
            // Расторгнутые договоры остаются в истории, но карточка показывает действующий.
            setContract(list.find(c => c.status !== "Terminated") ?? list[0] ?? null);
        } catch {
            setError("Не удалось загрузить договор");
        } finally {
            setLoaded(true);
        }
    }, [requestId]);

    useEffect(() => {
        void load();
    }, [load]);

    const run = async (action: () => Promise<Contract>) => {
        try {
            setBusy(true);
            setError(null);
            setContract(await action());
            onChanged?.();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    if (!loaded) return null;

    if (!contract) {
        return (
            <section style={card}>
                <div style={cardTitle}>Договор</div>
                <div style={{marginTop: 6, fontSize: 13, color: "#55617a", lineHeight: 1.7}}>
                    Договор заключается с победителем закупки — после протокола или решения комиссии.
                </div>
                {error && <div style={{marginTop: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}
                <div style={{display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center"}}>
                    <input type="date" value={form.signedOn} onChange={e => setForm({...form, signedOn: e.target.value})}
                           title="Дата подписания" style={{...input, width: 165}}/>
                    <input type="date" value={form.deliveryDeadline}
                           onChange={e => setForm({...form, deliveryDeadline: e.target.value})}
                           title="Срок поставки" style={{...input, width: 165}}/>
                    <button
                        onClick={() => run(() => contractService.create(requestId, {
                            signedOn: form.signedOn || undefined,
                            deliveryDeadline: form.deliveryDeadline || undefined,
                        }))}
                        disabled={busy}
                        style={primaryButton}
                    >
                        Заключить договор
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section style={card}>
            <div style={{display: "flex", alignItems: "center", gap: 10}}>
                <div>
                    <div style={cardTitle}>Договор {contract.regNumber}</div>
                    <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                        {contract.supplierTitle} · {money(contract.amount)}
                        {contract.tenderRegNumber && ` · по конкурсу ${contract.tenderRegNumber}`}
                        {!contract.tenderRegNumber && contract.protocolRegNumber && ` · по протоколу ${contract.protocolRegNumber}`}
                    </div>
                </div>
                <div style={{flex: 1}}/>
                <span style={{
                    padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                    background: contract.status === "Completed" ? "#eefaf1"
                        : contract.status === "Terminated" ? "#fdeeec" : "#f2f5f9",
                    color: contract.status === "Completed" ? "#1f8a4c"
                        : contract.status === "Terminated" ? "#c0392b" : "#55617a",
                }}>
                    {contract.statusTitle}
                </span>
            </div>

            <div style={{marginTop: 10, fontSize: 12, color: "#8b97ab"}}>{contract.responsibleRule}</div>

            {error && <div style={{marginTop: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}

            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12}}>
                <Fact label="Подписан" value={contract.signedOn ?? "—"}/>
                <Fact label="Срок поставки" value={contract.deliveryDeadline ?? "—"} danger={contract.isDeliveryOverdue}/>
                <Fact label="Срок оплаты" value={contract.paymentDeadline ?? "—"}/>
                <Fact label="Принято по актам" value={money(contract.acceptedAmount)}/>
            </div>

            {contract.blockers.length > 0 && (
                <ul style={{margin: "12px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#8a5a00", lineHeight: 1.7}}>
                    {contract.blockers.map(b => <li key={b}>{b}</li>)}
                </ul>
            )}

            <div style={{...sectionTitle, marginTop: 16}}>Акты приёма-передачи</div>

            {contract.acts.length > 0 && (
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <thead>
                        <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                            <th style={th}>№ и дата</th>
                            <th style={{...th, textAlign: "right"}}>Сумма</th>
                            <th style={th}>Начальник СП</th>
                            <th style={th}>Куратор Правления</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contract.acts.map(a => (
                            <tr key={a.id} style={{borderTop: "1px solid #eef2f7", background: a.isApproved ? "#f8fdfa" : undefined}}>
                                <td style={td}>
                                    <div style={{fontWeight: 600}}>№ {a.number}</div>
                                    <div style={{fontSize: 11, color: "#8b97ab"}}>{a.actDate}{a.subject && ` · ${a.subject}`}</div>
                                </td>
                                <td style={{...td, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap"}}>{money(a.amount)}</td>
                                <td style={td}>
                                    {a.approvedByUnitHead
                                        ? <span style={{color: "#1f8a4c"}}>{a.approvedByUnitHead}</span>
                                        : <button onClick={() => run(() => contractService.approveAct(a.id))}
                                                  disabled={busy} style={secondaryButton}>Утвердить</button>}
                                </td>
                                <td style={td}>
                                    {!a.requiresCuratorApproval
                                        ? <span style={{color: "#8b97ab"}}>не требуется</span>
                                        : a.approvedByCurator
                                            ? <span style={{color: "#1f8a4c"}}>{a.approvedByCurator}</span>
                                            : <button onClick={() => run(() => contractService.approveAct(a.id, true))}
                                                      disabled={busy} style={secondaryButton}>Утвердить</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {contract.status !== "Terminated" && contract.status !== "Completed" && (
                <div style={{display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap"}}>
                    <input value={actForm.number} onChange={e => setActForm({...actForm, number: e.target.value})}
                           placeholder="№ акта" style={{...input, width: 130}}/>
                    <input type="number" value={actForm.amount || ""}
                           onChange={e => setActForm({...actForm, amount: Number(e.target.value) || 0})}
                           placeholder="Сумма" style={{...input, width: 150}}/>
                    <input value={actForm.subject} onChange={e => setActForm({...actForm, subject: e.target.value})}
                           placeholder="Предмет акта" style={{...input, flex: 1, minWidth: 180}}/>
                    <button
                        onClick={() => run(() => contractService.addAct(contract.id, {
                            number: actForm.number.trim(),
                            amount: actForm.amount,
                            subject: actForm.subject.trim() || undefined,
                        }))}
                        disabled={busy || !actForm.number.trim() || actForm.amount <= 0}
                        style={secondaryButton}
                    >
                        Зарегистрировать акт
                    </button>
                </div>
            )}
        </section>
    );
};

const Fact = ({label, value, danger}: { label: string; value: string; danger?: boolean }) => (
    <div style={{padding: "9px 11px", borderRadius: 10, background: danger ? "#fdeeec" : "#f6f8fb"}}>
        <div style={{fontSize: 11, color: "#8b97ab"}}>{label}</div>
        <div style={{marginTop: 3, fontSize: 13, fontWeight: 600, color: danger ? "#c0392b" : "#26324a"}}>{value}</div>
    </div>
);

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab", textTransform: "uppercase",
};

const sectionTitle: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 600, color: "#0f1b2d", marginBottom: 8,
};

const input: React.CSSProperties = {
    height: 34, padding: "0 10px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const primaryButton: React.CSSProperties = {
    height: 34, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 30, padding: "0 12px", border: "1px solid #e5e9f0", borderRadius: 8,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const th: React.CSSProperties = {padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "9px 10px", verticalAlign: "top", color: "#26324a"};
