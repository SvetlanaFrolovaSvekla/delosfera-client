// Журнал подписей ЭЦП по служебной записке — как у ВНД: кто, когда, чей сертификат, под какой
// версией текста, и кнопка «Проверить» (2.6 у провайдера по сохранённой подписи + сверка с текущей
// запиской). Журнал неизменяем: проверка ничего не меняет, только показывает результат.
import {useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, History, ShieldCheck} from "lucide-react";
import {
    szEcpService,
    type SzResolutionSignature,
    type SzSignatureVerifyResult,
} from "@/service/szService/szEcpService.ts";

const STATUS_STYLE: Record<string, string> = {
    valid: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]",
    document_changed: "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]",
    provider_unavailable: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    unsupported_schema: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    signature_invalid: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
    journal_tampered: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
};

const DECISION_TONE: Record<SzResolutionSignature["decision"], string> = {
    Approved: "text-[#1c7a4d]",
    ApprovedWithRemarks: "text-[#8a5a00]",
    Rejected: "text-[#c0392b]",
};

interface SzSignatureJournalProps {
    szId: number;
    items: SzResolutionSignature[];
    loadError: boolean;
}

export function SzSignatureJournal({szId, items, loadError}: SzSignatureJournalProps) {
    const {t, i18n} = useTranslation();
    const locale = i18n.language === "ky" ? "ky-KG" : i18n.language === "en" ? "en-GB" : "ru-RU";
    const formatDateTime = (iso: string) =>
        new Date(iso).toLocaleString(locale, {dateStyle: "short", timeStyle: "short"});

    const [checking, setChecking] = useState<ReadonlySet<number>>(new Set());
    const [results, setResults] = useState<Record<number, SzSignatureVerifyResult | string>>({});
    const [staleOpen, setStaleOpen] = useState(false);

    const actual = useMemo(() => items.filter((i) => i.isCurrentRoute), [items]);
    const stale = useMemo(() => items.filter((i) => !i.isCurrentRoute), [items]);

    const verify = useCallback(async (id: number) => {
        setChecking((prev) => new Set(prev).add(id));
        try {
            const result = await szEcpService.verifySignature(szId, id);
            setResults((prev) => ({...prev, [id]: result}));
        } catch (e) {
            const r = (e as { response?: { status?: number; data?: { message?: string } } }).response;
            setResults((prev) => ({
                ...prev,
                [id]: r?.status === 429 ? t("ecp.journal.tooMany") : r?.data?.message ?? t("ecp.journal.verifyFailed"),
            }));
        } finally {
            setChecking((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [szId, t]);

    const renderItem = (item: SzResolutionSignature, isStale: boolean) => {
        const result = results[item.id];
        const owner = item.personFio ?? item.certCommonName ?? item.userFullName ?? "—";
        return (
            <div key={item.id}
                 className={`rounded-[10px] border px-3.5 py-2.5 ${isStale ? "border-[#eef1f5] bg-[#fafbfc]" : "border-[#eef1f5] bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className={`min-w-0 flex-1 text-[12.5px] leading-[1.6] ${isStale ? "text-[#8b97ab]" : "text-[#1c2740]"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{owner}</span>
                            {item.userFullName && item.userFullName !== owner && (
                                <span className="text-[#8b97ab]">({t("ecp.journal.account", {name: item.userFullName})})</span>
                            )}
                            {item.isTest && (
                                <span className="rounded-full bg-[#fdf3e0] px-2 py-[1px] text-[10.5px] font-bold uppercase text-[#8a5a00]">
                                    {t("szCard.signature.testBadge")}
                                </span>
                            )}
                            {item.isSystem && (
                                <span className="rounded-full border border-[#bfe3dd] bg-[#eef8f6] px-2 py-[1px] text-[10.5px] font-bold text-[#0f5e5a]">
                                    {t("szCard.signature.systemBadge")}
                                </span>
                            )}
                        </div>
                        <div className="text-[11.5px] text-[#8b97ab]">
                            {formatDateTime(item.signedAt)}
                            {" · "}{t("szCard.approval.stage", {order: item.stepOrder})}
                            {" · "}<span className={`font-semibold ${DECISION_TONE[item.decision]}`}>
                                {t(`szCard.resolution.${item.decision}`)}
                            </span>
                        </div>
                        {/* Комментарий к резолюции — сразу под решением, обычным шрифтом. */}
                        {item.comment && (
                            <div className={`my-1 whitespace-pre-line break-words border-l-2 border-[#e5e9f0] pl-2.5 text-[12px] font-normal leading-[1.5] ${
                                isStale ? "text-[#a3adbd]" : "text-[#55617a]"}`}>
                                {item.comment}
                            </div>
                        )}
                        <div className="text-[11.5px] text-[#8b97ab]">
                            {item.isTest
                                ? t("szCard.signature.testNotVerified")
                                : item.isSystem
                                    ? t("szCard.signature.systemNote")
                                    : item.verified ? t("ecp.journal.verified") : t("ecp.journal.notVerified")}
                            {item.certIssuerCommonName && ` · ${t("ecp.journal.issuer", {name: item.certIssuerCommonName})}`}
                        </div>
                        {!item.matchesCurrentContent && (
                            <div className="text-[11.5px] font-medium text-[#8a5a00]">
                                {item.decision === "ApprovedWithRemarks"
                                    ? t("szCard.signature.otherVersionRemarks")
                                    : t("szCard.signature.otherVersionLong")}
                            </div>
                        )}
                        <div className="truncate font-mono text-[10.5px] text-[#aab3c2]" title={item.hash}>
                            SHA-256 ({item.hashSchemaVersion}): {item.hash}
                        </div>
                    </div>
                    <button type="button" onClick={() => void verify(item.id)} disabled={checking.has(item.id)}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] bg-white px-3 py-1 text-[12px] font-semibold text-[#2f68f5] hover:bg-[#f6f8fb] disabled:opacity-50">
                        <ShieldCheck size={13}/>
                        {checking.has(item.id) ? t("ecp.journal.verifying") : t("ecp.journal.verify")}
                    </button>
                </div>
                {result && (
                    <div className={`mt-2 rounded-[8px] border px-3 py-1.5 text-[12px] ${
                        typeof result === "string"
                            ? STATUS_STYLE.signature_invalid
                            : STATUS_STYLE[result.status] ?? STATUS_STYLE.provider_unavailable}`}>
                        {typeof result === "string" ? result : result.message}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e9edf3] bg-[#fbfcff] p-4">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1c2740]">
                <ShieldCheck size={16} className="text-[#4e57d6]"/>
                {t("ecp.journal.title")}
            </div>
            {loadError && <div className="mt-2 text-[12.5px] text-[#c0392b]">{t("ecp.journal.loadError")}</div>}
            {!loadError && items.length === 0 && (
                <div className="mt-2 text-[12.5px] text-[#8b97ab]">{t("szCard.signature.journalEmpty")}</div>
            )}

            {actual.length > 0 && (
                <div className="mt-3 flex flex-col gap-2.5">{actual.map((i) => renderItem(i, false))}</div>
            )}

            {stale.length > 0 && (
                <>
                    <button type="button" onClick={() => setStaleOpen((v) => !v)} aria-expanded={staleOpen}
                            className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-[#eef1f5] bg-[#fafbfc] px-3.5 py-2 text-left hover:bg-[#f4f6f9]">
                        <History size={14} className="flex-none text-[#a3adbd]"/>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#8b97ab]">
                            {t("szCard.signature.previousRounds")}
                        </span>
                        <span className="rounded-full bg-[#eef1f5] px-1.5 text-[10.5px] font-bold text-[#8b97ab]">{stale.length}</span>
                        <ChevronDown size={15}
                                     className={`ml-auto flex-none text-[#a3adbd] transition-transform ${staleOpen ? "rotate-180" : ""}`}/>
                    </button>
                    {staleOpen && (
                        <div className="mt-2.5 flex flex-col gap-2.5">{stale.map((i) => renderItem(i, true))}</div>
                    )}
                </>
            )}
        </div>
    );
}
