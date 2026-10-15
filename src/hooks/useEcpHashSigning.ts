import {useCallback, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {infocomEcpService, infocomErrorText} from "@/service/infocomEcpService.ts";
import {
    ecpCredentialErrorCode,
    ECP_CREDENTIAL_EXPIRED, ECP_CREDENTIAL_INVALID, ECP_CREDENTIAL_MISSING, ECP_CREDENTIAL_NOT_CONFIGURED,
    type StoredEcpSignature,
} from "@/service/ecpCredentialService.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import {toast} from "@/service/toastService.ts";

/** Что подписывается: хэш строит backend контура, клиент его только подписывает. */
export interface EcpSignTarget {
    /** Хэш резолюции от backend (SHA-256, hex). */
    getHash: () => Promise<string>;
    /** Подпись сохранённой идентификацией (личный кабинет → "Электронная подпись"), если контур её
     * поддерживает. Ошибки ecp_credential_* означают "идентификации нет" — тогда обычный флоу. */
    signStored?: () => Promise<StoredEcpSignature>;
}

/**
 * Получение ЭЦП-подписи ГП «Инфоком» под хэшем, который строит backend любого контура (служебные
 * записки и т.п.) — тот же порядок, что у useEcpApproval для ВНД:
 *   1. сохранённая идентификация — сервер сам подписывает, без окна;
 *   2. действующая ЭЦП-сессия (токен 2.3 ещё не истёк) — тихая подпись 2.5;
 *   3. иначе — EcpSignModal (ПИН → код → токен → подпись).
 * Модалку рендерит вызывающий компонент по modalOpen/modalGetHash/handleModalSigned/handleModalClose.
 */
export function useEcpHashSigning() {
    const {t} = useTranslation();
    const {session, isValid, clearSession} = useEcpSession();
    const [modalOpen, setModalOpen] = useState(false);
    const [quietSigning, setQuietSigning] = useState(false);
    const [modalGetHash, setModalGetHash] = useState<(() => Promise<string>) | null>(null);
    const pendingRef = useRef<{
        resolve: (r: ResolutionEcpSignature) => void;
        reject: (e: unknown) => void;
    } | null>(null);

    const openModalFor = useCallback((
        target: EcpSignTarget,
        resolve: (r: ResolutionEcpSignature) => void, reject: (e: unknown) => void,
    ) => {
        pendingRef.current = {resolve, reject};
        // Функцию в state кладём через обёртку — иначе React примет её за updater.
        setModalGetHash(() => target.getHash);
        setModalOpen(true);
    }, []);

    const signWithStored = useCallback(async (target: EcpSignTarget): Promise<ResolutionEcpSignature | null> => {
        if (!target.signStored) return null;
        setQuietSigning(true);
        const toastId = toast.loading(t("ecp.approval.signing"), t("ecp.approval.signingText"));
        try {
            const r = await target.signStored();
            toast.update(toastId, {variant: "success", title: t("ecp.approval.signed"), duration: 2000});
            return {
                signatureBase64: r.signatureBase64,
                certToken: r.certToken,
                hash: r.hash,
                personIdnp: r.personIdnp,
                timestamp: r.timestamp,
            };
        } catch (e) {
            toast.dismiss(toastId);
            const code = ecpCredentialErrorCode(e);
            if (code === ECP_CREDENTIAL_MISSING || code === ECP_CREDENTIAL_NOT_CONFIGURED) return null;
            if (code === ECP_CREDENTIAL_EXPIRED || code === ECP_CREDENTIAL_INVALID) {
                toast.warning(t("ecp.approval.credInvalid"), infocomErrorText(e, t("ecp.approval.credInvalidText")));
                return null;
            }
            throw e;
        } finally {
            setQuietSigning(false);
        }
    }, [t]);

    const signWithSession = useCallback((target: EcpSignTarget): Promise<ResolutionEcpSignature> => {
        return new Promise<ResolutionEcpSignature>((resolve, reject) => {
            if (!session || !isValid()) {
                openModalFor(target, resolve, reject);
                return;
            }
            void (async () => {
                setQuietSigning(true);
                const toastId = toast.loading(t("ecp.approval.signing"), t("ecp.approval.signingText"));
                try {
                    const hash = await target.getHash();
                    const signed = await infocomEcpService.signHash(hash, session.token);
                    if (!signed.isSuccesfull || !signed.sign) throw new Error(t("ecp.modal.signMissing"));
                    toast.update(toastId, {variant: "success", title: t("ecp.approval.signed"), duration: 2000});
                    resolve({
                        signatureBase64: signed.sign,
                        certToken: session.token,
                        hash,
                        personIdnp: session.personIdnp,
                        timestamp: signed.timestamp,
                    });
                } catch (e) {
                    toast.dismiss(toastId);
                    const response = (e as { response?: { status?: number; data?: { errorCode?: number } } }).response;
                    const expired = response?.status === 401 || response?.status === 403
                        || response?.data?.errorCode === 401 || response?.data?.errorCode === 403;
                    if (expired) {
                        // Токен отозван раньше expireAt — сбрасываем сессию и идём полным флоу.
                        clearSession();
                        toast.warning(t("ecp.approval.sessionExpired"), t("ecp.approval.sessionExpiredText"));
                        openModalFor(target, resolve, reject);
                    } else {
                        reject(e);
                    }
                } finally {
                    setQuietSigning(false);
                }
            })();
        });
    }, [t, session, isValid, clearSession, openModalFor]);

    /** Подписать хэш цели: сохранённая идентификация → сессия → окно ввода ПИН/кода. */
    const requestSignature = useCallback(async (target: EcpSignTarget): Promise<ResolutionEcpSignature> => {
        const stored = await signWithStored(target);
        if (stored) return stored;
        return signWithSession(target);
    }, [signWithStored, signWithSession]);

    const handleModalSigned = useCallback((result: ResolutionEcpSignature) => {
        setModalOpen(false);
        pendingRef.current?.resolve(result);
        pendingRef.current = null;
    }, []);

    const handleModalClose = useCallback(() => {
        setModalOpen(false);
        pendingRef.current?.reject(new Error("Подписание отменено"));
        pendingRef.current = null;
    }, []);

    return {
        modalOpen, modalGetHash, quietSigning, requestSignature, handleModalSigned, handleModalClose,
        /** Сбросить ЭЦП-сессию (например, backend сообщил, что подпись чужая). */
        resetSession: clearSession,
    };
}

export type EcpHashSigningState = ReturnType<typeof useEcpHashSigning>;
