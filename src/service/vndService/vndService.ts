import type {
    CreateVndRedactionRequest,
    CreateVndRequest, EditLastRevisionDirectlyRequest,
    UpdateVndRequisitesRequest,
    VndActualizationSummaryResponse,
    VndLinksResponse, VndQuickSearchResult,
    VndRedactionResponse,
    VndResponse,
    VndSearchRequest
} from "./vndServiceType.ts";

import {getAccessToken} from "@/service/tokenStore.ts";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

function authHeaders(): HeadersInit {
    const token = getAccessToken();
    return token ? {Authorization: `Bearer ${token}`} : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? `Ошибка запроса: ${response.status}`;
        throw new Error(message);
    }
    return response.json() as Promise<T>;
}

export const vndService = {
    async create(request: CreateVndRequest): Promise<VndResponse> {
        const response = await fetch(`${API_BASE}/vnd`, {
            method: "POST",
            headers: {"Content-Type": "application/json", ...authHeaders()},
            body: JSON.stringify(request),
        });
        return handleResponse<VndResponse>(response);
    },

    async search(request: VndSearchRequest): Promise<VndResponse[]> {
        const response = await fetch(`${API_BASE}/vnd/search`, {
            method: "POST",
            headers: {"Content-Type": "application/json", ...authHeaders()},
            body: JSON.stringify(request),
        });
        return handleResponse<VndResponse[]>(response);
    },

    async getById(id: number): Promise<VndResponse> {
        const response = await fetch(`${API_BASE}/vnd/${id}`, {
            headers: authHeaders(),
        });
        return handleResponse<VndResponse>(response);
    },

    async getActualizationSummary(): Promise<VndActualizationSummaryResponse> {
        const response = await fetch(`${API_BASE}/vnd/actualization/summary`, {
            headers: authHeaders(),
        });
        return handleResponse<VndActualizationSummaryResponse>(response);
    },

    async getRedactions(vndId: number): Promise<VndRedactionResponse[]> {
        const response = await fetch(`${API_BASE}/vnd/${vndId}/redactions`, {
            headers: authHeaders(),
        });
        return handleResponse<VndRedactionResponse[]>(response);
    },

    async addRedaction(vndId: number, request: CreateVndRedactionRequest): Promise<VndRedactionResponse> {
        const formData = new FormData();
        formData.append("DocRu", request.docRu);
        if (request.docKg) formData.append("DocKg", request.docKg);
        if (request.docEn) formData.append("DocEn", request.docEn);
        if (request.tid) formData.append("Tid", request.tid);
        if (request.description) formData.append("Description", request.description);
        formData.append("RequiresApproval", String(request.requiresApproval));

        for (const file of request.attachments ?? []) {
            formData.append("Attachments", file);
        }

        const response = await fetch(`${API_BASE}/vnd/${vndId}/redactions`, {
            method: "POST",
            headers: authHeaders(),
            body: formData,
        });
        return handleResponse<VndRedactionResponse>(response);
    },

    async submitRedaction(vndId: number, redactionId: number): Promise<VndRedactionResponse> {
        const response = await fetch(`${API_BASE}/vnd/${vndId}/redactions/${redactionId}/submit`, {
            method: "POST",
            headers: authHeaders(),
        });
        return handleResponse<VndRedactionResponse>(response);
    },

    /** Только для главного редактора: сделать черновик редакции действующим напрямую,
     * минуя согласование целиком. */
    async publishRedactionWithoutApproval(vndId: number, redactionId: number): Promise<VndRedactionResponse> {
        const response = await fetch(`${API_BASE}/vnd/${vndId}/redactions/${redactionId}/publish-without-approval`, {
            method: "POST",
            headers: authHeaders(),
        });
        return handleResponse<VndRedactionResponse>(response);
    },

    /**
     * Обновить реквизиты ВНД (кнопка "Изменить реквизиты").
     * Даты "Изменение реквизитов" / "Изменение редакции" сюда не входят - они выставляются бэкендом автоматически.
     */
    async updateRequisites(id: number, request: UpdateVndRequisitesRequest): Promise<VndResponse> {
        const response = await fetch(`${API_BASE}/vnd/${id}/requisites`, {
            method: "PUT",
            headers: {"Content-Type": "application/json", ...authHeaders()},
            body: JSON.stringify(request),
        });
        return handleResponse<VndResponse>(response);
    },

    /** Связи ВНД: ссылки на другие документы и документы, ссылающиеся на этот */
    async getLinks(vndId: number): Promise<VndLinksResponse> {
        const response = await fetch(`${API_BASE}/vnd/${vndId}/links`, {
            headers: authHeaders(),
        });
        return handleResponse<VndLinksResponse>(response);
    },

    /** Добавить ссылку на другой (только действующий) ВНД */
    async addLink(vndId: number, targetVndId: number): Promise<VndLinksResponse> {
        const response = await fetch(`${API_BASE}/vnd/${vndId}/links`, {
            method: "POST",
            headers: {"Content-Type": "application/json", ...authHeaders()},
            body: JSON.stringify({targetVndId}),
        });
        return handleResponse<VndLinksResponse>(response);
    },

    /** Удалить ВНД (только черновик; проверка прав и статуса — на бэке) */
    async remove(id: number): Promise<void> {
        const response = await fetch(`${API_BASE}/vnd/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.message ?? `Ошибка запроса: ${response.status}`);
        }
    },

    /** Удалить связь ВНД (можно с любой из сторон связи) */
    async deleteLink(vndId: number, linkId: number): Promise<void> {
        const response = await fetch(`${API_BASE}/vnd/${vndId}/links/${linkId}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.message ?? `Ошибка запроса: ${response.status}`);
        }
    },

    async editLastRevisionDirectly(vndId: number, request: EditLastRevisionDirectlyRequest): Promise<VndRedactionResponse> {
        const formData = new FormData();
        if (request.docRu) formData.append("DocRu", request.docRu);
        if (request.docKg) formData.append("DocKg", request.docKg);
        if (request.docEn) formData.append("DocEn", request.docEn);
        if (request.description !== undefined) formData.append("Description", request.description);

        const response = await fetch(`${API_BASE}/vnd/${vndId}/redactions/last`, {
            method: "PUT",
            headers: authHeaders(),
            body: formData,
        });
        return handleResponse<VndRedactionResponse>(response);
    },

    async quickSearch(query: string, limit = 8, signal?: AbortSignal): Promise<VndQuickSearchResult[]> {
        const params = new URLSearchParams({q: query, limit: String(limit)});
        const response = await fetch(`${API_BASE}/vnd/quick-search?${params}`, {
            headers: authHeaders(),
            signal,
        });
        return handleResponse<VndQuickSearchResult[]>(response);
    },
};