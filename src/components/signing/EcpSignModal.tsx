/**
 * Открывается ТОЛЬКО когда действующей ЭЦП-сессии ещё нет. Пока полученный в 2.3 токен не
 * истёк, повторные подписания идут тихо, без этого окна (см. useEcpApproval).
 *
 * Шаги: ПИН физ. лица (14 цифр, вводится вручную) → способ получения пин-кода (2.1) → пин-код
 * (2.2) → токен (2.3) → get-cert-info (2.4, best-effort) → хэш резолюции от backend → подпись
 * хэша (2.5). ИНН организации необязателен: пусто — подпись как физ. лица, заполнено — от имени
 * организации (представитель юр. лица). Полученная сессия (токен + срок действия
 * + ПИН) хранится в EcpSessionContext — только в памяти, не в localStorage.
 *
 * Хэш для 2.5 запрашивается у backend (coordinationService.getResolutionHash), а НЕ считается
 * здесь — см. обоснование в useEcpApproval.ts.
 */
import {useEffect, useState} from "react";
import {CheckCircle2, ShieldCheck} from "lucide-react";
import {useTranslation} from "react-i18next";
import {infocomEcpService, infocomErrorText} from "@/service/infocomEcpService.ts";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import {ApprovalDecisionType} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {useEcpIdentification} from "@/hooks/useEcpIdentification.ts";
import {useModalShake} from "@/hooks/useModalShake.ts";
import {ecpCredentialService} from "@/service/ecpCredentialService.ts";
import {toast} from "@/service/toastService.ts";
import {formatEcpDuration} from "@/utils/formatEcpDuration.ts";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {EcpIdentityForm} from "@/components/signing/EcpIdentityForm.tsx";

interface Props {
    /** Резолюция ВНД: хэш запрашивается у coordinationService по vndId/stageId. */
    vndId?: number;
    stageId?: number;
    /** То, что подписывается — например, итоговый текст резолюции. Хэш считает backend. */
    payloadText?: string;
    /** Решение, под которым ставится подпись (входит в хэш). */
    decision?: ApprovalDecisionType;
    /** Другой контур (например, служебная записка): хэш строит его backend — модалка только
     * подписывает то, что вернёт эта функция. Если задана, vndId/stageId не нужны. */
    getHash?: () => Promise<string>;
    onSigned: (result: ResolutionEcpSignature) => void;
    onClose: () => void;
}

