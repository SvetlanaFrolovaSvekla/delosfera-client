import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {
    ResolutionSignatureVerifyResponse,
    VndResolutionSignatureResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {vndAuthenticityService} from "@/service/vndService/vndAuthenticityService.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/**
 * "Журнал подписей" — резолюции "Согласовать", подписанные ЭЦП ГП «Инфоком», по документу:
 * кто подписал (учётка и ФИО из сертификата), когда, результат проверки при сохранении.
 * Кнопка "Проверить" — повторная проверка на backend: хэш пересчитывается из ТЕКУЩЕГО
 * состояния документа и резолюции, подпись снова проверяется у провайдера (2.6). Журнал только
 * для чтения — изменить или удалить запись нельзя ни здесь, ни через API.
 *
 * Блок показывается всегда: если подписей нет — пустое состояние, если журнал не загрузился — ошибка.
 */

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

export function VndSignatureJournal({vndId, refreshKey}: { vndId: number; refreshKey?: unknown }) {
    const {t, i18n} = useTranslation();
    const locale = i18n.language === "ky" ? "ky-KG" : i18n.language === "en" ? "en-GB" : "ru-RU";
    const [items, setItems] = useState<VndResolutionSignatureResponse[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [checking, setChecking] = useState<number | null>(null);
    const [results, setResults] = useState<Record<number, ResolutionSignatureVerifyResponse | string>>({});
    // Скачать подпись (.sig.b64) и подписанные данные (.txt) для проверки вне системы — право «Экспорт ВНД»
    // (в CMS лежит сертификат подписанта с его персональными данными).
    const {hasPermission} = useAuth();
    const canExport = hasPermission(PermissionCode.ExportVnd);

    const download = useCallback(async (id: number, file: "signature" | "data") => {
        try {
            await vndAuthenticityService.downloadSignatureFile(vndId, id, file);
        } catch (e) {
            const status = (e as { response?: { status?: number } }).response?.status;
            setResults((prev) => ({
                ...prev,
                [id]: status === 403 ? t("vndAuthenticity.noExportPermission")
                    : status === 429 ? t("ecp.journal.tooMany") : t("vndAuthenticity.downloadFailed"),
            }));
        }
    }, [vndId, t]);

    useEffect(() => {
        let cancelled = false;
        coordinationService.getSignatures(vndId)
            .then((data) => { if (!cancelled) { setItems(data); setLoadError(false); setLoaded(true); } })
            .catch(() => { if (!cancelled) { setItems([]); setLoadError(true); setLoaded(true); } });
        return () => { cancelled = true; };
    }, [vndId, refreshKey]);

    const verify = useCallback(async (id: number) => {
        setChecking(id);
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
            setChecking(null);
        }
    }, [vndId, t]);

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
            <div className="mt-3 flex flex-col gap-2.5">
                {items.map((item) => {
                    const result = results[item.id];
                    return (
                        <div key={item.id} className="rounded-[10px] border border-[#eef1f5] px-3.5 py-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 text-[12.5px] leading-[1.6] text-[#1c2740]">
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
                                        {item.verified ? t("ecp.journal.verified") : t("ecp.journal.notVerified")}
                                        {item.certIssuerCommonName && ` · ${t("ecp.journal.issuer", {name: item.certIssuerCommonName})}`}
                                        {item.certValidNotAfter && ` · ${t("ecp.journal.certUntil", {date: item.certValidNotAfter})}`}
                                    </div>
                                    <div className="truncate font-mono text-[10.5px] text-[#aab3c2]" title={item.hash}>
                                        SHA-256 ({item.hashSchemaVersion}): {item.hash}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                                    <button type="button" onClick={() => void verify(item.id)}
                                            disabled={checking !== null}
                                            className="cursor-pointer rounded-[8px] border border-[#e5e9f0] bg-white px-3 py-1 text-[12px] font-semibold text-[#2f68f5] disabled:opacity-50">
                                        {checking === item.id ? t("ecp.journal.verifying") : t("ecp.journal.verify")}
                                    </button>
                                    {canExport && (
                                        <>
                                            <button type="button" onClick={() => void download(item.id, "signature")}
                                                    className="cursor-pointer rounded-[8px] border border-[#e5e9f0] bg-white px-3 py-1 text-[12px] font-semibold text-[#55617a]">
                                                {t("vndAuthenticity.downloadSignature")}
                                            </button>
                                            <button type="button" onClick={() => void download(item.id, "data")}
                                                    className="cursor-pointer rounded-[8px] border border-[#e5e9f0] bg-white px-3 py-1 text-[12px] font-semibold text-[#55617a]">
                                                {t("vndAuthenticity.downloadSignedData")}
                                            </button>
                                        </>
                                    )}
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
                })}
            </div>
        </div>
    );
}
