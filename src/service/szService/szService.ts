import {apiClient} from "@/service/apiClient.ts";
import type {SzAssignmentDraft} from "@/service/szService/szExecutionService.ts";

export type SzStatusCode =
    | "Draft" | "PendingRegistration" | "Registered" | "OnRevision"
    | "OnAddresseeDecision"
    | "OnExecution" | "Executed" | "Rejected" | "Withdrawn" | "Archived";

/** Согласующий в карточке записки. */
export interface SzApprover {
    userId: number;
    fullName: string;
    position: string | null;
    /** Порядок прохождения при последовательном согласовании. */
    order: number;
}

export type SzFormKey = "Other" | "Hr" | "Procurement" | "Training";

export interface SzKind {
    id: number;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    formKey: SzFormKey;
    isPaperByDefault: boolean;
    executionDays: number;
}

export interface SzHrKind {
    id: number;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
}

export interface SzListItem {
    id: number;
    documentId: number;
    regNumber: string | null;
    title: string;
    statusCode: SzStatusCode;
    kindId: number;
    kind: string;
    author: string | null;
    correspondentUnit: string | null;
    registeredOn: string | null;
    dueDate: string | null;
    daysLeft: number | null;
    isOverdue: boolean;
    isPaperCarrier: boolean;
}

export interface SzDetails extends SzListItem {
    formKey: SzFormKey;
    body: string | null;
    authorId: number;
    authorUnitId: number | null;
    authorUnit: string | null;
    correspondentUnitId: number | null;

    /** «Кому» — пользователь, который выносит решение по записке. */
    addresseeUserId: number | null;
    addresseeUser: string | null;

    approvers: SzApprover[];
    approvalIsParallel: boolean;

    /** Решение адресата. Заполняет только он сам. */
    addresseeDecision: string | null;
    addresseeDecisionAt: string | null;

    signerUserId: number | null;
    signerUser: string | null;

    /** Отметка «вынести на коллегиальный орган»: заявка секретарю, а не распоряжение. */
    submitToBody: string | null;
    submitToBodyQuestion: string | null;
    submitToBodyRequestedAt: string | null;

    /** Записка уже включена в повестку — менять отметку поздно. */
    inAgenda: boolean;
    registeredByUserId: number | null;
    rubricIds: number[];
    rubrics: string[];

    hrKindId: number | null;
    hrKind: string | null;
    employeeName: string | null;
    employeeUnitId: number | null;
    employeeUnit: string | null;
    transferUnitId: number | null;
    transferUnit: string | null;

    hasBudget: boolean | null;
    amount: number | null;
    travelExpenses: boolean | null;

    /** Сотрудники, которых касается кадровая записка. */
    employees: SzEmployee[];

    extraFields: Record<string, unknown> | null;
    currentRouteInstanceId: number | null;
    /** Обоснование последнего отзыва — участники должны видеть, почему процесс прерван. */
    withdrawReason: string | null;
    /** Сколько раз записка уходила на согласование. */
    approvalRounds: number;

    /** Резолюция руководителя, по которой выданы поручения. */
    executionResolution: string | null;
    executionResolutionAt: string | null;

    /** Обоснование последнего продления срока и число продлений. */
    dueDateExtensionReason: string | null;
    dueDateExtensions: number;

    /** Итог исполнения. */
    executionSummary: string | null;
    executedAt: string | null;
}

export interface SzSaveRequest {
    title: string;
    kindId: number;
    body?: string | null;
    correspondentUnitId?: number | null;
    addresseeUserId?: number | null;
    approverUserIds?: number[];
    approvalIsParallel?: boolean;
    signerUserId?: number | null;
    isPaperCarrier?: boolean | null;
    rubricIds?: number[];

    hrKindId?: number | null;
    employeeName?: string | null;
    employeeUnitId?: number | null;
    transferUnitId?: number | null;

    hasBudget?: boolean | null;
    amount?: number | null;
    travelExpenses?: boolean | null;
    employees?: SzEmployee[];

    extraFields?: Record<string, unknown> | null;
}

export interface SzSearchRequest {
    query?: string;
    statuses?: SzStatusCode[];
    kindIds?: number[];
    authorId?: number;
    correspondentUnitId?: number;
    rubricId?: number;
    mineOnly?: boolean;
    registeredFrom?: string;
    registeredTo?: string;
    overdueOnly?: boolean;
    page?: number;
    pageSize?: number;
}

