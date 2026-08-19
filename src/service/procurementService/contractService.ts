import {apiClient} from "@/service/apiClient.ts";

/** Стадия договора закупки (PRC-18/19). */
export type ContractStatus = "Draft" | "Active" | "Completed" | "Terminated";

export interface DeliveryAct {
    id: number;
    number: string;
    actDate: string;
    amount: number;
    subject: string | null;

    approvedByUnitHead: string | null;
    unitHeadApprovedAt: string | null;

    approvedByCurator: string | null;
    curatorApprovedAt: string | null;

    /** Сумма выше порога — нужна виза курирующего члена Правления. */
    requiresCuratorApproval: boolean;
    isApproved: boolean;
}

export interface Contract {
    id: number;
    documentId: number;
    regNumber: string | null;

    requestId: number;
    requestRegNumber: string | null;
    subject: string;

    protocolId: number | null;
    protocolRegNumber: string | null;
    tenderId: number | null;
    tenderRegNumber: string | null;

    supplierTitle: string;
    supplierInn: string | null;

    status: ContractStatus;
    statusTitle: string;

    amount: number;
    signedOn: string | null;
    deliveryDeadline: string | null;
    paymentDeadline: string | null;

    responsibleName: string | null;
    /** Кто готовит договор по правилу PRC-18. */
    responsibleRule: string;

    terminationReason: string | null;

    acts: DeliveryAct[];
    acceptedAmount: number;
    isDeliveryOverdue: boolean;

    blockers: string[];
}

const BASE = "/procurement";

export const contractService = {
    async list(requestId?: number): Promise<Contract[]> {
        const {data} = await apiClient.get<Contract[]>(`${BASE}/contracts`, {
            params: requestId ? {requestId} : undefined,
        });
        return data;
    },

    async get(id: number): Promise<Contract> {
        const {data} = await apiClient.get<Contract>(`${BASE}/contracts/${id}`);
        return data;
    },

    async create(requestId: number, body: {
        supplierId?: number;
        amount?: number;
        signedOn?: string;
        deliveryDeadline?: string;
        paymentDeadline?: string;
    }): Promise<Contract> {
        const {data} = await apiClient.post<Contract>(`${BASE}/requests/${requestId}/contract`, body);
        return data;
    },

    async update(id: number, body: {
        signedOn?: string;
        deliveryDeadline?: string;
        paymentDeadline?: string;
    }): Promise<Contract> {
        const {data} = await apiClient.put<Contract>(`${BASE}/contracts/${id}`, body);
        return data;
    },

    async addAct(id: number, body: {
        number: string;
        amount: number;
        actDate?: string;
        subject?: string;
    }): Promise<Contract> {
        const {data} = await apiClient.post<Contract>(`${BASE}/contracts/${id}/acts`, body);
        return data;
    },

    async approveAct(actId: number, asCurator = false): Promise<Contract> {
        const {data} = await apiClient.post<Contract>(
            `${BASE}/acts/${actId}/approve`, {}, {params: {asCurator}});
        return data;
    },

    async terminate(id: number, reason: string): Promise<Contract> {
        const {data} = await apiClient.post<Contract>(`${BASE}/contracts/${id}/terminate`, {reason});
        return data;
    },
};
