import {useCallback, useRef, useState} from "react";
import {useEcpSession} from "@/context/EcpSessionContext.ts";
import {infocomEcpService} from "@/service/infocomEcpService.ts";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
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
 * Токен из 2.3 (account/auth) живёт какое-то время и им можно подписывать несколько резолюций
 * подряд без повторного пин-кода (см. EcpSessionContext). Поэтому requestSignature ведёт себя
 * по-разному в зависимости от того, есть ли уже действующая ЭЦП-сессия:
 *   - сессии нет / истекла → открывает EcpSignModal (полный флоу 2.1→2.2→2.3→2.4→2.5);
 *   - сессия есть и не истекла → тихо подписывает хэш (2.5) сохранённым токеном, без модалки.
 * Если "тихая" подпись падает с 401/403 (токен отозван раньше expireAt на стороне провайдера),
 * сессия сбрасывается и запускается полный флоу — как будто сессии не было.
 */
export function useEcpApproval() {
    const {session, isValid, clearSession} = useEcpSession();
    const [modalOpen, setModalOpen] = useState(false);
    const [quietSigning, setQuietSigning] = useState(false);
    const pendingRef = useRef<{
        resolve: (r: ResolutionEcpSignature) => void;
        reject: (e: unknown) => void;
        payloadText: string;
        vndId: number;
        stageId: number;
    } | null>(null);
    const [modalPayload, setModalPayload] = useState("");

    const openModalFor = useCallback((
        vndId: number, stageId: number, payloadText: string,
        resolve: (r: ResolutionEcpSignature) => void, reject: (e: unknown) => void,
    ) => {
        pendingRef.current = {resolve, reject, payloadText, vndId, stageId};
        setModalPayload(payloadText);
        setModalOpen(true);
    }, []);

    const requestSignature = useCallback((vndId: number, stageId: number, payloadText: string): Promise<ResolutionEcpSignature> => {
        return new Promise<ResolutionEcpSignature>((resolve, reject) => {
            if (!session || !isValid()) {
                openModalFor(vndId, stageId, payloadText, resolve, reject);
                return;
            }

            // Сессия есть и не истекла - подписываем тихо, без полноэкранной модалки.
            void (async () => {
                setQuietSigning(true);
                const toastId = toast.loading("Подписываем…", "Согласовать резолюцию электронной подписью");
                try {
                    // Хэш - от backend (см. комментарий у функции), не считаем его сами.
                    const {hash} = await coordinationService.getResolutionHash(vndId, stageId, payloadText);
                    const signed = await infocomEcpService.signHash(hash, session.token);
                    if (!signed.isSuccesfull || !signed.sign) throw new Error("Подпись не получена");
                    toast.update(toastId, {variant: "success", title: "Подписано", duration: 2000});
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
                        toast.warning("ЭЦП-сессия истекла", "Потребуется заново подтвердить электронной подписью");
                        openModalFor(vndId, stageId, payloadText, resolve, reject);
                    } else {
                        reject(e);
                    }
                } finally {
                    setQuietSigning(false);
                }
            })();
        });
    }, [session, isValid, clearSession, openModalFor]);

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
        modalOpen, modalPayload, quietSigning, requestSignature,
        handleModalSigned, handleModalClose,
        /** Сбросить ЭЦП-сессию (например, backend сообщил, что подпись чужая) — следующий
         * requestSignature откроет полный флоу с вводом ПИН. */
        resetSession: clearSession,
    };
}
