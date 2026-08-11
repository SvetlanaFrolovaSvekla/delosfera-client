import {useCallback, useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {
    protocolService,
    SIGNER_ROLE_LABEL,
    type Protocol,
    type ProtocolSignerRole,
} from "@/service/procurementService/protocolService.ts";

/**
 * Печатная форма протокола закупки (экран v8 isProto2, приложение к Положению).
 *
 * Страница печатается как есть: при печати скрываются панель действий и всё,
 * что не входит в документ, а сам лист верстается под A4.
 */

const SIGNER_ROLES: ProtocolSignerRole[] = [1, 2, 3];

function money(value: number | null): string {
    return value === null ? "—" : `${value.toLocaleString("ru-RU")} сом`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ru-RU");
}

export const ProcurementProtocolPage = () => {
    const {id} = useParams<{ id: string }>();
    const requestId = Number(id);

    const [protocol, setProtocol] = useState<Protocol | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [notes, setNotes] = useState({
        budgetNote: "", expertOpinion: "", dissentingOpinion: "", recommendations: "", selectionBasis: "",
    });

    const load = useCallback(async () => {
        try {
            const p = await protocolService.get(requestId);
            setProtocol(p);
            if (p) {
                setNotes({
                    budgetNote: p.budgetNote ?? "",
                    expertOpinion: p.expertOpinion ?? "",
                    dissentingOpinion: p.dissentingOpinion ?? "",
                    recommendations: p.recommendations ?? "",
                    selectionBasis: p.selectionBasis ?? "",
                });
            }
        } catch {
            setError("Не удалось загрузить протокол");
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        void load();
    }, [load]);

    const run = async (action: () => Promise<Protocol>) => {
        try {
            setBusy(true);
            setError(null);
            setProtocol(await action());
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div style={{padding: 24, color: "#8b97ab"}}>Загрузка протокола…</div>;

    if (!protocol) {
        return (
            <div style={{padding: "22px 26px"}}>
                <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                    <Link to={`/prc/${requestId}`} style={{color: "#8b97ab", textDecoration: "none"}}>Карточка закупки</Link>
                </div>
                <h1 style={{margin: "4px 0 12px", fontSize: 19, fontWeight: 700}}>Протокол закупки</h1>
                <p style={{fontSize: 13, color: "#55617a", maxWidth: 640, lineHeight: 1.7}}>
                    Протокол ещё не сформирован. Он собирается из сравнительной таблицы после
                    определения победителя и требуется при сумме свыше установленного порога (PRC-10).
                </p>
                {error && <div style={{color: "#e0483d", fontSize: 13, marginBottom: 10}}>{error}</div>}
                <button onClick={() => run(() => protocolService.generate(requestId))} disabled={busy} style={primaryButton}>
                    {busy ? "Формирование…" : "Сформировать протокол"}
                </button>
            </div>
        );
    }

    const signedRoles = new Set(protocol.signatures.filter(s => !s.revoked).map(s => s.role));

    return (
        <div style={{padding: "18px 26px 40px"}}>
            {/* панель действий — не печатается */}
            <div data-no-print style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap"}}>
                <Link to={`/prc/${requestId}`} style={{fontSize: 12.5, color: "#8b97ab", textDecoration: "none"}}>
                    ← Карточка закупки
                </Link>
                <div style={{flex: 1}}/>
                <span style={{
                    padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                    color: protocol.status === 3 ? "#1f8a4c" : "#55617a",
                    background: protocol.status === 3 ? "#eefaf1" : "#f2f5f9",
                }}>
                    {protocol.statusTitle}
                </span>
                <button onClick={() => window.print()} style={secondaryButton}>Печать</button>
                <button onClick={() => run(() => protocolService.generate(requestId))} disabled={busy} style={secondaryButton}>
                    Пересобрать
                </button>
                {SIGNER_ROLES.filter(r => !signedRoles.has(r)).map(r => (
                    <button
                        key={r}
                        onClick={() => run(() => protocolService.sign(requestId, r))}
                        disabled={busy || protocol.blockers.length > 0}
                        title={protocol.blockers.length > 0 ? protocol.blockers.join("; ") : undefined}
                        style={{...primaryButton, opacity: protocol.blockers.length > 0 ? 0.5 : 1}}
                    >
                        Подписать: {SIGNER_ROLE_LABEL[r]}
                    </button>
                ))}
            </div>

            {error && <div data-no-print style={{color: "#e0483d", fontSize: 13, marginBottom: 12}}>{error}</div>}

            {protocol.blockers.length > 0 && (
                <div data-no-print style={{
                    marginBottom: 16, padding: 14, borderRadius: 11,
                    border: "1px solid #f0c98a", background: "#fffaf0",
                }}>
                    <div style={{fontSize: 13, fontWeight: 600, color: "#8a5a00"}}>Протокол нельзя подписать:</div>
                    <ul style={{margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#8a5a00", lineHeight: 1.7}}>
                        {protocol.blockers.map(b => <li key={b}>{b}</li>)}
                    </ul>
                </div>
            )}

            {/* ------------- ЛИСТ ПРОТОКОЛА ------------- */}
            <div style={sheet}>
                <div style={{display: "flex", justifyContent: "space-between", fontSize: 11, color: "#55617a"}}>
                    <div>
                        <div style={{fontWeight: 700, color: "#0f1b2d"}}>ОАО «Керемет Банк»</div>
                        <div>г. Бишкек, пр. Чуй 219 · ИНН 02508201310035</div>
                    </div>
                    <div style={{textAlign: "right"}}>
                        <div>СЭД «Делосфера»</div>
                        <div>Экз. № 1</div>
                    </div>
                </div>

                <div style={{marginTop: 18, textAlign: "right", fontSize: 11, color: "#55617a"}}>
                    Приложение к Положению о закупках
                </div>

                <div style={{marginTop: 10, textAlign: "center"}}>
                    <div style={{fontSize: 15, fontWeight: 700, letterSpacing: ".02em"}}>
                        ПРОТОКОЛ при закупке методом
                    </div>
                    <div style={{fontSize: 15, fontWeight: 700}}>«{protocol.methodTitle}»</div>
                    <div style={{marginTop: 8, fontSize: 12, color: "#55617a"}}>
                        № {protocol.regNumber ?? "б/н"} от {formatDate(protocol.protocolDate)}
                    </div>
                </div>

                <table style={{width: "100%", marginTop: 20, fontSize: 12.5, borderCollapse: "collapse"}}>
                    <tbody>
                        <tr>
                            <td style={labelCell}>Наименование закупки</td>
                            <td style={valueCell}>{protocol.subject}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>Структурное подразделение</td>
                            <td style={valueCell}>{protocol.initiatorUnitTitle ?? "—"}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={sectionTitle}>Сравнительная таблица предложений</div>
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 11.5}}>
                    <thead>
                        <tr style={{background: "#f6f8fb"}}>
                            <th style={pth}>№</th>
                            <th style={pth}>Вариант (поставщик)</th>
                            <th style={{...pth, textAlign: "right"}}>Цена</th>
                            <th style={pth}>Краткая тех. характеристика</th>
                            <th style={pth}>Срок поставки</th>
                            <th style={pth}>Условия оплаты</th>
                            <th style={pth}>Заключение инициатора</th>
                        </tr>
                    </thead>
                    <tbody>
                        {protocol.rows.map(r => (
                            <tr key={r.order} style={{background: r.isWinner ? "#eefaf1" : undefined}}>
                                <td style={ptd}>{r.order}</td>
                                <td style={ptd}>
                                    <div style={{fontWeight: r.isWinner ? 700 : 500}}>{r.supplierTitle}</div>
                                    {r.supplierInn && <div style={{fontSize: 10.5, color: "#8b97ab"}}>ИНН {r.supplierInn}</div>}
                                </td>
                                <td style={{...ptd, textAlign: "right", whiteSpace: "nowrap"}}>{money(r.price)}</td>
                                <td style={ptd}>{r.specification ?? "—"}</td>
                                <td style={ptd}>{r.deliveryTerms ?? "—"}</td>
                                <td style={ptd}>{r.paymentTerms ?? "—"}</td>
                                <td style={ptd}>{r.initiatorConclusion}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={sectionTitle}>Определить поставщиком и заключить договор</div>
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <tbody>
                        <tr>
                            <td style={labelCell}>Основной поставщик</td>
                            <td style={valueCell}>
                                <b>{protocol.mainSupplierTitle ?? "—"}</b> · {money(protocol.mainAmount)}
                            </td>
                        </tr>
                        <tr>
                            <td style={labelCell}>Резервный поставщик</td>
                            <td style={valueCell}>
                                {protocol.reserveSupplierTitle
                                    ? <>{protocol.reserveSupplierTitle} · {money(protocol.reserveAmount)}</>
                                    : "не определён"}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* разделы, заполняемые вручную */}
                <div style={sectionTitle}>Заключения и особые отметки</div>
                <div data-no-print style={{display: "grid", gap: 10, marginBottom: 12}}>
                    {protocol.requiresSelectionBasis && (
                        <Field
                            label="Основание выбора (победитель не с наименьшей ценой)"
                            value={notes.selectionBasis}
                            onChange={v => setNotes({...notes, selectionBasis: v})}
                        />
                    )}
                    <Field label="Виза УПиА о наличии средств в пределах бюджета" value={notes.budgetNote}
                           onChange={v => setNotes({...notes, budgetNote: v})}/>
                    <Field label="Оценка эксперта / технического координатора" value={notes.expertOpinion}
                           onChange={v => setNotes({...notes, expertOpinion: v})}/>
                    <Field label="Особое мнение члена комиссии" value={notes.dissentingOpinion}
                           onChange={v => setNotes({...notes, dissentingOpinion: v})}/>
                    <Field label="Рекомендации" value={notes.recommendations}
                           onChange={v => setNotes({...notes, recommendations: v})}/>
                    <button onClick={() => run(() => protocolService.update(requestId, notes))} disabled={busy} style={secondaryButton}>
                        Сохранить разделы
                    </button>
                </div>

                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <tbody>
                        {protocol.requiresSelectionBasis && (
                            <tr>
                                <td style={labelCell}>Основание выбора</td>
                                <td style={valueCell}>{protocol.selectionBasis ?? "—"}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={labelCell}>Виза УПиА</td>
                            <td style={valueCell}>{protocol.budgetNote ?? "—"}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>Оценка эксперта</td>
                            <td style={valueCell}>{protocol.expertOpinion ?? "—"}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>Особое мнение</td>
                            <td style={valueCell}>{protocol.dissentingOpinion ?? "—"}</td>
                        </tr>
                        <tr>
                            <td style={labelCell}>Рекомендации</td>
                            <td style={valueCell}>{protocol.recommendations ?? "—"}</td>
                        </tr>
                    </tbody>
                </table>

                {/* подписи */}
                <div style={{marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, fontSize: 12}}>
                    {SIGNER_ROLES.slice(0, 2).map(role => {
                        const sign = protocol.signatures.find(s => s.role === role && !s.revoked);
                        return (
                            <div key={role}>
                                <div style={{color: "#55617a"}}>{SIGNER_ROLE_LABEL[role]}</div>
                                <div style={{marginTop: 6, fontWeight: 600}}>{sign?.userName ?? "________________"}</div>
                                <div style={{marginTop: 3, fontSize: 11, color: sign ? "#1f8a4c" : "#8b97ab"}}>
                                    {sign ? `${sign.levelTitle} · подписано ${formatDate(sign.at)}` : "не подписано"}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{marginTop: 22, fontSize: 12}}>
                    <div style={{color: "#55617a"}}>Утверждаю:</div>
                    <div style={{marginTop: 6}}>
                        Заместитель Председателя Правления (курирующий сектор закупок) —{" "}
                        {(() => {
                            const sign = protocol.signatures.find(s => s.role === 3 && !s.revoked);
                            return sign
                                ? <b>{sign.userName} · {sign.levelTitle} · {formatDate(sign.at)}</b>
                                : <span>________________</span>;
                        })()}
                    </div>
                </div>

                {protocol.signatures.some(s => s.revoked) && (
                    <div data-no-print style={{marginTop: 18, fontSize: 11.5, color: "#c77700"}}>
                        Аннулированные подписи:{" "}
                        {protocol.signatures.filter(s => s.revoked).map(s => `${s.roleTitle} (${s.revokedReason})`).join("; ")}
                    </div>
                )}
            </div>

            <style>{`
                @media print {
                    [data-no-print] { display: none !important; }
                    [data-app-rail], [data-app-topbar], aside, header, nav { display: none !important; }
                    @page { size: A4; margin: 15mm 14mm 16mm; }
                    body { background: #fff !important; }
                }
            `}</style>
        </div>
    );
};

const Field = ({label, value, onChange}: { label: string; value: string; onChange: (v: string) => void }) => (
    <label style={{display: "block"}}>
        <span style={{display: "block", fontSize: 12, fontWeight: 600, color: "#55617a", marginBottom: 5}}>{label}</span>
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={2}
            style={{
                width: "100%", padding: "9px 11px", border: "1px solid #e5e9f0", borderRadius: 9,
                background: "#f6f8fb", font: "inherit", fontSize: 12.5, resize: "vertical", outline: "none",
            }}
        />
    </label>
);

const sheet: React.CSSProperties = {
    maxWidth: 900,
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: 13,
    padding: "28px 32px 34px",
};

const sectionTitle: React.CSSProperties = {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#0f1b2d",
};

const labelCell: React.CSSProperties = {
    width: 260, padding: "7px 10px 7px 0", color: "#55617a", verticalAlign: "top",
};

const valueCell: React.CSSProperties = {
    padding: "7px 0", color: "#0f1b2d", verticalAlign: "top",
};

const pth: React.CSSProperties = {
    padding: "7px 9px", border: "1px solid #e5e9f0", fontWeight: 600, textAlign: "left", color: "#55617a",
};

const ptd: React.CSSProperties = {
    padding: "7px 9px", border: "1px solid #e5e9f0", verticalAlign: "top", color: "#26324a",
};

const primaryButton: React.CSSProperties = {
    height: 34, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 34, padding: "0 14px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};
