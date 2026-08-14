import {apiClient} from "@/service/apiClient.ts";

/** Стадия конкурса (PRC-13..16). Сервер сериализует перечисления строками. */
export type TenderStatus = "Draft" | "Published" | "Opened" | "Decided" | "Failed" | "Cancelled";

/** Роль в комиссии по закупке. */
export type CommissionRole = "Chairman" | "Member" | "Secretary";

export interface CommissionMember {
    id: number;
    userId: number;
    userName: string;
    role: CommissionRole;
    roleTitle: string;
    isBoardMember: boolean;
    isAccountant: boolean;
    attendedOpening: boolean;
    dissentingOpinion: string | null;
}

export interface TenderBid {
    id: number;
    supplierId: number;
    supplierTitle: string;
    supplierInn: string | null;
    price: number;
    submittedOn: string;
    isLate: boolean;
    isAdmitted: boolean;
    rejectionReason: string | null;
    score: number | null;
    specification: string | null;
    isWinner: boolean;
    supplierBlacklisted: boolean;
}

export interface Tender {
    id: number;
    requestId: number;
    regNumber: string | null;

    status: TenderStatus;
    statusTitle: string;

    subject: string;
    amount: number;
    isLimited: boolean;

    publishedOn: string | null;
    submissionDeadline: string | null;
    openedOn: string | null;

    commissionOrderNumber: string | null;
    commissionOrderDate: string | null;

    previousTenderId: number | null;
    failureReason: string | null;

    commission: CommissionMember[];
    bids: TenderBid[];

    /** Требования к составу комиссии для этой суммы (PRC-14). */
    requiredSize: number;
    requiredBoardMembers: number;
    requiresAccountant: boolean;
    requiresBoardChairman: boolean;

    /** Кворум — две трети голосующих, секретарь не в счёт (PRC-15). */
    quorumRequired: number;
    attended: number;
    hasQuorum: boolean;

    blockers: string[];
}

const BASE = "/procurement";

export const tenderService = {
    /** null — конкурс по заявке не объявлялся (сервер отвечает 204). */
    async get(requestId: number): Promise<Tender | null> {
        const {data, status} = await apiClient.get<Tender>(`${BASE}/requests/${requestId}/tender`);
        return status === 204 ? null : data;
    },

    async create(requestId: number, body: {
        isLimited?: boolean;
        commissionOrderNumber?: string;
        commissionOrderDate?: string;
        previousTenderId?: number;
    }): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/requests/${requestId}/tender`, body);
        return data;
    },

    async addMember(tenderId: number, body: {
        userId: number;
        role: CommissionRole;
        isBoardMember: boolean;
        isAccountant: boolean;
    }): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/tenders/${tenderId}/commission`, body);
        return data;
    },

    async removeMember(memberId: number): Promise<Tender> {
        const {data} = await apiClient.delete<Tender>(`${BASE}/commission/${memberId}`);
        return data;
    },

    async setAttendance(memberId: number, attended: boolean, dissentingOpinion?: string): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(
            `${BASE}/commission/${memberId}/attendance`, {attended, dissentingOpinion});
        return data;
    },

    async publish(tenderId: number, submissionDeadline: string): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/tenders/${tenderId}/publish`, {submissionDeadline});
        return data;
    },

    async addBid(tenderId: number, body: {
        supplierTitle?: string;
        supplierInn?: string;
        supplierId?: number;
        price: number;
        submittedOn?: string;
        specification?: string;
    }): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/tenders/${tenderId}/bids`, body);
        return data;
    },

    async open(tenderId: number): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/tenders/${tenderId}/open`, {});
        return data;
    },

    async declareWinner(tenderId: number, bidId: number): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/tenders/${tenderId}/bids/${bidId}/winner`, {});
        return data;
    },

    async fail(tenderId: number, reason: string, cancel = false): Promise<Tender> {
        const {data} = await apiClient.post<Tender>(`${BASE}/tenders/${tenderId}/fail`, {reason, cancel});
        return data;
    },
};
