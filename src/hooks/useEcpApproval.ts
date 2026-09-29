import {useCallback, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {infocomEcpService, infocomErrorText} from "@/service/infocomEcpService.ts";
import {
    ecpCredentialService, ecpCredentialErrorCode,
    ECP_CREDENTIAL_EXPIRED, ECP_CREDENTIAL_INVALID, ECP_CREDENTIAL_MISSING, ECP_CREDENTIAL_NOT_CONFIGURED,
} from "@/service/ecpCredentialService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import {ApprovalDecisionType} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {toast} from "@/service/toastService.ts";

export interface ResolutionEcpSignature {
    signatureBase64: string;
    /** Токен ГП — backend использует его только для 2.4 и не сохраняет. */
    certToken: string;
    hash: string;
    /** ПИН физ. лица, введённый вручную при получении токена (сверяется на backend с 2.6). */
    personIdnp: string;
    /** timestamp из ответа 2.5 (Unix ms). */
    timestamp: number;
}

/**
 * Получение ЭЦП-подписи для резолюции "Согласовать" (SIG-ECP, статичный токен ГП «Инфоком»).
 *
 * Хэш, который реально подписывается, ВСЕГДА запрашивается у backend (coordinationService.
 * getResolutionHash), а не считается на клиенте: backend строит его из текста резолюции +
 * содержимого текущей редакции (SHA-256 файлов) + кода ВНД и при сохранении резолюции
 * пересчитывает тот же хэш из БД, сверяя с EcpHash. Если документ или текст изменились между
 * подписанием и отправкой — backend отвечает 409 "document_changed", и панель предлагает
 * подписать заново (новый хэш).
 *
 * Если пользователь прошёл идентификацию в личном кабинете ("Электронная подпись"), подписание идёт
 * через сохранённую идентификацию: сервер сам обменивает сохранённый код на минутный токен и
 * подписывает хэш (ecpCredentialService.signResolution) — без окна и без ввода ПИН/кода. Если
 * идентификации нет, она истекла или ГП не принял код — работает обычный флоу ниже.
 *
 * Токен из 2.3 (account/auth) живёт какое-то время и им можно подписывать несколько резолюций
 * подряд без повторного пин-кода (см. EcpSessionContext). Поэтому requestSignature ведёт себя
 * по-разному в зависимости от того, есть ли уже действующая ЭЦП-сессия:
 *   - сессии нет / истекла → открывает EcpSignModal (полный флоу 2.1→2.2→2.3→2.4→2.5);
 *   - сессия есть и не истекла → тихо подписывает хэш (2.5) сохранённым токеном, без модалки.
 * Если "тихая" подпись падает с 401/403 (токен отозван раньше expireAt на стороне провайдера),
 * сессия сбрасывается и запускается полный флоу — как будто сессии не было.
 */
export function useEcpApproval() {
    const {t} = useTranslation();
    const {session, isValid, clearSession} = useEcpSession();
    const [modalOpen, setModalOpen] = useState(false);
    const [quietSigning, setQuietSigning] = useState(false);
    const pendingRef = useRef<{
        resolve: (r: ResolutionEcpSignature) => void;
        reject: (e: unknown) => void;
        payloadText: string;
        vndId: number;
        stageId: number;
        decision: ApprovalDecisionType;
    } | null>(null);
    const [modalPayload, setModalPayload] = useState("");
    // Решение, под которым ставится подпись (входит в хэш) - передаётся в EcpSignModal.
    const [modalDecision, setModalDecision] = useState<ApprovalDecisionType>(ApprovalDecisionType.Approve);

    const openModalFor = useCallback((
        vndId: number, stageId: number, payloadText: string, decision: ApprovalDecisionType,
        resolve: (r: ResolutionEcpSignature) => void, reject: (e: unknown) => void,
    ) => {
        pendingRef.current = {resolve, reject, payloadText, vndId, stageId, decision};
        setModalPayload(payloadText);
        setModalDecision(decision);
        setModalOpen(true);
    }, []);

    const requestSessionSignature = useCallback((
        vndId: number, stageId: number, payloadText: string, decision: ApprovalDecisionType,
    ): Promise<ResolutionEcpSignature> => {
        return new Promise<ResolutionEcpSignature>((resolve, reject) => {
            if (!session || !isValid()) {
                openModalFor(vndId, stageId, payloadText, decision, resolve, reject);
                return;
            }

            // Сессия есть и не истекла - подписываем тихо, без полноэкранной модалки.
            void (async () => {
                setQuietSigning(true);
                const toastId = toast.loading(t("ecp.approval.signing"), t("ecp.approval.signingText"));
                try {
                    // Хэш - от backend (см. комментарий у функции), не считаем его сами.
                    const {hash} = await coordinationService.getResolutionHash(vndId, stageId, payloadText, decision);
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
                    const status = (e as { response?: { status?: number; data?: { errorCode?: number } } }).response;
                    const expired = status?.status === 401 || status?.status === 403
                        || status?.data?.errorCode === 401 || status?.data?.errorCode === 403;

                    if (expired) {
                        // Токен истёк/отозван раньше expireAt на стороне провайдера - сбрасываем
                        // сессию и запускаем полный флоу заново, как будто её не было.
                        clearSession();
                        toast.warning(t("ecp.approval.sessionExpired"), t("ecp.approval.sessionExpiredText"));
                        openModalFor(vndId, stageId, payloadText, decision, resolve, reject);
                    } else {
                        reject(e);
                    }
                } finally {
                    setQuietSigning(false);
                }
            })();
        });
    }, [t, session, isValid, clearSession, openModalFor]);

    /** Подпись сохранённой идентификацией. null — идентификации нет/недействительна (идём обычным флоу);
     * исключение — любая другая ошибка (документ изменился, вы не согласующий, сбой провайдера…). */
    const signWithStoredCredential = useCallback(async (
        vndId: number, stageId: number, payloadText: string, decision: ApprovalDecisionType,
    ): Promise<ResolutionEcpSignature | null> => {
        setQuietSigning(true);
        const toastId = toast.loading(t("ecp.approval.signing"), t("ecp.approval.signingText"));
        try {
            const r = await ecpCredentialService.signResolution(vndId, stageId, payloadText, decision);
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
            toast.error(t("ecp.approval.signFailed"), infocomErrorText(e, t("ecp.approval.signFailedText")));
            throw e;
        } finally {
            setQuietSigning(false);
        }
    }, [t]);

    /** Подпись резолюции: decision - решение, под которым ставится подпись (входит в хэш). */
    const requestSignature = useCallback(async (
        vndId: number, stageId: number, payloadText: string,
        decision: ApprovalDecisionType = ApprovalDecisionType.Approve,
    ): Promise<ResolutionEcpSignature> => {
        const stored = await signWithStoredCredential(vndId, stageId, payloadText, decision);
        if (stored) return stored;
        return requestSessionSignature(vndId, stageId, payloadText, decision);
    }, [signWithStoredCredential, requestSessionSignature]);

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
        modalOpen, modalPayload, modalDecision, quietSigning, requestSignature,
        handleModalSigned, handleModalClose,
        /** Сбросить ЭЦП-сессию (например, backend сообщил, что подпись чужая) — следующий
         * requestSignature откроет полный флоу с вводом ПИН. */
        resetSession: clearSession,
    };
}
