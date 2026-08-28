import {apiClient} from "@/service/apiClient.ts";
import type {
    BlockUserRequest,
    CreateUserRequest,
    GetUsersParams,
    UpdateUserRequest,
    UserActivityResponse,
    UserResponse,
} from "./userServiceType.ts";

import {getLanguage} from "@/utils/getLanguage.ts";
import {getAccessToken} from "@/service/tokenStore.ts";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

function buildHeaders(withJson = false): HeadersInit {
    const headers: Record<string, string> = {
        "X-Language": getLanguage(),
    };

    if (withJson) headers["Content-Type"] = "application/json";

    const token = getAccessToken();
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


/** Сотрудник в списке выбора: только то, чем его опознают. */
export interface UserLookupItem {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;

    /** Идентификатор подразделения — по нему оно подставляется в поля карточки. */
    orgUnitId: number | null;

    /** Член Правления — идёт первым в подборе согласующих и подписанта. */
    isBoardMember: boolean;

    /** Руководит подразделением — идёт вторым в том же подборе. */
    isUnitHead: boolean;
}

export const userService = {
    /** Одна учётная запись — для карточки пользователя. */
    async getById(id: number): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}`, {
            headers: buildHeaders(),
        });
        return handleResponse<UserResponse>(response);
    },

    /**
     * Краткий список для выбора человека — согласующим, исполнителем, подписантом.
     *
     * Полный список отдаёт роли, даты блокировки и вложенные объекты: на пятистах
     * сотрудниках это полмегабайта на каждое открытие карточки. Здесь четыре поля,
     * и заблокированные не приходят — назначать им задачу бессмысленно.
     */
    async lookup(): Promise<UserLookupItem[]> {
        const {data} = await apiClient.get<UserLookupItem[]>("/users/lookup");
        return data;
    },

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

    async getActivity(id: number): Promise<UserActivityResponse> {
        const response = await fetch(`${API_BASE}/users/${id}/activity`, {
            headers: buildHeaders(),
        });
        return handleResponse<UserActivityResponse>(response);
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