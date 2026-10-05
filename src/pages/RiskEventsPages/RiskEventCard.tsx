/**
 * Карточка события операционного риска (RISK-1). Показывает обстоятельства, привязку к
 * документу/маршруту и прямые потери. При праве ManageRiskEvents позволяет сменить
 * статус (новое → в работе → закрыто) и уточнить сумму потерь.
 */
import {useEffect, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {X} from "lucide-react";
import {
    riskEventService,
    RISK_STATUS_LABEL,
    type RiskEventDetails,
    type RiskEventStatus,
} from "@/service/riskEventService/riskEventService.ts";
import {Badge, SEVERITY_TONE, STATUS_TONE} from "@/pages/RiskEventsPages/riskEventUi.tsx";

interface Props {
    id: number;
    canManage: boolean;
    onClose: () => void;
    onChanged: () => void;
}

const LOCALE: Record<string, string> = {ru: "ru-RU", en: "en-US", ky: "ky-KG"};

const FIELD = "rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#0f1b2d] outline-none " +
    "focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc]";

function Row({label, children}: { label: string; children: ReactNode }) {
    return (
        <div className="flex gap-3 border-t border-[#eef0f6] py-2 first:border-t-0">
            <div className="w-[150px] flex-none text-[12px] text-[#8b97ab]">{label}</div>
            <div className="min-w-0 text-[13px] text-[#1c2740]">{children}</div>
        </div>
    );
}

function Block({label, children}: { label: string; children: ReactNode }) {
    return (
        <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">{label}</div>
            <div className="whitespace-pre-wrap rounded-[10px] border border-[#e5e9f0] bg-white p-3 text-[13px] leading-relaxed text-[#1c2740]">
                {children}
            </div>
        </div>
    );
}

export function RiskEventCard({id, canManage, onClose, onChanged}: Props) {
    const {t, i18n} = useTranslation();
    const locale = LOCALE[i18n.language] ?? "ru-RU";

    const [event, setEvent] = useState<RiskEventDetails | null>(null);
    const [status, setStatus] = useState<RiskEventStatus>("New");
    const [comment, setComment] = useState("");
    const [loss, setLoss] = useState("");
    const [currency, setCurrency] = useState("KGS");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let alive = true;
        riskEventService.get(id).then((d) => {
            if (!alive) return;
            setEvent(d);
            setStatus(d.status);
            setLoss(d.directLossAmount !== null ? String(d.directLossAmount) : "");
            setCurrency(d.lossCurrency || "KGS");
        }).catch(() => alive && setLoadError(true));
        return () => {
            alive = false;
        };
    }, [id]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [busy, onClose]);

    async function save() {
        setBusy(true);
        setError(null);
        try {
            await riskEventService.changeStatus(id, {
                status,
                comment: comment.trim() || undefined,
                directLossAmount: loss.trim() ? Number(loss) : undefined,
                lossCurrency: currency.trim() || undefined,
            });
            onChanged();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? t("riskEvents.card.saveError"));
            setBusy(false);
        }
    }

    const tr = (group: string, code: string, fallback: string) =>
        i18n.exists(`riskEvents.${group}.${code}`) ? t(`riskEvents.${group}.${code}`) : fallback;

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,27,45,0.4)] p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90vh] w-[min(600px,100%)] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_20px_60px_-20px_rgba(15,27,45,0.5)]"
            >
                {!event ? (
                    <div className="p-8 text-center text-[13px] text-[#8b97ab]">
                        {loadError ? t("riskEvents.card.loadError") : t("general.loading")}
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-3 border-b border-[#eef2f7] px-6 py-4">
                            <div className="min-w-0">
                                <h2 className="m-0 text-[17px] font-bold leading-snug text-[#0f1b2d]">
                                    {tr("type", event.type, event.typeTitle)}
                                </h2>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[12px] text-[#8b97ab]">
                                        {t("riskEvents.card.eventNo", {id: event.id})}
                                    </span>
                                    <Badge tone={STATUS_TONE[event.status]} dot>
                                        {tr("status", event.status, event.statusTitle)}
                                    </Badge>
                                    <Badge tone={SEVERITY_TONE[event.severity]}>
                                        {tr("severity", event.severity, event.severityTitle)}
                                    </Badge>
                                </div>
                            </div>
                            <button type="button" onClick={onClose} disabled={busy}
                                    aria-label={t("riskEvents.card.close")}
                                    className="grid h-8 w-8 flex-none cursor-pointer place-items-center rounded-full border-none bg-transparent text-[#8b97ab] hover:bg-[#f2f5f9] hover:text-[#55617a]">
                                <X className="h-[18px] w-[18px]"/>
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
                            <div className="rounded-[12px] bg-[#fafbfd] px-4 py-1.5">
                                <Row label={t("riskEvents.card.occurredOn")}>
                                    {new Date(event.occurredOn).toLocaleDateString(locale)}
                                </Row>
                                <Row label={t("riskEvents.card.initiator")}>
                                    {event.initiatorName ?? `#${event.initiatorUserId}`}
                                </Row>
                                {event.documentTitle && <Row label={t("riskEvents.card.document")}>{event.documentTitle}</Row>}
                                {event.routeInstanceId !== null && <Row label={t("riskEvents.card.route")}>{`#${event.routeInstanceId}`}</Row>}
                                {event.routeStepId !== null && <Row label={t("riskEvents.card.step")}>{`#${event.routeStepId}`}</Row>}
                                <Row label={t("riskEvents.card.loss")}>
                                    {event.directLossAmount !== null
                                        ? `${event.directLossAmount.toLocaleString(locale)} ${event.lossCurrency}`
                                        : "—"}
                                </Row>
                            </div>

                            <Block label={t("riskEvents.card.description")}>{event.description}</Block>

                            {event.resolutionComment && (
                                <Block label={t("riskEvents.card.resolution")}>{event.resolutionComment}</Block>
                            )}

                            {canManage && (
                                <div className="flex flex-col gap-3 rounded-[12px] border border-[#dfe2f8] bg-[#f6f7fe] p-4">
                                    <div className="text-[13px] font-bold text-[#0f1b2d]">{t("riskEvents.card.review")}</div>

                                    {/* Статус — переключатель из трёх кнопок: выпадающий список обрезался бы краем окна */}
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.keys(RISK_STATUS_LABEL) as RiskEventStatus[]).map((k) => {
                                            const active = status === k;
                                            return (
                                                <button key={k} type="button" onClick={() => setStatus(k)}
                                                        className={"h-9 flex-1 min-w-[110px] cursor-pointer rounded-[9px] border px-3 text-[13px] font-semibold transition-colors " +
                                                            (active
                                                                ? "border-[#4e57d6] bg-[#4e57d6] text-white"
                                                                : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]")}>
                                                    {tr("status", k, RISK_STATUS_LABEL[k])}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={loss}
                                            onChange={(e) => setLoss(e.target.value)}
                                            className={`h-9 min-w-[140px] flex-1 ${FIELD}`}
                                            placeholder={t("riskEvents.card.lossPlaceholder")}
                                        />
                                        <input
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                                            className={`h-9 w-[84px] text-center font-mono ${FIELD}`}
                                            placeholder="KGS"
                                        />
                                    </div>

                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={3}
                                        className={`box-border w-full resize-y py-2 font-[inherit] ${FIELD}`}
                                        placeholder={t("riskEvents.card.commentPlaceholder")}
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-3.5 py-2 text-[12.5px] text-[#c0392b]">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-[#eef2f7] px-6 py-3.5">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                className="h-10 cursor-pointer rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-60"
                            >
                                {t("riskEvents.card.close")}
                            </button>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={busy}
                                    className="h-10 cursor-pointer rounded-[10px] border-none bg-[#4e57d6] px-[18px] text-[13px] font-semibold text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60"
                                >
                                    {busy ? t("riskEvents.card.saving") : t("riskEvents.card.save")}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
