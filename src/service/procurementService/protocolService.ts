import {apiClient} from "@/service/apiClient.ts";

/**
 * Стадия протокола закупки. Сервер сериализует перечисления строками:
 * сравнение с числами молча не срабатывало и подписи выглядели непоставленными.
 */
export type ProtocolStatus = "Draft" | "Signing" | "Approved";

/** Кто подписывает протокол (подвал печатной формы). */
export type ProtocolSignerRole = "Initiator" | "OrganizerCurator" | "Approver";

export const SIGNER_ROLE_LABEL: Record<ProtocolSignerRole, string> = {
    Initiator: "Инициатор",
    OrganizerCurator: "Куратор организатора закупки",
    Approver: "Заместитель Председателя Правления",
};

export interface ProtocolRow {
    order: number;
    supplierTitle: string;
    supplierInn: string | null;
    price: number;
    specification: string | null;
    deliveryTerms: string | null;
    paymentTerms: string | null;
    initiatorConclusion: string;
    isWinner: boolean;
}

export interface ProtocolSignature {
    role: ProtocolSignerRole;
    roleTitle: string;
    userName: string;
    position: string | null;
    levelTitle: string;
    at: string;
    revoked: boolean;
    revokedReason: string | null;
}

export interface Protocol {
    id: number;
    requestId: number;
    regNumber: string | null;
    protocolDate: string;

    status: ProtocolStatus;
    statusTitle: string;

    methodTitle: string;
    subject: string;
    initiatorUnitTitle: string | null;

    mainSupplierTitle: string | null;
    mainAmount: number | null;
    reserveSupplierTitle: string | null;
    reserveAmount: number | null;

    budgetNote: string | null;
    expertOpinion: string | null;
    dissentingOpinion: string | null;
    recommendations: string | null;
    selectionBasis: string | null;

    /** Победитель не с наименьшей ценой — нужно основание выбора. */
    requiresSelectionBasis: boolean;

    rows: ProtocolRow[];
    signatures: ProtocolSignature[];
    blockers: string[];

    /** Предложения изменились после формирования — протокол пора пересобрать. */
    isOutdated: boolean;
}

export interface ProtocolUpdateRequest {
    budgetNote?: string;
    expertOpinion?: string;
    dissentingOpinion?: string;
    recommendations?: string;
    selectionBasis?: string;
}

const BASE = "/api/procurement";

export const protocolService = {
    /** null — протокол ещё не сформирован (сервер отвечает 204). */
    async get(requestId: number): Promise<Protocol | null> {
        const {data, status} = await apiClient.get<Protocol>(`${BASE}/requests/${requestId}/protocol`);
        return status === 204 ? null : data;
    },

    async generate(requestId: number): Promise<Protocol> {
        const {data} = await apiClient.post<Protocol>(`${BASE}/requests/${requestId}/protocol`, {});
        return data;
    },

    async update(requestId: number, request: ProtocolUpdateRequest): Promise<Protocol> {
        const {data} = await apiClient.put<Protocol>(`${BASE}/requests/${requestId}/protocol`, request);
        return data;
    },

    /** level: 0 — ПЭП (виза), 1 — КЭП. */
    async sign(requestId: number, role: ProtocolSignerRole, level = 1): Promise<Protocol> {
        const {data} = await apiClient.post<Protocol>(`${BASE}/requests/${requestId}/protocol/sign`, {role, level});
        return data;
    },
};
