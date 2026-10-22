/**
 * "Журнал подписей"
 */

import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {
    ResolutionSignatureVerifyResponse,
    VndResolutionSignatureResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {ChevronDown, History} from "lucide-react";

type StaleReason = "previousProcess" | "otherRedaction" | "superseded";

/** Почему подпись неактуальна (null — актуальна). Экспортируется для превью/тестов. */
// eslint-disable-next-line react-refresh/only-export-components
export function getSignatureStaleReasons(
    items: VndResolutionSignatureResponse[],
    currentProcessId?: number,
    currentRedactionId?: number,
): Map<number, StaleReason | null> {
    const result = new Map<number, StaleReason | null>();
    if (currentProcessId == null) {
        for (const item of items) result.set(item.id, null);
        return result;
    }
    // Последняя подпись каждого согласующего в текущем процессе (по времени, при равенстве - по id)
    const latestByUser = new Map<number, VndResolutionSignatureResponse>();
    for (const item of items) {
        if (item.approvalProcessId !== currentProcessId) continue;
        const prev = latestByUser.get(item.userId);
        const isLater = !prev
            || new Date(item.signedAt).getTime() > new Date(prev.signedAt).getTime()
            || (item.signedAt === prev.signedAt && item.id > prev.id);
        if (isLater) latestByUser.set(item.userId, item);
    }
    for (const item of items) {
        let reason: StaleReason | null = null;
        if (item.approvalProcessId !== currentProcessId) reason = "previousProcess";
        else if (currentRedactionId != null && item.redactionId !== currentRedactionId) reason = "otherRedaction";
        else if (latestByUser.get(item.userId)?.id !== item.id) reason = "superseded";
        result.set(item.id, reason);
    }
    return result;
}

const PHASE_LABEL_KEY: Record<VndResolutionSignatureResponse["phase"], string> = {
    Primary: "ecp.journal.phasePrimary",
    Repeat: "ecp.journal.phaseRepeat",
    FinalHold: "ecp.journal.phaseFinalHold",
};

const STATUS_STYLE: Record<ResolutionSignatureVerifyResponse["status"], string> = {
    valid: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]",
    document_changed: "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]",
    provider_unavailable: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    unsupported_schema: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    signature_invalid: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
    journal_tampered: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
};

const formatDateTime = (iso: string, locale: string) =>
    new Date(iso).toLocaleString(locale, {dateStyle: "short", timeStyle: "short"});

interface VndSignatureJournalProps {
    vndId: number;
    refreshKey?: unknown;
    /** Текущий процесс согласования - по нему подписи делятся на актуальные/неактуальные */
    currentProcessId?: number;
    /** Редакция, которая сейчас на согласовании (process.redactionId) */
    currentRedactionId?: number;
}

