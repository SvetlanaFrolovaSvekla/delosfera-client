import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {AuthContext} from "./AuthContext.ts";
import {refreshSession} from "@/service/apiClient.ts";
import {authService} from "@/service/authService/authService.ts";
import {setAccessToken} from "@/service/tokenStore.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const hasFetchedRef = useRef(false);

    // Access-токен живёт только в памяти и теряется при перезагрузке, поэтому сессию
    // всегда восстанавливаем через /auth/refresh (httpOnly-cookie). Нет cookie → 401 → гость.
    const fetchUser = useCallback(async () => {
        try {
            const data = await refreshSession();
            setUser(data.user);
        } catch {
            setAccessToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        void fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        const handler = () => fetchUser();
        window.addEventListener("auth-change", handler);
        return () => window.removeEventListener("auth-change", handler);
    }, [fetchUser]);

    const login = useCallback(async (email: string, password: string) => {
        const data = await authService.login({email, password});
        setUser(data.user);
    }, []);

    const loginDomain = useCallback(async () => {
        const data = await authService.loginDomain();
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);

    const permissionCodes = useMemo(() => {
        const codes = new Set<number>();
        user?.roles.forEach((role) => role.permissionCodes.forEach((code) => codes.add(code)));
        return codes;
    }, [user]);

    const hasPermission = useCallback(
        (code: number) => permissionCodes.has(code),
        [permissionCodes]
    );

    return (
        <AuthContext.Provider
            value={{user, loading, permissionCodes, hasPermission, login, loginDomain, logout, refetch: fetchUser}}
        >
            {children}
        </AuthContext.Provider>
    );
};