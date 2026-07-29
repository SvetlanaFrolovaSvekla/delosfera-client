import type {CreateVndRequest, VndResponse, VndSearchRequest} from "./vndServiceType.ts";

// Подставь свой базовый URL/клиент — тут пример через fetch.
// Если в проекте уже есть общий axios-инстанс (например, api из "@/service/apiClient.ts"),
// замени fetch-вызовы на него — сигнатуры функций останутся такими же.
// ВАЖНО: все методы этого сервиса требуют авторизации (Bearer-токен) —
// не забудь передавать заголовок Authorization при интеграции с общим клиентом.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5293";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("accessToken"); // подставь свой способ хранения токена
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
    /**
     * Создать новый ВНД (черновик).
     * Документ создаётся в статусе "draft" — текст редакции загружается отдельно, позже.
     */
    async create(request: CreateVndRequest): Promise<VndResponse> {
        const response = await fetch(`${API_BASE}/vnd`, {
            method: "POST",
            headers: {"Content-Type": "application/json", ...authHeaders()},
            body: JSON.stringify(request),
        });
        return handleResponse<VndResponse>(response);
    },

    /**
     * Расширенный поиск ВНД по всем фильтрам.
     * Пустой объект `{}` вернёт все документы без фильтрации.
     */
    async search(request: VndSearchRequest): Promise<VndResponse[]> {
        const response = await fetch(`${API_BASE}/vnd/search`, {
            method: "POST",
            headers: {"Content-Type": "application/json", ...authHeaders()},
            body: JSON.stringify(request),
        });
        return handleResponse<VndResponse[]>(response);
    },

    /**
     * Получить один ВНД по id.
     */
    async getById(id: number): Promise<VndResponse> {
        const response = await fetch(`${API_BASE}/vnd/${id}`, {
            headers: authHeaders(),
        });
        return handleResponse<VndResponse>(response);
    },
};