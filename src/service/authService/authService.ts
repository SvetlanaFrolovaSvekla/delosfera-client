import {apiClient, refreshSession} from "@/service/apiClient.ts";
import type {LoginRequest, LoginResponse} from "@/service/authService/authServiceType.ts";

class AuthService {
    async login(request: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>("/api/auth/login", request);
        const {token, refreshToken, user} = response.data;
        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("user", JSON.stringify(user));
        return response.data;
    }

    /**
     * Обновляет пару токенов через ту же защищённую от гонки логику,
     * что использует apiClient (navigator.locks). Возвращает новый accessToken —
     * его ждёт axiosInstance, чтобы повторить упавший с 401 запрос.
     */
    async refresh(): Promise<string> {
        const response = await refreshSession();
        return response.token;
    }

    async logout(): Promise<void> {
        const refreshToken = localStorage.getItem("refreshToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        if (refreshToken) {
            await apiClient.post("/api/auth/logout", {refreshToken}).catch(() => {});
        }
    }
}

export const authService = new AuthService();