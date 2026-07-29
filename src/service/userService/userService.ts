import type {
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
    UserSortBy,
} from "./userServiceType.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

// Подставь свою реальную логику получения текущего языка (i18n) и токена авторизации.
function getLanguage(): string {
    return localStorage.getItem("lang") ?? "ru";
}

function getAuthToken(): string | null {
    return localStorage.getItem("accessToken");
}

function buildHeaders(withJson = false): HeadersInit {
    const headers: Record<string, string> = {
        "X-Language": getLanguage(),
    };

    if (withJson) headers["Content-Type"] = "application/json";

    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? `Ошибка запроса: ${response.status}`;
        throw new Error(message);
    }
    // Для DELETE (204 No Content) тела ответа нет
    if (response.status === 204) return undefined as T;
    return await response.json() as Promise<T>;
}

export const userService = {
    /**
     * Получить список пользователей.
     */
    async getAll(params?: {sortBy?: UserSortBy; search?: string}): Promise<UserResponse[]> {
        const query = new URLSearchParams();
        if (params?.sortBy) query.set("sortBy", params.sortBy);
        if (params?.search) query.set("search", params.search);

        const response = await fetch(`${API_BASE}/api/users?${query.toString()}`, {
            headers: buildHeaders(),
        });
        return handleResponse<UserResponse[]>(response);
    },

    /**
     * Создать нового пользователя.
     */
    async create(request: CreateUserRequest): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/api/users`, {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<UserResponse>(response);
    },

    /**
     * Обновить существующего пользователя.
     */
    async update(id: number, request: UpdateUserRequest): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/api/users/${id}`, {
            method: "PUT",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<UserResponse>(response);
    },

    /**
     * Удалить пользователя.
     */
    async remove(id: number): Promise<void> {
        const response = await fetch(`${API_BASE}/api/users/${id}`, {
            method: "DELETE",
            headers: buildHeaders(),
        });
        return handleResponse<void>(response);
    },
};