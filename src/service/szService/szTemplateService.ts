import {apiClient} from "@/service/apiClient.ts";

// Личные шаблоны записок (СЗ-6) — зеркало backend DTO (Modules/Sz/DTO/SzTemplateDtos.cs).

/** Пресет полей записки. Всё необязательно — шаблон задаёт сколько нужно. */
export interface SzTemplatePayload {
    kindId?: number | null;
    title?: string | null;
    body?: string | null;
    correspondentUnitId?: number | null;
    addresseeUserId?: number | null;
    signerUserId?: number | null;
    approvalIsParallel?: boolean | null;
    isPaperCarrier?: boolean | null;
    rubricIds?: number[];
    approverUserIds?: number[];
    proposedAssigneeUserIds?: number[];
}

export interface SzTemplate {
    id: number;
    name: string;
    payload: SzTemplatePayload;
    updatedAt: string;
}

const BASE = "/sz/templates";

export const szTemplateService = {
    async list(): Promise<SzTemplate[]> {
        const {data} = await apiClient.get<SzTemplate[]>(BASE);
        return data;
    },

    async create(name: string, payload: SzTemplatePayload): Promise<SzTemplate> {
        const {data} = await apiClient.post<SzTemplate>(BASE, {name, payload});
        return data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },
};
