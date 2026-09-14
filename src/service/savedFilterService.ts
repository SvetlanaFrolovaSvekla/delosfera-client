import {apiClient} from "@/service/apiClient.ts";

// Личные сохранённые фильтры реестров (БП-16).

export interface SavedFilter {
    id: number;
    scope: string;
    name: string;
    payload: Record<string, unknown>;
    updatedAt: string;
}

const BASE = "/saved-filters";

export const savedFilterService = {
    async list(scope: string): Promise<SavedFilter[]> {
        const {data} = await apiClient.get<SavedFilter[]>(BASE, {params: {scope}});
        return data;
    },

    async create(scope: string, name: string, payload: Record<string, unknown>): Promise<SavedFilter> {
        const {data} = await apiClient.post<SavedFilter>(BASE, {scope, name, payload});
        return data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },
};
