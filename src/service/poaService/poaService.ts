import {apiClient} from "@/service/apiClient.ts";

/**
 * Доверенности: кто, кому, на что и на какой срок.
 *
 * Реестр отвечает на два вопроса, ради которых его и ведут: вправе ли человек
 * подписать это сегодня, и что банк выдал и не забрал обратно.
 */

export type PoaStatus = "Draft" | "OnApproval" | "Active" | "Revoked" | "Expired";

export const POA_STATUS_TITLE: Record<PoaStatus, string> = {
    Draft: "Проект",
    OnApproval: "На подписании",
    Active: "Действует",
    Revoked: "Отозвана",
    Expired: "Срок истёк",
};

/** Порядок в фильтре — от того, что требует внимания, к закрытому. */
export const POA_STATUS_ORDER: PoaStatus[] = ["Active", "Draft", "OnApproval", "Expired", "Revoked"];

export type PoaHolderKind = "Employee" | "External";

export const HOLDER_KIND_TITLE: Record<PoaHolderKind, string> = {
    Employee: "Сотрудник банка",
    External: "Стороннее лицо",
};

export interface Poa {
    id: number;
    regNumber: string | null;
    issuedOn: string;
    status: PoaStatus;

    grantorUserId: number;
    grantorName: string | null;

    parentPoaId: number | null;
    parentRegNumber: string | null;

    holderKind: PoaHolderKind;
    holderUserId: number | null;
    holderName: string;
    holderPosition: string | null;
    holderUnitId: number | null;
    holderUnit: string | null;
    holderIdentityDocument: string | null;

    powers: string;
    allowsDelegation: boolean;
    amountLimit: number | null;
    amountCurrency: string | null;

    validFrom: string;
    validTo: string;

    signedAt: string | null;
    revokedOn: string | null;
    revokeReason: string | null;
    revokedBy: string | null;

    originalLocation: string | null;
    originalHandedAt: string | null;
    originalReturnedAt: string | null;

    fileCount: number;
    childCount: number;
}

export interface PoaSaveRequest {
    issuedOn: string;
    grantorUserId: number;
    parentPoaId?: number | null;
    holderKind: PoaHolderKind;
    holderUserId?: number | null;
    holderName: string;
    holderPosition?: string | null;
    holderUnitId?: number | null;
    holderIdentityDocument?: string | null;
    powers: string;
    allowsDelegation: boolean;
    amountLimit?: number | null;
    amountCurrency?: string | null;
    validFrom: string;
    validTo: string;
    originalLocation?: string | null;
}

export interface PoaFilter {
    statuses?: PoaStatus[];
    holderUserId?: number;
    grantorUserId?: number;
    unitId?: number;
    /** Действующие на указанный день — «кто был вправе подписать тогда». */
    validOn?: string;
    text?: string;
    page?: number;
    pageSize?: number;
}

const BASE = "/poa";

export const poaService = {
    async search(filter: PoaFilter = {}) {
        const {data} = await apiClient.post<{
            total: number; page: number; pageSize: number; items: Poa[];
        }>(`${BASE}/search`, filter);
        return data;
    },

    async get(id: number) {
        const {data} = await apiClient.get<Poa>(`${BASE}/${id}`);
        return data;
    },

    /** Чем человек вправе распоряжаться на указанный день. */
    async validFor(userId: number, on?: string) {
        const {data} = await apiClient.get<Poa[]>(`${BASE}/valid`, {params: {userId, on}});
        return data;
    },

    async mine() {
        const {data} = await apiClient.get<Poa[]>(`${BASE}/mine`);
        return data;
    },

    async expiring(days = 30) {
        const {data} = await apiClient.get<Poa[]>(`${BASE}/expiring`, {params: {days}});
        return data;
    },

    async create(request: PoaSaveRequest) {
        const {data} = await apiClient.post<Poa>(BASE, request);
        return data;
    },

    async update(id: number, request: PoaSaveRequest) {
        const {data} = await apiClient.put<Poa>(`${BASE}/${id}`, request);
        return data;
    },

    /** Выдать: присвоить номер по книге и перевести в действующие. */
    async issue(id: number) {
        const {data} = await apiClient.post<Poa>(`${BASE}/${id}/issue`);
        return data;
    },

    /** Отозвать. Передоверия по этой доверенности отзываются вместе с ней. */
    async revoke(id: number, reason: string, on?: string) {
        const {data} = await apiClient.post<Poa>(`${BASE}/${id}/revoke`, {reason, on});
        return data;
    },
};
