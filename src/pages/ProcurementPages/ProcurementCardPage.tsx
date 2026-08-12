import {useCallback, useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {colors} from "@/design/tokens";
import {
    PROCUREMENT_STATUS_LABEL,
    procurementService,
    type ProcurementCard,
    type ProcurementStatusCode,
} from "@/service/procurementService/procurementService.ts";
import {ProposalsPanel} from "@/components/procurement/ProposalsPanel.tsx";
import {ProcurementRoutePanel} from "@/components/procurement/ProcurementRoutePanel.tsx";
import {TenderPanel} from "@/components/procurement/TenderPanel.tsx";
import {ContractPanel} from "@/components/procurement/ContractPanel.tsx";
import {GuaranteeClaimPanel} from "@/components/procurement/GuaranteeClaimPanel.tsx";

/**
 * Карточка закупки (экран v8 isPrcCard): параметры заявки, решение Матрицы полномочий
 * и действия по маршруту. Коммерческие предложения и сравнительная таблица придут
 * следующим срезом (PRC-09/12).
 */

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

export const ProcurementCardPage = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [card, setCard] = useState<ProcurementCard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            setCard(await procurementService.get(Number(id)));
        } catch {
            setError("Заявка не найдена");
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const submit = async () => {
        if (!card) return;
        try {
            setBusy(true);
            setError(null);
            setCard(await procurementService.submit(card.id));
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(message ?? "Не удалось отправить заявку на согласование");
        } finally {
            setBusy(false);
        }
    };

    if (error && !card) return <div style={{padding: 24, color: "#e0483d"}}>{error}</div>;
    if (!card) return <div style={{padding: 24, color: "#8b97ab"}}>Загрузка…</div>;

    const tone = STATUS_TONE[card.statusCode] ?? colors.status.draft;
    const canSubmit = card.statusCode === "Draft" || card.statusCode === "OnRevision";

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1120}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 16}}>
                <div style={{flex: 1}}>
                    <div style={{fontSize: 12.5, color: "#8b97ab"}}>
                        <Link to="/prc" style={{color: "#8b97ab", textDecoration: "none"}}>Реестр закупок</Link>
                        {" · "}{card.regNumber ?? "без номера"}
                        {card.sourceSzRegNumber && ` · по записке ${card.sourceSzRegNumber}`}
                    </div>
                    <h1 style={{margin: "4px 0 0", fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                        {card.subject}
                    </h1>
                    <div style={{marginTop: 6, display: "flex", gap: 8, alignItems: "center"}}>
                        <span style={{
                            padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                            color: tone.fg, background: tone.bg,
                        }}>
                            {PROCUREMENT_STATUS_LABEL[card.statusCode]}
                        </span>
                        <span style={{fontSize: 12.5, color: "#55617a"}}>
                            {card.amount.toLocaleString("ru-RU")} сом · {card.methodShortTitle}
                        </span>
                    </div>
                </div>

                {canSubmit && (
                    <button
                        onClick={submit}
                        disabled={busy || card.blockers.length > 0}
                        title={card.blockers.length > 0 ? card.blockers.join("; ") : undefined}
                        style={{
                            height: 38, padding: "0 18px", border: "none", borderRadius: 10,
                            background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 13, fontWeight: 600,
                            cursor: card.blockers.length > 0 ? "not-allowed" : "pointer",
                            opacity: busy || card.blockers.length > 0 ? 0.5 : 1,
                        }}
                    >
                        {busy ? "Отправка…" : "На согласование"}
                    </button>
                )}
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {card.blockers.length > 0 && (
                <section style={{...cardStyle, borderColor: "#f0c98a", background: "#fffaf0"}}>
                    <div style={{fontSize: 13, fontWeight: 600, color: "#8a5a00"}}>
                        Заявку нельзя отправить на согласование:
                    </div>
                    <ul style={{margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#8a5a00", lineHeight: 1.7}}>
                        {card.blockers.map(b => <li key={b}>{b}</li>)}
                    </ul>
                </section>
            )}

            <div style={{display: "grid", gridTemplateColumns: "1fr minmax(300px, 380px)", gap: 18, alignItems: "start"}}>
                <section style={cardStyle}>
                    <div style={cardTitle}>Параметры закупки</div>
                    <Row label="Предмет закупки" value={card.subject}/>
                    <Row label="Тип предмета" value={card.subjectKindTitle}/>
                    <Row label="Сумма" value={`${card.amount.toLocaleString("ru-RU")} сом`}/>
                    <Row label="Аффилированное лицо" value={card.isAffiliated ? "да" : "нет"}/>
                    <Row label="Бюджет" value={card.hasBudget ? "предусмотрено" : "вне бюджета"}/>
                    <Row label="Позиция Плана закупок" value={card.planItem ?? "—"}/>
                    <Row label="ТЗ (спецификация)" value={card.hasSpecification ? "приложено" : "не приложено"}/>
                    <Row label="Инициатор" value={card.initiatorName ?? "—"}/>
                    <Row label="Инициирующее СП" value={card.initiatorUnit ?? "—"}/>
                    <Row label="Куратор" value={card.curatorName ?? "—"}/>

                    {card.justification && (
                        <>
                            <div style={{...cardTitle, marginTop: 18}}>Обоснование необходимости</div>
                            <div style={{fontSize: 13, color: "#26324a", lineHeight: 1.7}}>{card.justification}</div>
                        </>
                    )}
                </section>

                <aside style={cardStyle}>
                    <div style={cardTitle}>Решение матрицы полномочий</div>
                    <Row label="Способ закупки" value={card.methodTitle}/>
                    <Row label="Согласование" value={card.approvalChain ?? "—"}/>
                    <Row label="Утверждение расхода" value={card.approvalAuthorityTitle}/>
                    <Row label="Протокол закупки" value={card.protocolRequired ? "требуется" : "не требуется"}/>
                    {card.minProposals > 0 && <Row label="Минимум КП" value={String(card.minProposals)}/>}
                    {card.methodJustification && (
                        <>
                            <div style={{...cardTitle, marginTop: 18}}>Обоснование способа</div>
                            <div style={{fontSize: 12.5, color: "#26324a", lineHeight: 1.7}}>
                                {card.methodJustification}
                            </div>
                        </>
                    )}

                    {card.protocolRequired && (
                        <button
                            onClick={() => navigate(`/prc/${card.id}/protocol`)}
                            style={{
                                marginTop: 16, width: "100%", height: 34, border: "none", borderRadius: 9,
                                background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Протокол закупки
                        </button>
                    )}

                    <button
                        onClick={() => navigate("/prc/matrix")}
                        style={{
                            marginTop: 8, width: "100%", height: 34, border: "1px solid #e5e9f0", borderRadius: 9,
                            background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Открыть матрицу полномочий
                    </button>
                </aside>
            </div>

            {/* Маршрут появляется после отправки заявки на согласование */}
            {card.routeInstanceId && (
                <ProcurementRoutePanel routeInstanceId={card.routeInstanceId} onResolved={load}/>
            )}

            {/* Сбор предложений идёт после согласования заявки, но черновик тоже показываем —
                Сектор закупок нередко собирает КП параллельно с визированием. */}
            <ProposalsPanel requestId={card.id} onChanged={load}/>

            {/* Конкурс показывается только для конкурсных способов: у простой закупки
                отбор идёт по коммерческим предложениям выше. */}
            {card.methodShortTitle.startsWith("Конкурс") && (
                <TenderPanel requestId={card.id} onChanged={load}/>
            )}

            <ContractPanel requestId={card.id} onChanged={load}/>

            {/* Обеспечения и претензии появляются, когда есть конкурс или договор */}
            <GuaranteeClaimPanel tenderId={card.tenderId} contractId={card.contractId} onChanged={load}/>
        </div>
    );
};

const Row = ({label, value}: { label: string; value: string }) => (
    <div style={{display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f6f9", fontSize: 12.5}}>
        <span style={{flex: 1, color: "#8b97ab"}}>{label}</span>
        <span style={{flex: 1.2, color: "#26324a", fontWeight: 600, textAlign: "right"}}>{value}</span>
    </div>
);

const cardStyle: React.CSSProperties = {
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
    marginBottom: 12,
};
