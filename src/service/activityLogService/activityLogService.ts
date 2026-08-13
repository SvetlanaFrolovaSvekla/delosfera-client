import type {ActivityLogEntryResponse} from "./activityLogServiceType.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("accessToken");
    return token ? {Authorization: `Bearer ${token}`} : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? `Ошибка запроса: ${response.status}`;
        throw new Error(message);
    }
    return await response.json() as Promise<T>;
}

export const activityLogService = {
    /** Последние события журнала активности. Если module не указан, то по всем модулям сразу. */
    async getRecent(limit = 8, module?: string): Promise<ActivityLogEntryResponse[]> {
        const params = new URLSearchParams({limit: String(limit)});
        if (module) params.set("module", module);

        const response = await fetch(`${API_BASE}/activity-log/recent?${params}`, {
            headers: authHeaders(),
        });
        return handleResponse<ActivityLogEntryResponse[]>(response);
    },
};