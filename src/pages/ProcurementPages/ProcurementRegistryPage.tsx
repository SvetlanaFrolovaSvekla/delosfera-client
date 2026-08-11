import {useCallback, useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {Plus} from "lucide-react";
import {colors} from "@/design/tokens";
import {
    PROCUREMENT_STATUS_LABEL,
    procurementService,
    type ProcurementCounters,
    type ProcurementListItem,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";

/**
 * Реестр «Заявки и закупки» (экран v8 isPrc). Вкладки — срезы по статусу,
 * строка ведёт в карточку закупки.
 */

type ScopeId = "all" | "mine" | "drafts" | "approval" | "inprocurement" | "completed";

const SCOPES: { id: ScopeId; label: string; statuses?: ProcurementStatusCode[]; mineOnly?: boolean }[] = [
    {id: "all", label: "Все закупки"},
    {id: "mine", label: "Инициирую я", mineOnly: true},
    {id: "drafts", label: "Черновики", statuses: ["Draft"], mineOnly: true},
    {id: "approval", label: "На согласовании", statuses: ["OnApproval"]},
    {id: "inprocurement", label: "В закупке", statuses: ["InProcurement", "Approved"]},
    {id: "completed", label: "Завершённые", statuses: ["Completed"]},
];

const STATUS_TONE: Partial<Record<ProcurementStatusCode, { fg: string; bg: string }>> = {
    Draft: colors.status.draft,
    OnApproval: colors.status.review,
    Approved: colors.status.active,
    InProcurement: colors.status.consol,
    Completed: colors.status.active,
    OnRevision: colors.status.onact,
    Rejected: colors.status.arch,
    Cancelled: colors.status.draft,
};

function money(value: number): string {
    return `${value.toLocaleString("ru-RU")} сом`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ru-RU");
}

export const ProcurementRegistryPage = () => {
    const navigate = useNavigate();

    const [scope, setScope] = useState<ScopeId>("all");
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<ProcurementListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [counters, setCounters] = useState<ProcurementCounters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const current = SCOPES.find(s => s.id === scope)!;
        try {
            setLoading(true);
            setError(null);
            const page = await procurementService.search({
                query: query.trim() || undefined,
                statuses: current.statuses,
                mineOnly: current.mineOnly,
                page: 1,
                pageSize: 50,
            });
            setItems(page.items);
            setTotal(page.total);
        } catch {
            setError("Не удалось загрузить реестр закупок");
        } finally {
            setLoading(false);
        }
    }, [scope, query]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        procurementService.counters().then(setCounters).catch(() => undefined);
    }, [items.length]);

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "center", gap: 16}}>
                <div style={{flex: 1}}>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>Заявки и закупки</h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {counters
                            ? `Всего ${counters.all} · на согласовании ${counters.onApproval} · в закупке ${counters.inProcurement}`
                            : "Реестр закупок"}
                    </div>
                </div>

                <button
                    onClick={() => navigate("/prc/new")}
                    style={{
                        display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 15px",
                        border: "none", borderRadius: 10, background: "#2f68f5", color: "#fff",
                        font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                >
                    <Plus size={16}/> Новая заявка
                </button>
            </div>

            <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                {SCOPES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setScope(s.id)}
                        style={{
                            padding: "7px 13px", borderRadius: 9, font: "inherit", fontSize: 12.5, fontWeight: 600,
                            cursor: "pointer",
                            border: `1px solid ${scope === s.id ? "#2f68f5" : "#e5e9f0"}`,
                            background: scope === s.id ? "#eef3ff" : "#fff",
                            color: scope === s.id ? "#2f68f5" : "#55617a",
                        }}
                    >
                        {s.label}
                    </button>
                ))}

                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Поиск по предмету или номеру…"
                    style={{
                        flex: 1, minWidth: 220, height: 36, padding: "0 12px",
                        border: "1px solid #e5e9f0", borderRadius: 9, background: "#f6f8fb",
                        font: "inherit", fontSize: 12.5, outline: "none",
                    }}
                />
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            <section style={{background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, overflow: "hidden"}}>
                <div style={{overflowX: "auto"}}>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                        <thead>
                            <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                <th style={th}>Номер</th>
                                <th style={th}>Предмет закупки</th>
                                <th style={th}>Способ</th>
                                <th style={{...th, textAlign: "right"}}>Сумма</th>
                                <th style={th}>Инициатор</th>
                                <th style={th}>Создана</th>
                                <th style={th}>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const tone = STATUS_TONE[item.statusCode] ?? colors.status.draft;
                                return (
                                    <tr key={item.id} style={{borderTop: "1px solid #eef2f7"}}>
                                        <td style={td}>
                                            <Link to={`/prc/${item.id}`} style={{color: "#2f68f5", fontWeight: 600, textDecoration: "none"}}>
                                                {item.regNumber ?? "б/н"}
                                            </Link>
                                            {item.sourceSzRegNumber && (
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>
                                                    по записке {item.sourceSzRegNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td style={td}>
                                            {item.subject}
                                            {item.isAffiliated && (
                                                <span style={{marginLeft: 6, fontSize: 11, color: "#c77700"}}>аффилированное лицо</span>
                                            )}
                                        </td>
                                        <td style={td}>{item.methodShortTitle}</td>
                                        <td style={{...td, textAlign: "right", whiteSpace: "nowrap"}}>
                                            {money(item.amount)}
                                            {!item.hasBudget && (
                                                <div style={{fontSize: 11, color: "#c77700"}}>вне бюджета</div>
                                            )}
                                        </td>
                                        <td style={td}>
                                            {item.initiatorName ?? "—"}
                                            <div style={{fontSize: 11, color: "#8b97ab"}}>{item.initiatorUnit ?? ""}</div>
                                        </td>
                                        <td style={{...td, whiteSpace: "nowrap"}}>{formatDate(item.createdAt)}</td>
                                        <td style={td}>
                                            <span style={{
                                                padding: "4px 9px", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                                                color: tone.fg, background: tone.bg,
                                            }}>
                                                {PROCUREMENT_STATUS_LABEL[item.statusCode]}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {!loading && items.length === 0 && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                        Заявок в этом срезе нет
                    </div>
                )}
                {loading && (
                    <div style={{padding: 28, textAlign: "center", color: "#8b97ab", fontSize: 13}}>Загрузка…</div>
                )}
            </section>

            <div style={{fontSize: 11.5, color: "#8b97ab"}}>Показано {items.length} из {total}</div>
        </div>
    );
};

const th: React.CSSProperties = {padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 14px", verticalAlign: "top", color: "#26324a"};
