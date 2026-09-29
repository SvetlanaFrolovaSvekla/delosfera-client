/**
 * Личный кабинет → «Электронная подпись» (ГП «Инфоком»). Идентификация один раз: ПИН → способ получения
 * кода → код из СМС/почты. Сервер проверяет код обменом на токен (2.3) и сохраняет ПИН и код
 * зашифрованно на ограниченный срок; дальше «Согласовать (ЭЦП)» подписывает без повторного ввода.
 * Идентификацию можно в любой момент отозвать.
 */
import {useCallback, useEffect, useState, type ReactNode} from "react";
import {KeyRound} from "lucide-react";
import {useTranslation} from "react-i18next";
import {infocomErrorText} from "@/service/infocomEcpService.ts";
import {ecpCredentialService, type EcpCredentialStatus} from "@/service/ecpCredentialService.ts";
import {useEcpIdentification} from "@/hooks/useEcpIdentification.ts";
import {EcpIdentityForm} from "@/components/signing/EcpIdentityForm.tsx";
import {ECP_PRIMARY_BTN, ECP_SECONDARY_BTN} from "@/components/signing/ecpUi.ts";
import {toast} from "@/service/toastService.ts";


const formatDate = (iso: string | null, locale: string) => (iso ? new Date(iso).toLocaleString(locale) : "—");

function InfoRow({label, children}: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="text-[#8b97ab]">{label}</span>
            <span className="text-right font-medium text-[#1c2740]">{children}</span>
        </div>
    );
}

export function EcpCredentialCard() {
    const {t, i18n} = useTranslation();
    const locale = i18n.language === "ky" ? "ky-KG" : i18n.language === "en" ? "en-GB" : "ru-RU";
    const [status, setStatus] = useState<EcpCredentialStatus | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [revoking, setRevoking] = useState(false);
    // ПИН/ИНН/способ/код и шаги 2.1 → 2.2 — общая логика с окном подписи.
    const ident = useEcpIdentification();

    const load = useCallback(async () => {
        try {
            setStatus(await ecpCredentialService.status());
            setLoadError(null);
        } catch (e) {
            setLoadError(infocomErrorText(e, t("ecp.card.loadError")));
        }
    }, [t]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    const closeForm = () => {
        setFormOpen(false);
        ident.reset();
    };

    const save = async () => {
        const code = ident.code.trim();
        if (!code) { ident.setError(t("ecp.identity.errCodeRequired")); return; }
        ident.setBusy(true);
        ident.setError(null);
        try {
            setStatus(await ecpCredentialService.save(ident.personIdnp, code, ident.organizationInn));
            toast.success(t("ecp.card.connected"), t("ecp.card.connectedText"));
            closeForm();
        } catch (e) {
            ident.setError(infocomErrorText(e, t("ecp.card.saveFailed")));
        } finally {
            ident.setBusy(false);
        }
    };

    const revoke = async () => {
        setRevoking(true);
        try {
            await ecpCredentialService.revoke();
            toast.info(t("ecp.card.revoked"), t("ecp.card.revokedText"));
            await load();
        } catch (e) {
            toast.error(t("ecp.card.revokeFailed"), infocomErrorText(e, ""));
        } finally {
            setRevoking(false);
        }
    };

    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
            <div className="flex items-center gap-2.5">
                <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[var(--soft)] text-[var(--accent)]">
                    <KeyRound size={17} strokeWidth={1.8}/>
                </div>
                <h3 className="m-0 text-[13.5px] font-bold text-[#1c2740]">{t("ecp.card.title")}</h3>
            </div>

            {loadError && <div className="mt-3 text-[12.5px] text-[#c0392b]">{loadError}</div>}
            {!status && !loadError && <div className="mt-3 text-[12.5px] text-[#8b97ab]">{t("general.loading")}</div>}

            {status && !status.available && (
                <div className="mt-3 rounded-[9px] border border-[#f3dfb0] bg-[#fdf7e8] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-[#8a6100]">
                    {t("ecp.card.notConfigured")}
                </div>
            )}

            {status?.available && !formOpen && (
                <>
                    {status.enrolled ? (
                        <div className="mt-3 flex flex-col gap-2 rounded-[10px] bg-[#f2f9f5] px-4 py-3">
                            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1c7a4d]">
                                <span className="h-2 w-2 rounded-full bg-[#1a8a5f]"/> {t("ecp.card.active")}
                            </div>
                            <InfoRow label={t("ecp.card.pin")}><span className="font-mono">{status.personIdnpMasked}</span></InfoRow>
                            {status.organizationInn && (
                                <InfoRow label={t("ecp.card.organization")}><span className="font-mono">{status.organizationInn}</span></InfoRow>
                            )}
                            <InfoRow label={t("ecp.card.validUntil")}>{formatDate(status.expiresAt, locale)}</InfoRow>
                            <InfoRow label={t("ecp.card.lastSigned")}>{formatDate(status.lastUsedAt, locale)}</InfoRow>
                        </div>
                    ) : (
                        <p className="m-0 mt-3 text-[12px] leading-[1.6] text-[#55617a]">
                            {t("ecp.card.intro", {days: status.retentionDays})}
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <button className={status.enrolled ? ECP_SECONDARY_BTN : ECP_PRIMARY_BTN}
                                disabled={revoking} onClick={() => setFormOpen(true)}>
                            {status.enrolled ? t("ecp.card.redo") : t("ecp.card.start")}
                        </button>
                        {status.enrolled && (
                            <button className={ECP_SECONDARY_BTN} disabled={revoking} onClick={() => void revoke()}>
                                {revoking ? t("ecp.card.revoking") : t("ecp.card.revoke")}
                            </button>
                        )}
                    </div>
                </>
            )}

            {status?.available && formOpen && (
                <div className="mt-3.5">
                    <EcpIdentityForm ident={ident} submitLabel={t("ecp.card.confirm")} submitBusyLabel={t("ecp.card.checking")}
                                     onSubmit={() => void save()} onCancel={closeForm}/>
                </div>
            )}
        </div>
    );
}
