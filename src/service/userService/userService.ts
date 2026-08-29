import {apiClient} from "@/service/apiClient.ts";
import {cached, invalidate} from "@/service/dictionaryCache.ts";
import type {
    UserPage,
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

    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.search) query.set("search", params.search);
    params.sources?.forEach((s) => query.append("sources", s));
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
        // Подставляется почти в каждую форму: согласующие, исполнители, адресат.
        // Состав сотрудников за время работы вкладки меняется редко.
        return cached("users:lookup", async () => {
            const {data} = await apiClient.get<UserLookupItem[]>("/users/lookup");
            return data;
        });
    },

    /**
     * Страница списка сотрудников. Полного списка здесь нет намеренно: на
     * пятистах учётных записях это семьсот килобайт на каждое открытие, и
     * дальше только больше. Для выбора человека в форме есть lookup.
     */
    async getPage(params?: GetUsersParams): Promise<UserPage> {
        const response = await fetch(`${API_BASE}/users?${buildQuery(params)}`, {
            headers: buildHeaders(),
        });
        return handleResponse<UserPage>(response);
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
        const created = await handleResponse<UserResponse>(response);
        // Состав сотрудников изменился — список выбора должен это увидеть,
        // иначе нового человека нельзя назначить ещё пять минут.
        invalidate("users:");
        return created;
    },

    async update(id: number, request: UpdateUserRequest): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}`, {
            method: "PUT",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        const updated = await handleResponse<UserResponse>(response);
        invalidate("users:");
        return updated;
    },

    async block(id: number, request: BlockUserRequest = {}): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}/block`, {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        const blocked = await handleResponse<UserResponse>(response);
        // Заблокированные из списка выбора исчезают: назначать им задачу бессмысленно.
        invalidate("users:");
        return blocked;
    },

    async unblock(id: number): Promise<UserResponse> {
        const response = await fetch(`${API_BASE}/users/${id}/unblock`, {
            method: "POST",
            headers: buildHeaders(),
        });
        const unblocked = await handleResponse<UserResponse>(response);
        invalidate("users:");
        return unblocked;
    },

    async remove(id: number): Promise<void> {
        const response = await fetch(`${API_BASE}/users/${id}`, {
            method: "DELETE",
            headers: buildHeaders(),
        });
        await handleResponse<void>(response);
        invalidate("users:");
    },
};