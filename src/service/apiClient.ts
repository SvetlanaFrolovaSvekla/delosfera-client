import axios, {type InternalAxiosRequestConfig} from "axios";
import type {LoginResponse} from "@/service/authService/authServiceType.ts";
import {getLanguage} from "@/utils/getLanguage.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers["X-Language"] = getLanguage();
    return config;
});

let refreshPromise: Promise<LoginResponse> | null = null;

async function doRefresh(): Promise<LoginResponse> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");

    const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/refresh`, {refreshToken});
    localStorage.setItem("accessToken", response.data.token);
    localStorage.setItem("refreshToken", response.data.refreshToken);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
}
/**
 * Единая точка обновления сессии. Лок через navigator.locks гарантирует,
 * что даже несколько ОТКРЫТЫХ ВКЛАДОК одного сайта не смогут одновременно
 * вызвать /auth/refresh — выполнение сериализуется на уровне браузера.
 */
export async function refreshSession(): Promise<LoginResponse> {
    if (refreshPromise) return refreshPromise; // защита внутри текущей вкладки

    if (!("locks" in navigator)) {
        // Фолбэк для очень старых браузеров без Web Locks API
        refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
        return refreshPromise;
    }

    refreshPromise = navigator.locks
        .request("delosfera-refresh-token", async () => {
            // Пока ждали лок, другая вкладка могла уже обновить токен —
            // перечитываем localStorage перед реальным запросом
            return doRefresh();
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isRefreshCall = originalRequest?.url?.includes("/auth/refresh");

        if (error.response?.status !== 401 || originalRequest._retry || isRefreshCall) {
            if (error.response?.status === 401 && isRefreshCall) {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.dispatchEvent(new Event("auth-change"));
            }
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const {token} = await refreshSession();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
        } catch (refreshError) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.dispatchEvent(new Event("auth-change"));
            return Promise.reject(refreshError);
        }
    }
);