export interface SzPage {
    items: SzListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface SzCounters {
    all: number;
    drafts: number;
    pendingRegistration: number;
    archived: number;
    byStatus: Record<string, number>;
}

export interface SzHistoryEntry {
    id: number;
    at: string;
    action: string;
    userId: number | null;
    payload: string | null;
}

const BASE = "/sz";

export const szService = {
    async search(request: SzSearchRequest): Promise<SzPage> {
        const {data} = await apiClient.post<SzPage>(`${BASE}/search`, request);
        return data;
    },

    async counters(): Promise<SzCounters> {
        const {data} = await apiClient.get<SzCounters>(`${BASE}/counters`);
        return data;
    },

    async get(id: number): Promise<SzDetails> {
        const {data} = await apiClient.get<SzDetails>(`${BASE}/${id}`);
        return data;
    },

    async history(id: number): Promise<SzHistoryEntry[]> {
        const {data} = await apiClient.get<SzHistoryEntry[]>(`${BASE}/${id}/history`);
        return data;
    },

    async create(body: SzSaveRequest): Promise<SzDetails> {
        const {data} = await apiClient.post<SzDetails>(BASE, body);
        return data;
    },

    async update(id: number, body: SzSaveRequest): Promise<SzDetails> {
        const {data} = await apiClient.put<SzDetails>(`${BASE}/${id}`, body);
        return data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },

    /** Отправить записку на регистрацию делопроизводством. */
    async submit(id: number): Promise<SzDetails> {
        const {data} = await apiClient.post<SzDetails>(`${BASE}/${id}/submit`);
        return data;
    },

    /** Зарегистрировать: номер, дата, срок исполнения. */
    async register(id: number): Promise<SzDetails> {
        const {data} = await apiClient.post<SzDetails>(`${BASE}/${id}/register`);
        return data;
    },

    /** «СЗ, согласую я»: записки, ждущие резолюции текущего пользователя. */
    async inbox(page = 1, pageSize = 100): Promise<SzPage> {
        const {data} = await apiClient.get<SzPage>(`${BASE}/inbox`, {params: {page, pageSize}});
        return data;
    },

    /** Отозвать записку с согласования — вернётся автору в черновик. */
    async withdraw(id: number, reason: string): Promise<SzDetails> {
        const {data} = await apiClient.post<SzDetails>(`${BASE}/${id}/withdraw`, {reason});
        return data;
    },

    async kinds(): Promise<SzKind[]> {
        const {data} = await apiClient.get<SzKind[]>(`${BASE}/kinds`);
        return data;
    },

    async hrKinds(): Promise<SzHrKind[]> {
        const {data} = await apiClient.get<SzHrKind[]>(`${BASE}/hr-kinds`);
        return data;
    },
};

export const szApprovalService = {
    /** Состав и порядок согласующих — меняется до отправки записки. */
    setApprovers: (id: number, userIds: number[], parallel: boolean) =>
        apiClient.put<SzDetails>(`/sz/${id}/approvers`, {userIds, parallel}).then((r) => r.data),

    /**
     * Решение адресата по существу вопроса. Тем же действием выдаются поручения:
     * решение и есть резолюция, по которой работа расходится исполнителям.
     */
    decide: (id: number, decision: string, assignments: SzAssignmentDraft[] = []) =>
        apiClient
            .post<SzDetails>(`/sz/${id}/addressee-decision`, {decision, assignments})
            .then((r) => r.data),
};

export const SZ_STATUS_LABEL: Record<SzStatusCode, string> = {
    Draft: "Черновик",
    PendingRegistration: "В ожидании регистрации",
    Registered: "Зарегистрирована",
    OnRevision: "На доработке",
    OnAddresseeDecision: "На решении адресата",
    OnExecution: "На исполнении",
    Executed: "Исполнена",
    Rejected: "Забракована",
    Withdrawn: "Отозвана",
    Archived: "В архиве",
};


/**
 * Сотрудник в кадровой записке. userId пуст у кандидата: в записке о приёме
 * человека в системе ещё нет, а записка уже нужна.
 */
export interface SzEmployee {
    id?: number;
    userId?: number | null;
    fullName: string;
    orgUnitId?: number | null;
    orgUnit?: string | null;
    position?: string | null;

    /** Значения полей, своих для этого человека: оклад, даты. */
    values?: Record<string, unknown>;
}

export type HrFieldType =
    "text" | "number" | "money" | "date" | "checkbox" | "select" | "orgUnit";

export interface HrFieldSchema {
    code: string;
    label: string;
    type: HrFieldType;
    required: boolean;

    /** Поле заполняется по каждому сотруднику: оклад свой у каждого, город — общий. */
    perEmployee: boolean;

    options?: string[] | null;
    hint?: string | null;
}

export interface HrFormSchema {
    allowMultipleEmployees: boolean;

    /** Сотрудника нет в системе — записка о приёме: ФИО вводится строкой. */
    employeeMayBeExternal: boolean;

    fields: HrFieldSchema[];
}

/** Схема полей по видам кадровых записок — ключ совпадает с названием вида. */
export async function hrForms(): Promise<Record<string, HrFormSchema>> {
    const {data} = await apiClient.get<Record<string, HrFormSchema>>("/sz/hr-forms");
    return data;
}
