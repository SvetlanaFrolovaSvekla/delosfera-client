import {apiClient, refreshSession} from "@/service/apiClient.ts";
import type {LoginRequest, LoginResponse} from "@/service/authService/authServiceType.ts";
import {setAccessToken} from "@/service/tokenStore.ts";
import {invalidate} from "@/service/dictionaryCache.ts";

class AuthService {
    async login(request: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>("/auth/login", request);
        // Access-токен — только в память; refresh пришёл в httpOnly-cookie.
        setAccessToken(response.data.token);
        return response.data;
    }

    /**
     * Вход по доменной учётной записи (INT-01): пароль проверяет служба каталогов,
     * привязываясь к ней от имени самого сотрудника. Система пароль не хранит.
     */
    async loginDomain(login: string, password: string): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>("/auth/login-domain", {login, password});
        setAccessToken(response.data.token);
        return response.data;
    }

    /**
     * Обновляет сессию по httpOnly refresh-cookie (через защищённую от гонки логику
     * apiClient с navigator.locks). Возвращает новый access-токен.
     */
    async refresh(): Promise<string> {
        const response = await refreshSession();
        return response.token;
    }

    async logout(): Promise<void> {
        // Сервер отзовёт refresh по cookie и очистит её; локально сбрасываем access-токен.
        setAccessToken(null);
        // Справочники зависят от прав вошедшего — следующему за этим компьютером
        // они должны прийти заново, а не достаться от предыдущего.
        invalidate();
        await apiClient.post("/auth/logout").catch(() => {});
    }
}

export const authService = new AuthService();
