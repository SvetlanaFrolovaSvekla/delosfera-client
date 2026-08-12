import {apiClient} from "@/service/apiClient.ts";

/** Стадия годового Плана закупок (PRC-22). */
export type PlanStatus = "Draft" | "Approved" | "Closed";

export interface PlanItem {
    id: number;
    code: string;
    subject: string;
    plannedAmount: number;
    quarter: number | null;
    orgUnitTitle: string | null;
    subjectKindTitle: string;
    note: string | null;

    /** Факт: сколько заявок сослалось на позицию и на какую сумму. */
    requestCount: number;
    actualAmount: number;
    deviationPercent: number | null;
    isOverrun: boolean;
}

export interface Plan {
    id: number;
    year: number;
    status: PlanStatus;
    statusTitle: string;
    approvalProtocol: string | null;
    approvedOn: string | null;

    items: PlanItem[];
    plannedTotal: number;
    actualTotal: number;

    /** Закупки года без позиции плана — внеплановые (PRC-03). */
    unplannedRequestCount: number;
    unplannedAmount: number;
}

const BASE = "/api/procurement/plans";

export const planService = {
    async years(): Promise<number[]> {
        const {data} = await apiClient.get<number[]>(`${BASE}/years`);
        return data;
    },

    /** null — план на год не заведён (сервер отвечает 204). */
    async get(year: number): Promise<Plan | null> {
        const {data, status} = await apiClient.get<Plan>(`${BASE}/${year}`);
        return status === 204 ? null : data;
    },

    async create(year: number): Promise<Plan> {
        const {data} = await apiClient.post<Plan>(BASE, {year});
        return data;
    },

    async addItem(planId: number, body: {
        code: string;
        subject: string;
        plannedAmount: number;
        quarter?: number;
        orgUnitId?: number;
        note?: string;
    }): Promise<Plan> {
        const {data} = await apiClient.post<Plan>(`${BASE}/${planId}/items`, body);
        return data;
    },

    async removeItem(itemId: number): Promise<Plan> {
        const {data} = await apiClient.delete<Plan>(`${BASE}/items/${itemId}`);
        return data;
    },

    async approve(planId: number, approvalProtocol: string): Promise<Plan> {
        const {data} = await apiClient.post<Plan>(`${BASE}/${planId}/approve`, {approvalProtocol});
        return data;
    },
};
