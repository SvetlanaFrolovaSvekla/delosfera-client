import axios, {type InternalAxiosRequestConfig} from "axios";
import type {LoginResponse} from "@/service/authService/authServiceType.ts";
import {getAccessToken, setAccessToken} from "@/service/tokenStore.ts";
import {getLanguage} from "@/utils/translations/getLanguage.ts";

// Пусто - тот же адрес, по которому открыт клиент; префикс /api разбирает
// reverse-proxy и передаёт запрос приложению как есть.
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

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
    // Префикс api уже внутри API_BASE_URL — второй раз его добавлять нельзя,
    // иначе запрос уходит на /api/api/auth/refresh и сессия не восстанавливается.
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

/**
 * Текст ошибки, который сервер положил в тело ответа: контроллеры отдают
 * { message: "..." } (400/404/409), а встроенные ответы ASP.NET Core - ProblemDetails
 * (detail/title) или ошибки валидации (errors). Нужен, чтобы пользователь видел причину
 * ("У пользователей нет права выступать в роли согласующего: ..."), а не стандартное
 * "Request failed with status code 409".
 */
function extractServerMessage(data: unknown): string | null {
    if (typeof data === "string") return data.trim() && data.length < 500 ? data.trim() : null;
    if (!data || typeof data !== "object") return null;

    const body = data as Record<string, unknown>;
    for (const key of ["message", "detail", "title"]) {
        const value = body[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }

    const errors = body.errors;
    if (errors && typeof errors === "object") {
        const first = Object.values(errors as Record<string, unknown>).flat().find((v) => typeof v === "string");
        if (typeof first === "string") return first;
    }
    return null;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Подменяем стандартное сообщение axios на текст ответа сервера (если он есть) - так
        // `e.message` в catch-блоках компонентов сразу содержит понятную причину.
        const serverMessage = extractServerMessage(error.response?.data);
        if (serverMessage) error.message = serverMessage;

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
