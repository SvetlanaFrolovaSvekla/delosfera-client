import type {RoleResponse} from "./userServiceType.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

function getLanguage(): string {
    return localStorage.getItem("lang") ?? "ru";
}

function getAuthToken(): string | null {
    return localStorage.getItem("accessToken");
}

function buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {"X-Language": getLanguage()};
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

export const roleService = {
    async getAll(): Promise<RoleResponse[]> {
        const response = await fetch(`${API_BASE}/api/users/roles`, {headers: buildHeaders()});
        if (!response.ok) throw new Error(`Ошибка запроса: ${response.status}`);
        return response.json();
    },
};