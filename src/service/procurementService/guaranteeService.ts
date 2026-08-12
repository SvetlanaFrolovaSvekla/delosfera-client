import {apiClient} from "@/service/apiClient.ts";

/** Вид обеспечения: ГОКЗ по конкурсной заявке, ГОИД по договору (PRC-20). */
export type GuaranteeKind = "BidSecurity" | "PerformanceSecurity";
export type GuaranteeForm = "Cash" | "BankGuarantee";

export interface Guarantee {
    id: number;
    kind: GuaranteeKind;
    kindTitle: string;
    form: GuaranteeForm;
    formTitle: string;

    tenderId: number | null;
    tenderRegNumber: string | null;
    contractId: number | null;
    contractRegNumber: string | null;

    supplierId: number;
    supplierTitle: string;

    amount: number;
    receivedOn: string;
    validUntil: string;
    documentRef: string | null;

    returnedOn: string | null;
    returnedBy: string | null;
    isForfeited: boolean;
    note: string | null;

    /** Срок истёк, а обеспечение не возвращено и не удержано. */
    isReturnOverdue: boolean;
    daysLeft: number;
}

/** Стадия претензии (PRC-21). */
export type ClaimStatus = "Draft" | "Sent" | "Answered" | "Satisfied" | "Litigation" | "Withdrawn";

export interface Claim {
    id: number;
    contractId: number;
    contractRegNumber: string | null;
    supplierTitle: string | null;

    regNumber: string | null;
    status: ClaimStatus;
    statusTitle: string;

    violation: string;
    demand: string | null;
    amount: number | null;

    sentOn: string | null;
    responseDeadline: string | null;
    answeredOn: string | null;
    response: string | null;
    outcome: string | null;

    /** Срок ответа истёк, а контрагент не ответил. */
    isResponseOverdue: boolean;
}

/** Пакет публикации объявления о конкурсе (INT-05). */
export interface PublicationPackage {
    tenderId: number;
    tenderRegNumber: string | null;
    subject: string;
    methodTitle: string;
    amount: number;
    initiatorUnit: string | null;
    publishedOn: string | null;
    submissionDeadline: string | null;
    isLimited: boolean;
    channels: string[];
    announcement: string;
    blockers: string[];
}

const BASE = "/api/procurement";

export const guaranteeService = {
    async list(params: {tenderId?: number; contractId?: number; activeOnly?: boolean}): Promise<Guarantee[]> {
        const {data} = await apiClient.get<Guarantee[]>(`${BASE}/guarantees`, {params});
        return data;
    },

    async create(body: {
        kind: GuaranteeKind;
        form?: GuaranteeForm;
        tenderId?: number;
        contractId?: number;
        supplierTitle?: string;
        supplierInn?: string;
        supplierId?: number;
        amount: number;
        validUntil: string;
        documentRef?: string;
    }): Promise<Guarantee> {
        const {data} = await apiClient.post<Guarantee>(`${BASE}/guarantees`, body);
        return data;
    },

    async settle(id: number, forfeit: boolean, note?: string): Promise<Guarantee> {
        const {data} = await apiClient.post<Guarantee>(`${BASE}/guarantees/${id}/return`, {forfeit, note});
        return data;
    },
};

export const claimService = {
    async list(params: {contractId?: number; openOnly?: boolean}): Promise<Claim[]> {
        const {data} = await apiClient.get<Claim[]>(`${BASE}/claims`, {params});
        return data;
    },

    async create(contractId: number, body: {violation: string; demand?: string; amount?: number}): Promise<Claim> {
        const {data} = await apiClient.post<Claim>(`${BASE}/contracts/${contractId}/claims`, body);
        return data;
    },

    async send(id: number, sentOn?: string): Promise<Claim> {
        const {data} = await apiClient.post<Claim>(`${BASE}/claims/${id}/send`, {sentOn});
        return data;
    },

    async answer(id: number, response: string): Promise<Claim> {
        const {data} = await apiClient.post<Claim>(`${BASE}/claims/${id}/answer`, {response});
        return data;
    },

    async close(id: number, status: ClaimStatus, outcome: string): Promise<Claim> {
        const {data} = await apiClient.post<Claim>(`${BASE}/claims/${id}/close`, {status, outcome});
        return data;
    },
};

export const publicationService = {
    async get(tenderId: number): Promise<PublicationPackage> {
        const {data} = await apiClient.get<PublicationPackage>(`${BASE}/tenders/${tenderId}/publication`);
        return data;
    },
};
