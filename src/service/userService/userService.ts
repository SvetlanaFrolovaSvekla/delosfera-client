import type {
    BlockUserRequest,
    CreateUserRequest,
    GetUsersParams,
    UpdateUserRequest,
    UserResponse,
} from "./userServiceType.ts";

import {getLanguage} from "@/utils/getLanguage.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

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
    if (response.status === 204) return undefined as T;
    return await response.json() as Promise<T>;
}

function buildQuery(params?: GetUsersParams): string {
    const query = new URLSearchParams();
    if (!params) return query.toString();

    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.search) query.set("search", params.search);
    if (params.source) query.set("source", params.source);
    if (params.isBlocked !== undefined) query.set("isBlocked", String(params.isBlocked));
    params.orgUnitIds?.forEach((id) => query.append("orgUnitIds", String(id)));
    params.positionIds?.forEach((id) => query.append("positionIds", String(id)));
    params.roleIds?.forEach((id) => query.append("roleIds", String(id)));

    return query.toString();
}

export const userService = {
    async getAll(params?: GetUsersParams): Promise<UserResponse[]> {
        const response = await fetch(`${API_BASE}/users?${buildQuery(params)}`, {
            headers: buildHeaders(),
        });
        return handleResponse<UserResponse[]>(response);
    },

    async getMe(): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: buildHeaders(),
        });
        return handleResponse<UserResponse>(response);
    },

    async create(request: CreateUserRequest): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users`, {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<UserResponse>(response);
    },

    async update(id: number, request: UpdateUserRequest): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}`, {
            method: "PUT",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<UserResponse>(response);
    },

    async block(id: number, request: BlockUserRequest = {}): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}/block`, {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<UserResponse>(response);
    },

    async unblock(id: number): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}/unblock`, {
            method: "POST",
            headers: buildHeaders(),
        });
        return handleResponse<UserResponse>(response);
    },

    async remove(id: number): Promise<void> {
        const response = await fetch(`${API_BASE}/users/${id}`, {
            method: "DELETE",
            headers: buildHeaders(),
        });
        return handleResponse<void>(response);
    },
};