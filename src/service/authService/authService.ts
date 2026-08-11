import {apiClient, refreshSession} from "@/service/apiClient.ts";
import type {LoginRequest, LoginResponse} from "@/service/authService/authServiceType.ts";
import {setAccessToken} from "@/service/tokenStore.ts";

class AuthService {
    async login(request: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>("/auth/login", request);
        // Access-токен — только в память; refresh пришёл в httpOnly-cookie.
        setAccessToken(response.data.token);
        return response.data;
    }

    /**
     * Вход по доменной (LDAP/AD) учётной записи. Учётные данные не передаются:
     * сервер определяет пользователя по интегрированной аутентификации рабочей станции.
     * Пока эндпоинт не включён на сервере, вызов вернёт 404/501 — UI покажет ошибку.
     */
    async loginDomain(): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>("/auth/login-domain", {});
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
        await apiClient.post("/auth/logout").catch(() => {});
    }
}

export const authService = new AuthService();
