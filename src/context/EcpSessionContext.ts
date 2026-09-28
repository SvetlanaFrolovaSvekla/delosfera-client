import {createContext, useContext} from "react";

/**
 * ЭЦП-сессия ГП «Инфоком» (SIG-ECP, статичный токен доступа — см. 2.3 account/auth).
 * Токен живёт ограниченное время (expireAt) и пока не истёк — им можно подписывать
 * несколько документов подряд без повторного запроса пин-кода.
 */
export interface EcpSession {
    token: string;
    createAt: string;
    expireAt: string;
    /** ПИН физ. лица (14 цифр), введённый вручную при получении токена — уходит на backend вместе
     * с резолюцией и сверяется там с ПИН владельца подписи из 2.6. */
    personIdnp: string;
    /** ФИО подписанта из get-cert-info (2.4) - если удалось получить, best-effort. */
    signerFio: string | null;
}

interface EcpSessionContextType {
    session: EcpSession | null;
    /** true - токен ещё не истёк на момент вызова (сравнение с Date.now(), а не разовое значение). */
    isValid: () => boolean;
    setSession: (session: EcpSession) => void;
    clearSession: () => void;
}

export const EcpSessionContext = createContext<EcpSessionContextType>({
    session: null,
    isValid: () => false,
    setSession: () => {},
    clearSession: () => {},
});

export const useEcpSession = () => useContext(EcpSessionContext);
