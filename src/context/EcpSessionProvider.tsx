import React, {useCallback, useMemo, useState} from "react";
import {EcpSessionContext, type EcpSession} from "./EcpSessionContext.ts";

/**
 * ЭЦП-сессия ГП «Инфоком» держится только в памяти вкладки (React state) — НЕ в
 * localStorage/sessionStorage. Токен статичный, но короткоживущий и подтверждает
 * конкретные действия (резолюции согласования), а не заменяет вход в систему
 * (документация провайдера прямо запрещает ЭП как первый фактор). Перезагрузка
 * страницы или закрытие вкладки всегда начинают флоу подписания заново — это
 * ожидаемое поведение, а не баг.
 */
export const EcpSessionProvider = ({children}: {children: React.ReactNode}) => {
    const [session, setSessionState] = useState<EcpSession | null>(null);

    const isValid = useCallback(() => {
        if (!session) return false;
        return new Date(session.expireAt).getTime() > Date.now();
    }, [session]);

    const setSession = useCallback((next: EcpSession) => setSessionState(next), []);
    const clearSession = useCallback(() => setSessionState(null), []);

    const value = useMemo(
        () => ({session, isValid, setSession, clearSession}),
        [session, isValid, setSession, clearSession],
    );

    return <EcpSessionContext.Provider value={value}>{children}</EcpSessionContext.Provider>;
};
