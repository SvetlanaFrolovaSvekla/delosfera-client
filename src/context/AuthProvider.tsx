import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {AuthContext} from "./AuthContext.ts";
import {refreshSession} from "@/service/apiClient.ts";
import {authService} from "@/service/authService/authService.ts";
import {isTokenExpired} from "@/utils/isTokenExpired.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const hasFetchedRef = useRef(false);

    const fetchUser = useCallback(async () => {
        const accessToken = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("user");

        if (accessToken && storedUser && !isTokenExpired(accessToken)) {
            try {
                setUser(JSON.parse(storedUser));
                setLoading(false);
                return;
            } catch {
                // повреждённый JSON в localStorage - падает в обычный сценарий ниже
            }
        }

        if (!localStorage.getItem("refreshToken")) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const data = await refreshSession();
            setUser(data.user);
        } catch {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
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
            value={{user, loading, permissionCodes, hasPermission, login, logout, refetch: fetchUser}}
        >
            {children}
        </AuthContext.Provider>
    );
};