import {apiClient} from "@/service/apiClient.ts";

/**
 * Позиции Плана закупок для выбора в заявке.
 *
 * Раньше инициатор вписывал позицию текстом — «п. 4.2 Плана закупок на 2026 год», —
 * и отчёт об исполнении искал её вхождением кода. Опечатка в номере, и закупка
 * выпадала из отчёта, оставаясь плановой на вид.
 */

export interface PlanItemLookup {
    id: number;
    code: string;
    subject: string;
    year: number;
    plannedAmount: number;
    /** Уже выбрано другими заявками по этой позиции. */
    usedAmount: number;
    /** Плановая сумма минус выбранное; отрицательное — позиция перебрана. */
    remainingAmount: number;
    quarter: number | null;
    orgUnitId: number | null;
    orgUnitTitle: string | null;
    subjectKindTitle: string;
}

export const planItemLookupService = {
    /** Позиции утверждённых планов; позиции своего подразделения идут первыми. */
    async search(query: string, orgUnitId?: number | null, limit = 20) {
        const {data} = await apiClient.get<PlanItemLookup[]>("/procurement/plans/items/search", {
            params: {q: query || undefined, orgUnitId: orgUnitId ?? undefined, limit},
        });
        return data;
    },
};
