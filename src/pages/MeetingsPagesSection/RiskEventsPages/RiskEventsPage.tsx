/**
 * Реестр событий операционного риска (RISK-1, 716-П / НБКР): список с фильтрами по
 * типу, серьёзности, статусу и тексту. События поднимаются с шагов согласования —
 * здесь риск-подразделение их разбирает и меняет статус.
 */
import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {RotateCcw} from "lucide-react";
import {useAuth} from "../../../context/AuthContext.ts";
import {PermissionCode} from "../../../constants/permissions/permissions.ts";
import {
    riskEventService,
    RISK_TYPE_LABEL,
    RISK_SEVERITY_LABEL,
    RISK_STATUS_LABEL,
    type RiskEventListItem,
    type RiskEventType,
    type RiskEventSeverity,
    type RiskEventStatus,
} from "../../../service/riskEventService/riskEventService.ts";
import {RiskEventCard} from "./RiskEventCard.tsx";
import {Badge, SEVERITY_TONE, STATUS_TONE} from "./riskEventUi.tsx";
import {SearchBar} from "../../../components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "../../../components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SavedFiltersBar} from "../../../components/componentsGeneral/SavedFiltersBar.tsx";
import {HighlightText} from "../../../utils/highlightText.tsx";
import {PageHeader} from "../../../components/componentsGeneral/PageHeader.tsx";

const ACCENT = "#4e57d6";

const LOCALE: Record<string, string> = {ru: "ru-RU", en: "en-US", ky: "ky-KG"};

const STATUS_TABS: Array<RiskEventStatus | ""> = ["", "New", "InProgress", "Closed"];

