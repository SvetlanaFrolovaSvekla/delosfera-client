import {apiClient} from "@/service/apiClient.ts";

/** Статусы заявки на закупку. */
export type ProcurementStatusCode =
    | "Draft"
    | "OnApproval"
    | "Approved"
    | "InProcurement"
    | "Completed"
    | "OnRevision"
    | "Rejected"
    | "Cancelled";

export const PROCUREMENT_STATUS_LABEL: Record<ProcurementStatusCode, string> = {
    Draft: "Черновик",
    OnApproval: "На согласовании",
    Approved: "Согласована",
    InProcurement: "В закупке",
    Completed: "Завершена",
    OnRevision: "На доработке",
    Rejected: "Отклонена",
    Cancelled: "Отозвана",
};

/**
 * Тип предмета закупки — от него зависит ветвление маршрута (PRC-08).
 * Сервер сериализует перечисления строками.
 */
export type SubjectKind =
    | "Goods"
    | "HouseholdGoods"
    | "SpecificGoods"
    | "GoodsWithInstallation"
    | "Works"
    | "Services";

export const SUBJECT_KIND_LABEL: Record<SubjectKind, string> = {
    Goods: "Товары",
    HouseholdGoods: "Хозяйственные товары",
    SpecificGoods: "Специфичный товар",
    GoodsWithInstallation: "Товар с установкой",
    Works: "Работы",
    Services: "Услуги",
};

export interface ProcurementListItem {
    id: number;
    documentId: number;
    regNumber: string | null;
    subject: string;
    statusCode: ProcurementStatusCode;
    methodShortTitle: string;
    amount: number;
    isAffiliated: boolean;
    hasBudget: boolean;
    initiatorName: string | null;
    initiatorUnit: string | null;
    createdAt: string;
    /** Заявка пришла из служебной записки. */
    sourceSzRegNumber: string | null;
}

export interface ProcurementCounters {
    all: number;
    drafts: number;
    onApproval: number;
    inProcurement: number;
    completed: number;
    byStatus: Record<string, number>;
}

export interface ProcurementCard {
    id: number;
    documentId: number;
    regNumber: string | null;
    subject: string;
    statusCode: ProcurementStatusCode;
    justification: string | null;

    subjectKind: SubjectKind;
    subjectKindTitle: string;

    amount: number;
    isAffiliated: boolean;
    hasBudget: boolean;
    planItem: string | null;
    hasSpecification: boolean;

    initiatorName: string | null;
    initiatorUnit: string | null;
    curatorName: string | null;

    methodTitle: string;
    methodShortTitle: string;
    methodJustification: string | null;
    approvalChain: string | null;
    approvalAuthorityTitle: string;
    protocolRequired: boolean;
    minProposals: number;

    sourceSzRegNumber: string | null;
    sourceSzId: number | null;

    /** Запущенный маршрут согласования (PRC-08); null — заявка ещё черновик. */
    routeInstanceId: number | null;

    /** Действующий конкурс — к нему относится ГОКЗ. */
    tenderId: number | null;
    /** Действующий договор — к нему относятся ГОИД и претензии. */
    contractId: number | null;

    createdAt: string;
    updatedAt: string;

    /** Чего не хватает, чтобы двигать заявку дальше. */
    blockers: string[];
}

export interface ProcurementSearchRequest {
    query?: string;
    statuses?: ProcurementStatusCode[];
    methodId?: number;
    mineOnly?: boolean;
    amountFrom?: number;
    amountTo?: number;
    page?: number;
    pageSize?: number;
}

export interface ProcurementCreateRequest {
    subject: string;
    justification?: string;
    subjectKind: SubjectKind;
    amount: number;
    isAffiliated: boolean;
    hasBudget: boolean;
    planItem?: string;
    hasSpecification: boolean;
    initiatorUnitId?: number;
    curatorUserId?: number;
    preferredMethod?: string;
    methodJustification?: string;
}

export interface Paged<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

const BASE = "/procurement";

export const procurementService = {
    async search(request: ProcurementSearchRequest): Promise<Paged<ProcurementListItem>> {
        const {data} = await apiClient.post<Paged<ProcurementListItem>>(`${BASE}/requests/search`, request);
        return data;
    },

    async counters(): Promise<ProcurementCounters> {
        const {data} = await apiClient.get<ProcurementCounters>(`${BASE}/requests/counters`);
        return data;
    },

    async get(id: number): Promise<ProcurementCard> {
        const {data} = await apiClient.get<ProcurementCard>(`${BASE}/requests/${id}`);
        return data;
    },

    async create(request: ProcurementCreateRequest): Promise<ProcurementCard> {
        const {data} = await apiClient.post<ProcurementCard>(`${BASE}/requests`, request);
        return data;
    },

    async submit(id: number): Promise<ProcurementCard> {
        const {data} = await apiClient.post<ProcurementCard>(`${BASE}/requests/${id}/submit`, {});
        return data;
    },
};
