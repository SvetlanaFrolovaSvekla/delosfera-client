import {apiClient} from "@/service/apiClient.ts";

/** Контур, в котором ищем. Пустой список — во всех доступных. */
export type SearchScope = "Sz" | "Procurement" | "Contract" | "Meeting";

export interface SearchRequest {
    query?: string;
    scopes?: SearchScope[];
    statuses?: string[];
    authorId?: number;
    orgUnitId?: number;
    from?: string;
    to?: string;
    amountFrom?: number;
    amountTo?: number;
    page?: number;
    pageSize?: number;
}

export interface SearchHit {
    scope: SearchScope;
    scopeTitle: string;
    id: number;
    regNumber: string | null;
    title: string;
    /** Фрагмент текста, в котором нашлось совпадение. */
    snippet: string | null;
    statusTitle: string | null;
    authorName: string | null;
    orgUnitTitle: string | null;
    amount: number | null;
    createdAt: string;
    url: string;
}

export interface SearchResult {
    total: number;
    page: number;
    pageSize: number;
    items: SearchHit[];
    /** Сколько нашлось в каждом контуре — по ним строятся вкладки. */
    countByScope: Record<string, number>;
}

export interface SavedSearch {
    id: number;
    name: string;
    criteria: SearchRequest;
    createdAt: string;
}

export const scopeOptions: {value: SearchScope; title: string}[] = [
    {value: "Sz", title: "Служебные записки"},
    {value: "Procurement", title: "Закупки"},
    {value: "Contract", title: "Договоры"},
    {value: "Meeting", title: "Заседания"},
];

const BASE = "/search";

export const searchService = {
    async search(request: SearchRequest): Promise<SearchResult> {
        const {data} = await apiClient.post<SearchResult>(BASE, request);
        return data;
    },

    async saved(): Promise<SavedSearch[]> {
        const {data} = await apiClient.get<SavedSearch[]>(`${BASE}/saved`);
        return data;
    },

    async save(name: string, criteria: SearchRequest): Promise<SavedSearch> {
        const {data} = await apiClient.post<SavedSearch>(`${BASE}/saved`, {name, criteria});
        return data;
    },

    async removeSaved(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/saved/${id}`);
    },
};
