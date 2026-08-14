import {apiClient} from "@/service/apiClient.ts";

/** Строка сравнительной таблицы предложений (PRC-09). */
export interface Proposal {
    id: number;
    supplierId: number;
    supplierTitle: string;
    supplierInn: string | null;

    price: number;
    deliveryDays: number | null;
    warrantyMonths: number | null;
    paymentTerms: string | null;
    specification: string | null;
    receivedOn: string;

    /** null — заключения о технических требованиях ещё нет. */
    meetsRequirements: boolean | null;
    rejectionReason: string | null;
    isWinner: boolean;

    /** Насколько дороже минимальной цены, в процентах. */
    priceDeltaPercent: number | null;

    supplierBlacklisted: boolean;
    supplierAffiliated: boolean;
    supplierReliable: boolean | null;
}

export interface ProposalComparison {
    requestId: number;
    methodTitle: string;
    minProposals: number;
    receivedCount: number;
    eligibleCount: number;
    proposals: Proposal[];
    /** Кандидат в победители: наименьшая цена среди допущенных. */
    recommendedProposalId: number | null;
    lowestPrice: number | null;
    protocolRequired: boolean;
    blockers: string[];
}

export interface ProposalCreateRequest {
    supplierId?: number;
    supplierTitle?: string;
    supplierInn?: string;
    price: number;
    deliveryDays?: number;
    warrantyMonths?: number;
    paymentTerms?: string;
    specification?: string;
    receivedOn?: string;
}

const BASE = "/procurement";

export const proposalService = {
    async comparison(requestId: number): Promise<ProposalComparison> {
        const {data} = await apiClient.get<ProposalComparison>(`${BASE}/requests/${requestId}/proposals`);
        return data;
    },

    async add(requestId: number, request: ProposalCreateRequest): Promise<ProposalComparison> {
        const {data} = await apiClient.post<ProposalComparison>(`${BASE}/requests/${requestId}/proposals`, request);
        return data;
    },

    async verdict(proposalId: number, meetsRequirements: boolean, rejectionReason?: string): Promise<ProposalComparison> {
        const {data} = await apiClient.post<ProposalComparison>(
            `${BASE}/proposals/${proposalId}/verdict`, {meetsRequirements, rejectionReason});
        return data;
    },

    async remove(proposalId: number): Promise<ProposalComparison> {
        const {data} = await apiClient.delete<ProposalComparison>(`${BASE}/proposals/${proposalId}`);
        return data;
    },

    async declareWinner(requestId: number, proposalId: number): Promise<ProposalComparison> {
        const {data} = await apiClient.post<ProposalComparison>(
            `${BASE}/requests/${requestId}/proposals/${proposalId}/winner`, {});
        return data;
    },
};
