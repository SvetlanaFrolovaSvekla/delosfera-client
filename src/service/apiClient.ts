import axios, {type InternalAxiosRequestConfig} from "axios";
import type {LoginResponse} from "@/service/authService/authServiceType.ts";
import {getLanguage} from "@/utils/getLanguage.ts";
import {getAccessToken, setAccessToken} from "@/service/tokenStore.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// withCredentials: браузер отправляет httpOnly refresh-cookie на /auth/*.
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers["X-Language"] = getLanguage();
    return config;
});

let refreshPromise: Promise<LoginResponse> | null = null;

async function doRefresh(): Promise<LoginResponse> {
    // Refresh-токен не передаётся из JS — он уходит автоматически в httpOnly-cookie.
    const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/refresh`, null, {withCredentials: true});
    setAccessToken(response.data.token);
    return response.data;
}

/**
 * Единая точка обновления сессии. Лок через navigator.locks сериализует /auth/refresh
 * между несколькими вкладками одного сайта.
 */
export async function refreshSession(): Promise<LoginResponse> {
    if (refreshPromise) return refreshPromise; // защита внутри текущей вкладки

    if (!("locks" in navigator)) {
        // Фолбэк для очень старых браузеров без Web Locks API
        refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
        return refreshPromise;
    }

    refreshPromise = navigator.locks
        .request("delosfera-refresh-token", async () => doRefresh())
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url ?? "";
        const isRefreshCall = requestUrl.includes("/auth/refresh");
        // 401 от самих эндпоинтов входа (/auth/login, /auth/login-domain) означает неверные
        // учётные данные, а не протухший access-токен. Не пытаемся обновлять сессию —
        // иначе форма получит ошибку refresh ("Refresh-токен отсутствует") вместо ошибки входа.
        const isLoginCall = requestUrl.includes("/auth/login");

        if (error.response?.status !== 401 || originalRequest._retry || isRefreshCall || isLoginCall) {
            if (error.response?.status === 401 && isRefreshCall) {
                setAccessToken(null);
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
            setAccessToken(null);
            window.dispatchEvent(new Event("auth-change"));
            return Promise.reject(refreshError);
        }
    }
);
