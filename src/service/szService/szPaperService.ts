import {apiClient} from "@/service/apiClient.ts";

/** Состояние бумажного оригинала записки. */
export interface SzOriginal {
    szId: number;
    regNumber: string | null;
    title: string | null;
    isPaperCarrier: boolean;

    holderUserId: number | null;
    holderName: string | null;
    handedAt: string | null;
    dueBackOn: string | null;
    location: string | null;
    returnedAt: string | null;
    handoverCount: number;

    /** Оригинал на руках: выдан и ещё не возвращён. */
    isOut: boolean;
    isOverdue: boolean;
    daysLeft: number | null;
}

export interface SzHandoverRequest {
    holderUserId: number;
    dueBackOn?: string | null;
    location?: string | null;
}

export interface SzPrintField {
    label: string;
    value: string;
}

export interface SzPrintApproval {
    stepOrder: number;
    userName: string | null;
    position: string | null;
    unit: string | null;
    /** Пусто — виза не поставлена, в бумажной форме остаётся место для подписи. */
    resolution: string | null;
    comment: string | null;
    resolvedAt: string | null;
}

export interface SzPrintAssignment {
    assigneeName: string | null;
    text: string;
    dueDate: string | null;
    isPrimary: boolean;
}

/** Печатная форма записки с листом согласования. */
export interface SzPrintForm {
    regNumber: string | null;
    registeredOn: string | null;
    title: string;
    body: string | null;
    kind: string | null;
    hrKind: string | null;
    authorName: string | null;
    authorUnit: string | null;
    correspondentUnit: string | null;
    dueDate: string | null;
    isPaperCarrier: boolean;
    fields: SzPrintField[];
    approvals: SzPrintApproval[];
    executionResolution: string | null;
    assignments: SzPrintAssignment[];

    /** Решение адресата по существу вопроса — печатается, если вынесено. */
    addresseeName: string | null;
    addresseeDecision: string | null;
    addresseeDecisionAt: string | null;
}

export const PRINT_RESOLUTION_LABEL: Record<string, string> = {
    Approved: "Согласовано",
    ApprovedWithRemarks: "Согласовано с замечаниями",
    Rejected: "Отклонено",
    Veto: "Вето",
    AutoAccept: "Автоакцепт",
};

const BASE = "/sz";

export const szPaperService = {
    async original(szId: number): Promise<SzOriginal> {
        const {data} = await apiClient.get<SzOriginal>(`${BASE}/${szId}/original`);
        return data;
    },

    /** Выдать оригинал под контроль возврата. */
    async handOver(szId: number, req: SzHandoverRequest): Promise<SzOriginal> {
        const {data} = await apiClient.post<SzOriginal>(`${BASE}/${szId}/original/handover`, req);
        return data;
    },

    async returnOriginal(szId: number): Promise<SzOriginal> {
        const {data} = await apiClient.post<SzOriginal>(`${BASE}/${szId}/original/return`);
        return data;
    },

    /** Реестр невозвращённых оригиналов — по нему делопроизводство собирает бумагу. */
    async outstanding(overdueOnly = false): Promise<SzOriginal[]> {
        const {data} = await apiClient.get<SzOriginal[]>(`${BASE}/originals/outstanding`, {
            params: {overdueOnly},
        });
        return data;
    },

    async printForm(szId: number): Promise<SzPrintForm> {
        const {data} = await apiClient.get<SzPrintForm>(`${BASE}/${szId}/print`);
        return data;
    },
};
