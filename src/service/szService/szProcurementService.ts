import {apiClient} from "@/service/apiClient.ts";

/** Состояние передачи записки в закупочный контур (PRC-01). */
export interface SzProcurement {
    szId: number;
    szRegNumber: string | null;

    isProcurementKind: boolean;

    hasBudget: boolean | null;
    amount: number | null;
    initiatorName: string | null;
    initiatorUnit: string | null;
    dueDate: string | null;

    isHandedOver: boolean;
    handedOverAt: string | null;

    procurementDocumentId: number | null;
    procurementRegNumber: string | null;
    procurementTitle: string | null;
    procurementStatus: string | null;

    /** Чего не хватает для запуска; пусто — можно передавать. */
    blockers: string[];
}

const BASE = "/api/sz";

export const szProcurementService = {
    async get(szId: number): Promise<SzProcurement> {
        const {data} = await apiClient.get<SzProcurement>(`${BASE}/${szId}/procurement`);
        return data;
    },

    async handOver(szId: number, subject?: string, note?: string): Promise<SzProcurement> {
        const {data} = await apiClient.post<SzProcurement>(`${BASE}/${szId}/procurement`, {subject, note});
        return data;
    },
};
