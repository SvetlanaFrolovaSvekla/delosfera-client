/**
 * Реестр событий операционного риска (RISK-1, 716-П / НБКР): список с фильтрами по
 * типу, серьёзности, статусу и периоду. События поднимаются с шагов согласования —
 * здесь риск-подразделение их разбирает и меняет статус.
 */
import {useEffect, useState} from "react";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {
    riskEventService,
    RISK_TYPE_LABEL,
    RISK_SEVERITY_LABEL,
    RISK_STATUS_LABEL,
    type RiskEventListItem,
    type RiskEventType,
    type RiskEventSeverity,
    type RiskEventStatus,
} from "@/service/riskEventService/riskEventService.ts";
import {RiskEventCard} from "@/pages/RiskEventsPages/RiskEventCard.tsx";

const STATUS_TONE: Record<RiskEventStatus, string> = {
    New: "#2f68f5", InProgress: "#b3730a", Closed: "#1c7a4d",
};

const SEVERITY_TONE: Record<RiskEventSeverity, string> = {
    Low: "#5b6472", Medium: "#2f68f5", High: "#b3730a", Critical: "#c0392b",
};

function formatDate(iso: string): string {
    return iso ? new Date(iso).toLocaleDateString("ru-RU") : "—";
}

function formatLoss(amount: number | null, currency: string): string {
    if (amount === null) return "—";
    return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

export function RiskEventsPage() {
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageRiskEvents);

    const [rows, setRows] = useState<RiskEventListItem[]>([]);
    const [query, setQuery] = useState("");
    const [type, setType] = useState<RiskEventType | "">("");
    const [severity, setSeverity] = useState<RiskEventSeverity | "">("");
    const [status, setStatus] = useState<RiskEventStatus | "">("");
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);

    function load() {
        setLoading(true);
        riskEventService
            .search({
                query: query.trim() || undefined,
                type: type || undefined,
                severity: severity || undefined,
                status: status || undefined,
                pageSize: 200,
            })
            .then((p) => setRows(p.items))
            .finally(() => setLoading(false));
    }

    // Фильтры-селекты применяются сразу, поиск — по Enter.
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, severity, status]);

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="События операционного риска"
                description="Реестр оп-риск событий из workflow (716-П / НБКР): просрочка этапа, срыв контроля, обход «четырёх глаз» и прочее"
            />

            <div className="flex items-center gap-2 flex-wrap">
                <input
                    className="h-9 flex-1 min-w-[240px] px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5]"
                    placeholder="Поиск по описанию…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && load()}
                />
                <select
                    className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px]"
                    value={type}
                    onChange={(e) => setType(e.target.value as RiskEventType | "")}
                >
                    <option value="">Все типы</option>
                    {(Object.keys(RISK_TYPE_LABEL) as RiskEventType[]).map((k) => (
                        <option key={k} value={k}>{RISK_TYPE_LABEL[k]}</option>
                    ))}
                </select>
                <select
                    className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px]"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as RiskEventSeverity | "")}
                >
                    <option value="">Любая серьёзность</option>
                    {(Object.keys(RISK_SEVERITY_LABEL) as RiskEventSeverity[]).map((k) => (
                        <option key={k} value={k}>{RISK_SEVERITY_LABEL[k]}</option>
                    ))}
                </select>
                <select
                    className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] text-[13px]"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RiskEventStatus | "")}
                >
                    <option value="">Все статусы</option>
                    {(Object.keys(RISK_STATUS_LABEL) as RiskEventStatus[]).map((k) => (
                        <option key={k} value={k}>{RISK_STATUS_LABEL[k]}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-[13px] border border-[#e5e9f0] bg-white overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-[#f6f8fb] text-[#8b97ab] text-left">
                            <th className="px-4 py-2.5 font-semibold">Дата</th>
                            <th className="px-4 py-2.5 font-semibold">Тип (716-П)</th>
                            <th className="px-4 py-2.5 font-semibold">Описание</th>
                            <th className="px-4 py-2.5 font-semibold">Серьёзность</th>
                            <th className="px-4 py-2.5 font-semibold">Прямые потери</th>
                            <th className="px-4 py-2.5 font-semibold">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.id}
                                onClick={() => setOpenId(r.id)}
                                className="border-t border-[#eef2f7] cursor-pointer hover:bg-[#f9fbfe]"
                            >
                                <td className="px-4 py-2.5 whitespace-nowrap text-[#55617a]">{formatDate(r.occurredOn)}</td>
                                <td className="px-4 py-2.5 text-[#374253]">{r.typeTitle}</td>
                                <td className="px-4 py-2.5">
                                    <div className="text-[#1c2740]">{r.shortDescription || "—"}</div>
                                    {r.documentTitle && (
                                        <div className="text-[11.5px] text-[#8b97ab]">{r.documentTitle}</div>
                                    )}
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="text-[12px] font-semibold" style={{color: SEVERITY_TONE[r.severity]}}>
                                        {r.severityTitle}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-[#374253] whitespace-nowrap">{formatLoss(r.directLossAmount, r.lossCurrency)}</td>
                                <td className="px-4 py-2.5">
                                    <span className="text-[12px] font-semibold" style={{color: STATUS_TONE[r.status]}}>
                                        {r.statusTitle}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {!loading && rows.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8b97ab]">Событий нет.</td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8b97ab]">Загрузка…</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {openId !== null && (
                <RiskEventCard
                    id={openId}
                    canManage={canManage}
                    onClose={() => setOpenId(null)}
                    onChanged={() => {
                        setOpenId(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}
