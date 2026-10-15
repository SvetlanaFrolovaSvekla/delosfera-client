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

    /** Можно выдавать и принимать оригинал; смотреть может любой, кто видит записку. */
    canManage: boolean;
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

export interface SzPrintSignature {
    levelTitle: string;
    fullName: string | null;
    position: string | null;
    at: string;
    fingerprint: string | null;
    revoked: boolean;
    revokedReason: string | null;

    /** Подпись ЭЦП ГП «Инфоком» (проверена у провайдера при сохранении резолюции). Поля ниже — только для неё. */
    isEcp: boolean;
    /** Тестовая имитация ЭЦП — не подпись. */
    isTest: boolean;
    organizationName: string | null;
    /** Срок действия сертификата — как его вернул провайдер. */
    certValidNotAfter: string | null;
    issuerName: string | null;
    /** Подписанный хэш резолюции (SHA-256, hex). */
    documentHash: string | null;
    /** SHA-256 самой подписи (hex). */
    signatureSha256: string | null;
    /** false — записку меняли после подписания; null — сверка неприменима. */
    matchesCurrentContent: boolean | null;
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

    /** Вид этапа: Approval или Signing. */
    stepKind: string | null;

    /** Штамп подписи под визой; пусто — визы нет. */
    signature: SzPrintSignature | null;
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

    /** Отпечаток текущего содержимого записки (SHA-256) — с ним сверяется каждая подпись ЭЦП. */
    contentDigest: string | null;
}

/** Версия листа согласования: с подписями ЭЦП или для подписи от руки. */
export type SzPrintMode = "signed" | "paper";

export const szPrintUrl = (szId: number, mode: SzPrintMode) => `/sz/${szId}/print?mode=${mode}`;

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
