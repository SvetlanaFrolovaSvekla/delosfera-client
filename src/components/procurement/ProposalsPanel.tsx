import {useCallback, useEffect, useState} from "react";
import {Check, Plus, Trophy, X} from "lucide-react";
import {
    proposalService,
    type Proposal,
    type ProposalComparison,
} from "@/service/procurementService/proposalService.ts";
import {attachmentService, formatFileSize, type Attachment} from "@/service/documentService/attachmentService.ts";

/**
 * Коммерческие предложения и сравнительная таблица (PRC-09/11/12) на карточке закупки.
 * Победитель выбирается среди технически подходящих предложений; строка с наименьшей
 * ценой помечена как рекомендованная, отклонённые и поставщики из чёрного списка гасятся.
 */

interface Props {
    requestId: number;

    /** Документ закупки: из его вложений выбираются файлы предложения. */
    documentId?: number;

    /** Способ закупки требует минимум предложений — показываем прогресс сбора. */
    onChanged?: () => void;
}

function money(value: number): string {
    return `${value.toLocaleString("ru-RU")} сом`;
}

export const ProposalsPanel = ({requestId, documentId, onChanged}: Props) => {
    const [data, setData] = useState<ProposalComparison | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);

    /** Предложение, у которого сейчас правят файлы и ссылку. */
    const [sourcesFor, setSourcesFor] = useState<number | null>(null);
    const [sourcesDraft, setSourcesDraft] = useState<{ids: number[]; link: string}>({ids: [], link: ""});
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const [form, setForm] = useState({
        supplierTitle: "",
        supplierInn: "",
        price: 0,
        deliveryDays: "",
        warrantyMonths: "",
        paymentTerms: "",
        specification: "",
    });

    const load = useCallback(async () => {
        try {
            setData(await proposalService.comparison(requestId));
        } catch {
            setError("Не удалось загрузить предложения");
        }
    }, [requestId]);

    useEffect(() => {
        void load();
    }, [load]);

    /**
     * Файлы предложения берутся из вложений закупки: поставщик присылает пачку
     * документов, они ложатся в карточку, а здесь отмечается, что относится к КП.
     */
    const openSources = (proposal: Proposal) => {
        setSourcesDraft({
            ids: proposal.files.map(f => f.attachmentId),
            link: proposal.externalLink ?? "",
        });
        setSourcesFor(proposal.id);

        if (documentId) {
            attachmentService.list(documentId).then(setAttachments).catch(() => setAttachments([]));
        }
    };

    const toggleFile = (attachmentId: number) => setSourcesDraft(prev => ({
        ...prev,
        ids: prev.ids.includes(attachmentId)
            ? prev.ids.filter(id => id !== attachmentId)
            : [...prev.ids, attachmentId],
    }));

    const run = async (action: () => Promise<ProposalComparison>) => {
        try {
            setBusy(true);
            setError(null);
            setData(await action());
            onChanged?.();
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Операция не выполнена");
        } finally {
            setBusy(false);
        }
    };

    const add = async () => {
        await run(() => proposalService.add(requestId, {
            supplierTitle: form.supplierTitle.trim(),
            supplierInn: form.supplierInn.trim() || undefined,
            price: form.price,
            deliveryDays: form.deliveryDays ? Number(form.deliveryDays) : undefined,
            warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : undefined,
            paymentTerms: form.paymentTerms.trim() || undefined,
            specification: form.specification.trim() || undefined,
        }));
        setForm({
            supplierTitle: "", supplierInn: "", price: 0,
            deliveryDays: "", warrantyMonths: "", paymentTerms: "", specification: "",
        });
        setAdding(false);
    };

    const reject = async (p: Proposal) => {
        const reason = window.prompt(`Причина отклонения предложения «${p.supplierTitle}»:`);
        if (!reason?.trim()) return;
        await run(() => proposalService.verdict(p.id, false, reason.trim()));
    };

    if (!data) return <div style={{color: "#8b97ab", fontSize: 13}}>Загрузка предложений…</div>;

    const progress = data.minProposals > 0
        ? `${data.receivedCount} из ${data.minProposals}`
        : `${data.receivedCount}`;

    return (
        <section style={card}>
            <div style={{display: "flex", alignItems: "center", gap: 12}}>
                <div style={{flex: 1}}>
                    <div style={cardTitle}>Коммерческие предложения</div>
                    <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                        Собрано {progress}
                        {data.minProposals > 0 && ` · способ «${data.methodTitle}» требует не менее ${data.minProposals}`}
                    </div>
                </div>
                <button onClick={() => setAdding(v => !v)} style={secondaryButton}>
                    <Plus size={15}/> Добавить КП
                </button>
            </div>

            {error && <div style={{marginTop: 10, color: "#e0483d", fontSize: 12.5}}>{error}</div>}

            {adding && (
                <div style={{marginTop: 14, padding: 14, borderRadius: 11, background: "#f6f8fb", display: "grid", gap: 10}}>
                    <div style={{display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10}}>
                        <input
                            value={form.supplierTitle}
                            onChange={e => setForm({...form, supplierTitle: e.target.value})}
                            placeholder="Поставщик (наименование)"
                            style={input}
                        />
                        <input
                            value={form.supplierInn}
                            onChange={e => setForm({...form, supplierInn: e.target.value})}
                            placeholder="ИНН"
                            style={input}
                        />
                        <input
                            type="number"
                            value={form.price || ""}
                            onChange={e => setForm({...form, price: Number(e.target.value) || 0})}
                            placeholder="Цена, сом"
                            style={input}
                        />
                    </div>
                    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10}}>
                        <input
                            type="number"
                            value={form.deliveryDays}
                            onChange={e => setForm({...form, deliveryDays: e.target.value})}
                            placeholder="Срок поставки, дней"
                            style={input}
                        />
                        <input
                            type="number"
                            value={form.warrantyMonths}
                            onChange={e => setForm({...form, warrantyMonths: e.target.value})}
                            placeholder="Гарантия, мес."
                            style={input}
                        />
                        <input
                            value={form.paymentTerms}
                            onChange={e => setForm({...form, paymentTerms: e.target.value})}
                            placeholder="Условия оплаты"
                            style={input}
                        />
                    </div>
                    <input
                        value={form.specification}
                        onChange={e => setForm({...form, specification: e.target.value})}
                        placeholder="Технические характеристики предложения"
                        style={input}
                    />
                    <div style={{display: "flex", gap: 8}}>
                        <button
                            onClick={add}
                            disabled={busy || !form.supplierTitle.trim() || form.price <= 0}
                            style={{...primaryButton, opacity: busy || !form.supplierTitle.trim() || form.price <= 0 ? 0.5 : 1}}
                        >
                            Зарегистрировать
                        </button>
                        <button onClick={() => setAdding(false)} style={secondaryButton}>Отмена</button>
                    </div>
                </div>
            )}

            {sourcesFor !== null && (
                <div style={{
                    marginTop: 12, padding: 12, borderRadius: 10,
                    border: "1px solid #cbddff", background: "#f5f8ff",
                }}>
                    <div style={{fontSize: 12.5, fontWeight: 600, color: "#0f1b2d"}}>
                        Файлы предложения и ссылка
                    </div>

                    <div style={{marginTop: 8, display: "flex", flexDirection: "column", gap: 5}}>
                        {attachments.length === 0 && (
                            <div style={{fontSize: 11.5, color: "#8b97ab"}}>
                                Приложите файлы к карточке закупки — здесь они появятся списком
                            </div>
                        )}
                        {attachments.map(a => (
                            <label key={a.id} style={{display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#26324a"}}>
                                <input
                                    type="checkbox"
                                    checked={sourcesDraft.ids.includes(a.id)}
                                    onChange={() => toggleFile(a.id)}
                                    style={{accentColor: "#2f68f5"}}
                                />
                                {a.fileName}
                                <span style={{color: "#a6b0c2", fontSize: 11}}>{formatFileSize(a.size)}</span>
                            </label>
                        ))}
                    </div>

                    <input
                        value={sourcesDraft.link}
                        onChange={e => setSourcesDraft({...sourcesDraft, link: e.target.value})}
                        placeholder="https://nextcloud.keremetbank.kg/s/…"
                        style={{...input, width: "100%", marginTop: 10}}
                    />

                    <div style={{display: "flex", gap: 8, marginTop: 10, alignItems: "center"}}>
                        <button
                            onClick={() => run(async () => {
                                const updated = await proposalService.setSources(sourcesFor, {
                                    attachmentIds: sourcesDraft.ids,
                                    externalLink: sourcesDraft.link.trim() || null,
                                });
                                setSourcesFor(null);
                                return updated;
                            })}
                            disabled={busy}
                            style={secondaryButton}
                        >
                            Сохранить
                        </button>
                        <button onClick={() => setSourcesFor(null)} disabled={busy} style={linkButton}>
                            отмена
                        </button>
                    </div>
                </div>
            )}

            <div style={{marginTop: 14, overflowX: "auto"}}>
                <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                    <thead>
                        <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                            <th style={th}>Поставщик</th>
                            <th style={{...th, textAlign: "right"}}>Цена</th>
                            <th style={{...th, textAlign: "right"}}>Отклонение</th>
                            <th style={th}>Срок / гарантия</th>
                            <th style={th}>Файлы и ссылка</th>
                            <th style={th}>Техтребования</th>
                            <th style={th}>Решение</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.proposals.map(p => {
                            const excluded = p.meetsRequirements === false || p.supplierBlacklisted;
                            const recommended = data.recommendedProposalId === p.id && !p.isWinner;
                            return (
                                <tr
                                    key={p.id}
                                    style={{
                                        borderTop: "1px solid #eef2f7",
                                        background: p.isWinner ? "#eefaf1" : recommended ? "#f7faff" : undefined,
                                        opacity: excluded ? 0.55 : 1,
                                    }}
                                >
                                    <td style={td}>
                                        <div style={{fontWeight: 600}}>{p.supplierTitle}</div>
                                        <div style={{fontSize: 11, color: "#8b97ab"}}>
                                            {p.supplierInn ? `ИНН ${p.supplierInn}` : "ИНН не указан"}
                                            {p.supplierBlacklisted && " · в чёрном списке"}
                                            {p.supplierAffiliated && " · аффилированное лицо"}
                                        </div>
                                    </td>
                                    <td style={{...td, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600}}>
                                        {money(p.price)}
                                    </td>
                                    <td style={{...td, textAlign: "right", color: p.priceDeltaPercent ? "#c77700" : "#8b97ab"}}>
                                        {p.priceDeltaPercent === null
                                            ? "—"
                                            : p.priceDeltaPercent === 0 ? "минимальная" : `+${p.priceDeltaPercent}%`}
                                    </td>
                                    <td style={td}>
                                        {p.deliveryDays ? `${p.deliveryDays} дн.` : "—"}
                                        {p.warrantyMonths ? ` · гарантия ${p.warrantyMonths} мес.` : ""}
                                        {p.paymentTerms && <div style={{fontSize: 11, color: "#8b97ab"}}>{p.paymentTerms}</div>}
                                    </td>
                                    <td style={td}>
                                        {p.files.length > 0 && (
                                            <div style={{display: "flex", flexDirection: "column", gap: 2}}>
                                                {p.files.map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => void attachmentService.download({
                                                            id: f.attachmentId, fileName: f.fileName,
                                                        } as Attachment)}
                                                        style={fileButton}
                                                        title={formatFileSize(f.size)}
                                                    >
                                                        {f.fileName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {p.externalLink && (
                                            <a
                                                href={p.externalLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{fontSize: 11.5, color: "#2f68f5"}}
                                            >
                                                облако банка
                                            </a>
                                        )}
                                        {p.files.length === 0 && !p.externalLink && (
                                            <span style={{color: "#a6b0c2"}}>—</span>
                                        )}
                                        <div>
                                            <button onClick={() => openSources(p)} disabled={busy} style={linkButton}>
                                                приложить
                                            </button>
                                        </div>
                                    </td>
                                    <td style={td}>
                                        {p.meetsRequirements === true && <span style={{color: "#1f8a4c", fontWeight: 600}}>соответствует</span>}
                                        {p.meetsRequirements === false && (
                                            <>
                                                <span style={{color: "#c0392b", fontWeight: 600}}>отклонено</span>
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>{p.rejectionReason}</div>
                                            </>
                                        )}
                                        {p.meetsRequirements === null && <span style={{color: "#8b97ab"}}>нет заключения</span>}
                                    </td>
                                    <td style={td}>
                                        {p.isWinner ? (
                                            <span style={{display: "inline-flex", alignItems: "center", gap: 5, color: "#1f8a4c", fontWeight: 700}}>
                                                <Trophy size={14}/> победитель
                                            </span>
                                        ) : (
                                            <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
                                                {p.meetsRequirements !== true && (
                                                    <button
                                                        onClick={() => run(() => proposalService.verdict(p.id, true))}
                                                        disabled={busy}
                                                        title="Соответствует техническим требованиям"
                                                        style={iconButton}
                                                    >
                                                        <Check size={14}/>
                                                    </button>
                                                )}
                                                {p.meetsRequirements !== false && (
                                                    <button onClick={() => reject(p)} disabled={busy} title="Отклонить" style={iconButton}>
                                                        <X size={14}/>
                                                    </button>
                                                )}
                                                {p.meetsRequirements === true && !p.supplierBlacklisted && (
                                                    <button
                                                        onClick={() => run(() => proposalService.declareWinner(requestId, p.id))}
                                                        disabled={busy}
                                                        style={{...iconButton, width: "auto", padding: "0 10px", fontSize: 12, fontWeight: 600}}
                                                    >
                                                        Победитель
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {data.proposals.length === 0 && (
                <div style={{padding: "22px 0", textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                    Предложения ещё не зарегистрированы
                </div>
            )}

            {data.blockers.length > 0 && (
                <ul style={{margin: "14px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#8a5a00", lineHeight: 1.7}}>
                    {data.blockers.map(b => <li key={b}>{b}</li>)}
                </ul>
            )}
        </section>
    );
};

const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: 13,
    padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".06em",
    color: "#8b97ab",
    textTransform: "uppercase",
    marginBottom: 4,
};

const input: React.CSSProperties = {
    width: "100%",
    height: 36,
    padding: "0 11px",
    border: "1px solid #e5e9f0",
    borderRadius: 9,
    background: "#fff",
    font: "inherit",
    fontSize: 12.5,
    outline: "none",
};

const primaryButton: React.CSSProperties = {
    height: 34, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 34, padding: "0 13px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const iconButton: React.CSSProperties = {
    width: 30, height: 30, display: "grid", placeItems: "center",
    border: "1px solid #e5e9f0", borderRadius: 8, background: "#fff",
    color: "#55617a", cursor: "pointer",
};

const linkButton: React.CSSProperties = {
    border: "none", background: "transparent", padding: 0,
    fontSize: 11.5, color: "#2f68f5", cursor: "pointer",
};

const fileButton: React.CSSProperties = {
    ...linkButton,
    textAlign: "left",
    textDecoration: "underline",
    maxWidth: 190,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

const th: React.CSSProperties = {padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 12px", verticalAlign: "top", color: "#26324a"};