export const EcpSignModal = ({
    vndId, stageId, payloadText = "", decision = ApprovalDecisionType.Approve, getHash, onSigned, onClose,
}: Props) => {
    const {t} = useTranslation();
    const {setSession} = useEcpSession();
    const {panelRef, handleBackdropClick} = useModalShake();
    // ПИН/ИНН/способ/код и шаги 2.1 → 2.2 — общая логика с личным кабинетом.
    const ident = useEcpIdentification();
    const [signing, setSigning] = useState(false);

    // Сохранение идентификации на сервере (см. личный кабинет → "Электронная подпись"). Предлагается,
    // только если на сервере настроено шифрование; по умолчанию выключено - пользователь соглашается явно.
    const [rememberAvailable, setRememberAvailable] = useState(false);
    const [rememberDays, setRememberDays] = useState(0);
    const [remember, setRemember] = useState(false);
    useEffect(() => {
        let cancelled = false;
        ecpCredentialService.status()
            .then((s) => {
                if (cancelled) return;
                setRememberAvailable(s.available);
                setRememberDays(s.retentionDays);
            })
            .catch(() => { /* не критично: галочки просто не будет */ });
        return () => { cancelled = true; };
    }, []);

    /** 2.3 → показать срок действия → сразу 2.4 (best-effort) + хэш от backend + 2.5. */
    const confirmCodeAndSign = async () => {
        const {personIdnp, organizationInn} = ident;
        const code = ident.code.trim();
        if (!code) {
            ident.setError(t("ecp.identity.errCodeRequired"));
            return;
        }
        ident.setBusy(true);
        ident.setError(null);
        try {
            const auth = await infocomEcpService.token(personIdnp, code, organizationInn);
            if (!auth.token || !auth.expireAt) throw new Error(t("ecp.modal.tokenMissing"));

            const createAt = auth.createAt ?? new Date().toISOString();
            const durationText = formatEcpDuration(new Date(auth.expireAt).getTime() - Date.now());
            toast.info(t("ecp.modal.connected"), t("ecp.modal.connectedText", {duration: durationText}));

            setSigning(true);

            let signerFio: string | null = null;
            try {
                const certInfo = await infocomEcpService.certInfo(auth.token);
                signerFio = certInfo.commonName;
            } catch {
                // Некритичный (best-effort) шаг: весь флоу продолжается без ФИО подписанта.
            }

            // Хэш — от backend (текст резолюции + содержимое редакции + код ВНД), не считаем сами.
            let hash: string;
            if (getHash) {
                hash = await getHash();
            } else {
                if (vndId === undefined || stageId === undefined) throw new Error(t("ecp.modal.signMissing"));
                hash = (await coordinationService.getResolutionHash(vndId, stageId, payloadText, decision)).hash;
            }
            const signed = await infocomEcpService.signHash(hash, auth.token);
            if (!signed.isSuccesfull || !signed.sign) throw new Error(t("ecp.modal.signMissing"));

            setSession({
                token: auth.token,
                createAt,
                expireAt: auth.expireAt,
                personIdnp,
                signerFio,
            });

            onSigned({
                signatureBase64: signed.sign,
                certToken: auth.token,
                hash,
                personIdnp,
                timestamp: signed.timestamp,
            });

            // Подпись уже получена - сохранение идентификации не должно её задерживать или ронять.
            // Сервер сам проверит код обменом на токен (тот же код принимается повторно).
            if (remember) {
                void ecpCredentialService.save(personIdnp, code, organizationInn)
                    .then(() => toast.success(t("ecp.modal.saved"), t("ecp.modal.savedText")))
                    .catch((err) => toast.warning(t("ecp.modal.saveFailed"),
                        infocomErrorText(err, t("ecp.modal.saveFailedText"))));
            }
        } catch (e) {
            ident.setError(infocomErrorText(e, t("ecp.modal.signFailed")));
            setSigning(false);
        } finally {
            ident.setBusy(false);
        }
    };

    return (
        <div onClick={handleBackdropClick}
             className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f1b2d]/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
             role="dialog" aria-modal="true" aria-label={t("ecp.modal.ariaLabel")}>
            <div ref={panelRef} onClick={(e) => e.stopPropagation()}
                 className="relative w-[440px] max-w-[92vw] bg-white rounded-2xl px-7 pt-8 pb-6 shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#ececfc] grid place-items-center">
                    <div className="w-10 h-10 rounded-full bg-[#4e57d6] grid place-items-center">
                        <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2}/>
                    </div>
                </div>
                <h3 className="text-center text-[16px] font-bold text-[#1c2740] mb-1.5">
                    {t("ecp.modal.title")}
                </h3>
                <p className="text-center text-[13px] text-[#8b97ab] leading-[1.5] mb-5">
                    {t("ecp.modal.subtitle")}
                </p>

                {signing ? (
                    <div className="flex items-center gap-3 rounded-[10px] border border-[#cfe3d6] bg-[#f2f9f5] px-3.5 py-3 text-[12.5px] text-[#1c7a4d]">
                        <CheckCircle2 className="w-6 h-6 shrink-0 animate-pulse" strokeWidth={1.8}/>
                        {t("ecp.modal.signing")}
                    </div>
                ) : (
                    <EcpIdentityForm
                        ident={ident}
                        submitLabel={t("ecp.modal.submit")} submitBusyLabel={t("ecp.modal.submitBusy")}
                        onSubmit={() => void confirmCodeAndSign()} onCancel={onClose}
                        codeExtra={rememberAvailable && (
                            <div className="rounded-[10px] bg-[#f6f8fb] px-3.5 py-3">
                                <PlainCheckbox checked={remember} onChange={setRemember} disabled={ident.busy}>
                                    {t("ecp.modal.remember", {days: rememberDays})}
                                </PlainCheckbox>
                                <p className="m-0 mt-1.5 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                                    {t("ecp.modal.rememberHint")}
                                </p>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    );
};