export function VndSignatureJournal({vndId, refreshKey, currentProcessId, currentRedactionId}: VndSignatureJournalProps) {
    const {t, i18n} = useTranslation();
    const locale = i18n.language === "ky" ? "ky-KG" : i18n.language === "en" ? "en-GB" : "ru-RU";
    const [items, setItems] = useState<VndResolutionSignatureResponse[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [checking, setChecking] = useState<ReadonlySet<number>>(new Set());
    const [results, setResults] = useState<Record<number, ResolutionSignatureVerifyResponse | string>>({});
    const [staleOpen, setStaleOpen] = useState(false);

    const staleReasons = useMemo(
        () => getSignatureStaleReasons(items, currentProcessId, currentRedactionId),
        [items, currentProcessId, currentRedactionId],
    );
    const actualItems = useMemo(() => items.filter((i) => !staleReasons.get(i.id)), [items, staleReasons]);
    const staleItems = useMemo(() => items.filter((i) => !!staleReasons.get(i.id)), [items, staleReasons]);

    useEffect(() => {
        let cancelled = false;
        coordinationService.getSignatures(vndId)
            .then((data) => { if (!cancelled) { setItems(data); setLoadError(false); setLoaded(true); } })
            .catch(() => { if (!cancelled) { setItems([]); setLoadError(true); setLoaded(true); } });
        return () => { cancelled = true; };
    }, [vndId, refreshKey]);

    const verify = useCallback(async (id: number) => {
        setChecking((prev) => new Set(prev).add(id));
        try {
            const result = await coordinationService.verifySignature(vndId, id);
            setResults((prev) => ({...prev, [id]: result}));
        } catch (e) {
            const message = (e as { response?: { status?: number; data?: { message?: string } } }).response;
            setResults((prev) => ({
                ...prev,
                [id]: message?.status === 429
                    ? t("ecp.journal.tooMany")
                    : message?.data?.message ?? t("ecp.journal.verifyFailed"),
            }));
        } finally {
            setChecking((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [vndId, t]);


    const renderItem = (item: VndResolutionSignatureResponse, stale: StaleReason | null) => {
        const result = results[item.id];
        return (
            <div key={item.id} className={`rounded-[10px] border px-3.5 py-2.5 ${stale ? "border-[#eef1f5] bg-[#fafbfc]" : "border-[#eef1f5]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className={`min-w-0 text-[12.5px] leading-[1.6] ${stale ? "text-[#8b97ab]" : "text-[#1c2740]"}`}>
                        {stale && (
                            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#eef1f5] px-2 py-[1px] text-[10.5px] font-semibold text-[#6b7688]">
                                <History size={11} strokeWidth={2}/>
                                {t(`ecp.journal.staleReason.${stale}`)}
                            </span>
                        )}
                        {item.isTest && (
                            <span className="mb-1 ml-1 inline-flex items-center gap-1 rounded-full border border-dashed border-[#f0dcae] bg-[#fffaf0] px-2 py-[1px] text-[10.5px] font-semibold text-[#8a5a00]"
                                  title={t("ecp.journal.testHint")}>
                                {t("ecp.journal.test")}
                            </span>
                        )}
                        {item.isSystem && (
                            <span className="mb-1 ml-1 inline-flex items-center gap-1 rounded-full border border-[#bfe3dd] bg-[#eef8f6] px-2 py-[1px] text-[10.5px] font-semibold text-[#0f5e5a]"
                                  title={t("ecp.journal.systemHint")}>
                                {t("ecp.journal.system")}
                            </span>
                        )}
                        <div className="font-semibold">
                            {item.personFio ?? item.certCommonName ?? item.userFullName ?? "—"}
                            {item.userFullName && item.personFio && item.userFullName !== item.personFio && (
                                <span className="font-normal text-[#8b97ab]"> ({t("ecp.journal.account", {name: item.userFullName})})</span>
                            )}
                        </div>
                        <div className="text-[11.5px] text-[#8b97ab]">
                            {formatDateTime(item.signedAt, locale)} · {t(PHASE_LABEL_KEY[item.phase])}
                            {item.phase !== "Primary" && `, ${t("ecp.journal.round", {n: item.roundNumber})}`}
                            {item.stageTitle && ` · ${item.stageTitle}`}
                        </div>
                        <div className="text-[11.5px] text-[#8b97ab]">
                            {item.isSystem
                                ? t("ecp.journal.systemVerified")
                                : item.verified ? t("ecp.journal.verified") : t("ecp.journal.notVerified")}
                            {item.certIssuerCommonName && ` · ${t("ecp.journal.issuer", {name: item.certIssuerCommonName})}`}
                        </div>
                        <div className="truncate font-mono text-[10.5px] text-[#aab3c2]" title={item.hash}>
                            SHA-256 ({item.hashSchemaVersion}): {item.hash}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                        <button type="button" onClick={() => void verify(item.id)}
                                disabled={checking.has(item.id)}
                                className="cursor-pointer rounded-[8px] border border-[#e5e9f0] bg-white px-3 py-1 text-[12px] font-semibold text-[#2f68f5] disabled:opacity-50">
                            {checking.has(item.id) ? t("ecp.journal.verifying") : t("ecp.journal.verify")}
                        </button>
                    </div>
                </div>
                {result && (
                    <div className={`mt-2 rounded-[8px] border px-3 py-1.5 text-[12px] ${
                        typeof result === "string" ? STATUS_STYLE.signature_invalid : STATUS_STYLE[result.status]
                    }`}>
                        {typeof result === "string" ? result : result.message}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-6 rounded-[14px] border border-[#e9edf3] bg-white p-4">
            <div className="text-[13.5px] font-semibold text-[#1c2740]">{t("ecp.journal.title")}</div>
            {loaded && loadError && (
                <div className="mt-2 text-[12.5px] text-[#c0392b]">{t("ecp.journal.loadError")}</div>
            )}
            {loaded && !loadError && items.length === 0 && (
                <div className="mt-2 text-[12.5px] leading-[1.6] text-[#8b97ab]">
                    {t("ecp.journal.empty")}
                </div>
            )}
            {staleItems.length === 0 ? (
                <div className="mt-3 flex flex-col gap-2.5">
                    {items.map((item) => renderItem(item, null))}
                </div>
            ) : (
                <>
                    <div className="mt-3 mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#1c7a4d]">
                        <span className="h-[7px] w-[7px] rounded-full bg-[#2f9e5c]"/>
                        {t("ecp.journal.actualTitle")}
                        <span className="rounded-full bg-[#eef9f2] px-1.5 text-[10.5px] text-[#1c7a4d]">{actualItems.length}</span>
                    </div>
                    {actualItems.length === 0 ? (
                        <div className="rounded-[10px] border border-dashed border-[#e5e9f0] px-3.5 py-3 text-[12px] text-[#8b97ab]">
                            {t("ecp.journal.noActual")}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {actualItems.map((item) => renderItem(item, null))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setStaleOpen((v) => !v)}
                        aria-expanded={staleOpen}
                        className="mt-4 flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-[#eef1f5] bg-[#fafbfc] px-3.5 py-2 text-left hover:bg-[#f4f6f9]"
                    >
                        <History size={14} strokeWidth={1.9} className="flex-none text-[#a3adbd]"/>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#8b97ab]">
                            {t("ecp.journal.staleTitle")}
                        </span>
                        <span className="rounded-full bg-[#eef1f5] px-1.5 text-[10.5px] font-bold text-[#8b97ab]">{staleItems.length}</span>
                        <span className="ml-auto hidden text-[11.5px] text-[#a3adbd] sm:inline">{t("ecp.journal.staleHint")}</span>
                        <ChevronDown size={15} className={`flex-none text-[#a3adbd] transition-transform ${staleOpen ? "rotate-180" : ""}`}/>
                    </button>
                    {staleOpen && (
                        <div className="mt-2.5 flex flex-col gap-2.5">
                            {staleItems.map((item) => renderItem(item, staleReasons.get(item.id) ?? null))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