export function RiskEventsPage() {
    const {t, i18n} = useTranslation();
    const locale = LOCALE[i18n.language] ?? "ru-RU";
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageRiskEvents);

    const [rows, setRows] = useState<RiskEventListItem[]>([]);
    const [total, setTotal] = useState(0);
    /** query — то, что набрано; appliedQuery — то, по чему реально искали (Enter или очистка). */
    const [query, setQuery] = useState("");
    const [appliedQuery, setAppliedQuery] = useState("");
    const [type, setType] = useState<RiskEventType | "">("");
    const [severity, setSeverity] = useState<RiskEventSeverity | "">("");
    const [status, setStatus] = useState<RiskEventStatus | "">("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        let alive = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(false);
        riskEventService
            .search({
                query: appliedQuery.trim() || undefined,
                type: type || undefined,
                severity: severity || undefined,
                status: status || undefined,
                pageSize: 200,
            })
            .then((p) => {
                if (!alive) return;
                setRows(p.items);
                setTotal(p.total);
            })
            .catch(() => alive && setError(true))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [appliedQuery, type, severity, status, reloadKey]);

    const typeTitle = (code: RiskEventType, fallback: string) =>
        i18n.exists(`riskEvents.type.${code}`) ? t(`riskEvents.type.${code}`) : fallback;
    const severityTitle = (code: RiskEventSeverity, fallback: string) =>
        i18n.exists(`riskEvents.severity.${code}`) ? t(`riskEvents.severity.${code}`) : fallback;
    const statusTitle = (code: RiskEventStatus, fallback: string) =>
        i18n.exists(`riskEvents.status.${code}`) ? t(`riskEvents.status.${code}`) : fallback;

    const formatDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString(locale) : "—");
    const formatLoss = (amount: number | null, currency: string) =>
        amount === null ? "—" : `${amount.toLocaleString(locale)} ${currency}`;

    const hasFilter = !!(appliedQuery || query || type || severity || status);
    const reset = () => {
        setQuery("");
        setAppliedQuery("");
        setType("");
        setSeverity("");
        setStatus("");
    };

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px] flex flex-col gap-4">
            <PageHeader
                title={t("riskEvents.title")}
                description={t("riskEvents.subtitle")}
            />
            {/* Вкладки статусов — как у реестра СЗ, только в фирменном индиго */}
            <div className="mt-[-24px] flex items-center gap-5 border-b border-[#e5e9f0]">
                {STATUS_TABS.map((s) => {
                    const active = status === s;
                    return (
                        <button
                            key={s || "all"}
                            onClick={() => setStatus(s)}
                            className="relative inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-none bg-transparent px-1 py-[9px] text-[14px]"
                            style={{color: active ? ACCENT : "#55617a", fontWeight: active ? 600 : 500}}
                        >
                            {s ? statusTitle(s, RISK_STATUS_LABEL[s]) : t("riskEvents.tabAll")}
                            {active && (
                                <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full"
                                      style={{backgroundColor: ACCENT}}/>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <SearchBar
                    variant="white"
                    value={query}
                    onChange={(v) => {
                        setQuery(v);
                        if (!v) setAppliedQuery("");
                    }}
                    onSubmit={(v) => setAppliedQuery(v)}
                    placeholder={t("riskEvents.searchPlaceholder")}
                    className="min-w-[260px]"
                />
                <SelectDropdown
                    searchable
                    searchPlaceholder={t("riskEvents.searchType")}
                    minWidth="220px"
                    options={[
                        {value: "", label: t("riskEvents.allTypes")},
                        ...(Object.keys(RISK_TYPE_LABEL) as RiskEventType[]).map((k) => ({
                            value: k, label: typeTitle(k, RISK_TYPE_LABEL[k]),
                        })),
                    ]}
                    value={type}
                    onChange={(v) => setType(v as RiskEventType | "")}
                />
                <SelectDropdown
                    minWidth="200px"
                    options={[
                        {value: "", label: t("riskEvents.allSeverities")},
                        ...(Object.keys(RISK_SEVERITY_LABEL) as RiskEventSeverity[]).map((k) => ({
                            value: k, label: severityTitle(k, RISK_SEVERITY_LABEL[k]),
                        })),
                    ]}
                    value={severity}
                    onChange={(v) => setSeverity(v as RiskEventSeverity | "")}
                />
                <button type="button" onClick={reset} disabled={!hasFilter}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-default disabled:opacity-50">
                    <RotateCcw className="h-3.5 w-3.5"/>
                    {t("riskEvents.reset")}
                </button>
            </div>

            <div className="mt-3">
                <SavedFiltersBar
                    scope="risk-events"
                    current={{query: appliedQuery, type, severity, status}}
                    onApply={(p) => {
                        const f = p as {
                            query?: string;
                            type?: RiskEventType | "";
                            severity?: RiskEventSeverity | "";
                            status?: RiskEventStatus | ""
                        };
                        setQuery(f.query ?? "");
                        setAppliedQuery(f.query ?? "");
                        setType(f.type ?? "");
                        setSeverity(f.severity ?? "");
                        setStatus(f.status ?? "");
                    }}
                />
            </div>

            {error && (
                <div
                    className="mt-4 flex items-center justify-between gap-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {t("riskEvents.loadError")}
                    <button type="button" onClick={reload}
                            className="cursor-pointer border-none bg-transparent text-[13px] font-semibold text-[#c0392b] underline">
                        {t("riskEvents.retry")}
                    </button>
                </div>
            )}

            <div className="mt-4 overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white">
                <div className="flex items-center gap-2 border-b border-[#eef2f7] px-5 py-3">
                    <span className="text-[13px] font-semibold text-[#1c2740]">{t("riskEvents.listTitle")}</span>
                    <span
                        className="rounded-full bg-[#f2f5f9] px-[7px] py-[1px] font-mono text-[11px] font-bold text-[#8b97ab]">
                        {total}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                        <tr className="bg-[#fafbfd] text-left text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            <th className="px-5 py-2.5">{t("riskEvents.cols.date")}</th>
                            <th className="px-3 py-2.5">{t("riskEvents.cols.type")}</th>
                            <th className="px-3 py-2.5">{t("riskEvents.cols.description")}</th>
                            <th className="px-3 py-2.5">{t("riskEvents.cols.severity")}</th>
                            <th className="px-3 py-2.5">{t("riskEvents.cols.loss")}</th>
                            <th className="px-5 py-2.5">{t("riskEvents.cols.status")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.id}
                                tabIndex={0}
                                onClick={() => setOpenId(r.id)}
                                onKeyDown={(e) => e.key === "Enter" && setOpenId(r.id)}
                                className="cursor-pointer border-t border-[#eef2f7] outline-none hover:bg-[#fafbfd] focus:bg-[#f6f7fe]"
                            >
                                <td className="whitespace-nowrap px-5 py-3 text-[#55617a]">{formatDate(r.occurredOn)}</td>
                                <td className="px-3 py-3 text-[#374253]">{typeTitle(r.type, r.typeTitle)}</td>
                                <td className="max-w-[460px] px-3 py-3">
                                    <div className="text-[#1c2740]">
                                        {r.shortDescription
                                            ? <HighlightText text={r.shortDescription} query={appliedQuery}/>
                                            : "—"}
                                    </div>
                                    {r.documentTitle && (
                                        <div className="mt-0.5 text-[11.5px] text-[#8b97ab]">
                                            <HighlightText text={r.documentTitle} query={appliedQuery}/>
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3">
                                    <Badge
                                        tone={SEVERITY_TONE[r.severity]}>{severityTitle(r.severity, r.severityTitle)}</Badge>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[#374253]">
                                    {formatLoss(r.directLossAmount, r.lossCurrency)}
                                </td>
                                <td className="px-5 py-3">
                                    <Badge tone={STATUS_TONE[r.status]}
                                           dot>{statusTitle(r.status, r.statusTitle)}</Badge>
                                </td>
                            </tr>
                        ))}
                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-[#8b97ab]">
                                    {hasFilter ? t("general.notFound") : t("riskEvents.empty")}
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan={6}
                                    className="px-5 py-10 text-center text-[#8b97ab]">{t("general.loading")}</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {openId !== null && (
                <RiskEventCard
                    id={openId}
                    canManage={canManage}
                    onClose={() => setOpenId(null)}
                    onChanged={() => {
                        setOpenId(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
}
