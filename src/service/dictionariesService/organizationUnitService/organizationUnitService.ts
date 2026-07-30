import type {
    CreateOrganizationUnitRequest,
    OrganizationUnitResponse,
    OrganizationUnitSortBy,
    UpdateOrganizationUnitRequest,
} from "./organizationUnitServiceType.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

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
    if (response.status === 204) return undefined as T;
    return await response.json() as Promise<T>;
}

export const organizationUnitService = {
    /**
     * Получить список структурных подразделений.
     */
    async getAll(params?: {sortBy?: OrganizationUnitSortBy; search?: string}): Promise<OrganizationUnitResponse[]> {
        const query = new URLSearchParams();
        if (params?.sortBy) query.set("sortBy", params.sortBy);
        if (params?.search) query.set("search", params.search);

        const response = await fetch(
            `${API_BASE}/api/dictionaries/organization-unit?${query.toString()}`,
            {headers: buildHeaders()}
        );
        return handleResponse<OrganizationUnitResponse[]>(response);
    },

    /**
     * Создать новое структурное подразделение.
     */
    async create(request: CreateOrganizationUnitRequest): Promise<OrganizationUnitResponse> {
        const response = await fetch(`${API_BASE}/api/dictionaries/organization-unit`, {
            method: "POST",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<OrganizationUnitResponse>(response);
    },

    /**
     * Обновить структурное подразделение.
     */
    async update(id: number, request: UpdateOrganizationUnitRequest): Promise<OrganizationUnitResponse> {
        const response = await fetch(`${API_BASE}/api/dictionaries/organization-unit/${id}`, {
            method: "PUT",
            headers: buildHeaders(true),
            body: JSON.stringify(request),
        });
        return handleResponse<OrganizationUnitResponse>(response);
    },

    /**
     * Удалить структурное подразделение.
     */
    async remove(id: number): Promise<void> {
        const response = await fetch(`${API_BASE}/api/dictionaries/organization-unit/${id}`, {
            method: "DELETE",
            headers: buildHeaders(),
        });
        return handleResponse<void>(response);
    },
};