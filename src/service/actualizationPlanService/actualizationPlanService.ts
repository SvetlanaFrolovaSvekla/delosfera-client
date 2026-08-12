import {apiClient} from "@/service/apiClient.ts";

/** Стадия годового плана актуализации (PLN-01). */
export type PlanStatus = "Draft" | "Approved" | "Closed";

/** Состояние позиции плана (PLN-02, PLN-06). */
export type PlanItemStatus = "Planned" | "OnActualization" | "Actual" | "Excluded";

/** Цвет позиции в дашборде методологии (PLN-03). */
export type PlanItemUrgency = "Green" | "Yellow" | "Red" | "Done";

export interface PlanItem {
    id: number;
    planId: number;
    order: number;

    title: string;
    vndDocumentId: number | null;
    vndCode: string | null;

    responsibleUnitId: number | null;
    responsibleUnitTitle: string | null;
    curatorUserId: number | null;
    curatorName: string | null;
    approvalBodyId: number | null;
    approvalBodyTitle: string | null;

    dueDate: string;
    nextDueDate: string | null;
    startedOn: string | null;
    completedOn: string | null;

    status: PlanItemStatus;
    statusTitle: string;
    urgency: PlanItemUrgency;
    /** Дней до срока; отрицательное — просрочка. */
    daysLeft: number;

    comment: string | null;
    /** Позиция не сопоставлена с базой ВНД — актуализацию по ней не запустить. */
    isUnmatched: boolean;
}

export interface Plan {
    id: number;
    year: number;
    status: PlanStatus;
    statusTitle: string;
    approvalNote: string | null;
    approvedOn: string | null;

    items: PlanItem[];

    total: number;
    green: number;
    yellow: number;
    red: number;
    done: number;
    unmatched: number;
}

export interface PlanItemEvent {
    id: number;
    kind: string;
    description: string;
    userName: string | null;
    at: string;
}

export interface PlanImportResult {
    planId: number;
    year: number;
    rowsRead: number;
    created: number;
    updated: number;
    matched: number;
    skipped: string[];
    unmatched: string[];
}

export interface ActualizationSettings {
    greenThresholdDays: number;
    redThresholdDays: number;
    criticalReminderDays: number;
    monthlyDigestEnabled: boolean;
}

const BASE = "/api/actualization/plan";

export const actualizationPlanService = {
    async years(): Promise<number[]> {
        const {data} = await apiClient.get<number[]>(`${BASE}/years`);
        return data;
    },

    /** null — план на год не заведён (сервер отвечает 204). */
    async get(year: number): Promise<Plan | null> {
        const {data, status} = await apiClient.get<Plan>(`${BASE}/${year}`);
        return status === 204 ? null : data;
    },

    async create(year: number): Promise<Plan> {
        const {data} = await apiClient.post<Plan>(BASE, {year});
        return data;
    },

    async approve(planId: number, approvalNote: string): Promise<Plan> {
        const {data} = await apiClient.post<Plan>(`${BASE}/${planId}/approve`, {approvalNote});
        return data;
    },

    async addItem(planId: number, body: Record<string, unknown>): Promise<PlanItem> {
        const {data} = await apiClient.post<PlanItem>(`${BASE}/${planId}/items`, body);
        return data;
    },

    async updateItem(itemId: number, body: Record<string, unknown>): Promise<PlanItem> {
        const {data} = await apiClient.put<PlanItem>(`${BASE}/items/${itemId}`, body);
        return data;
    },

    async reschedule(itemId: number, dueDate: string, reason: string): Promise<PlanItem> {
        const {data} = await apiClient.post<PlanItem>(`${BASE}/items/${itemId}/reschedule`, {dueDate, reason});
        return data;
    },

    async exclude(itemId: number, reason: string): Promise<PlanItem> {
        const {data} = await apiClient.post<PlanItem>(`${BASE}/items/${itemId}/exclude`, {reason});
        return data;
    },

    async history(itemId: number): Promise<PlanItemEvent[]> {
        const {data} = await apiClient.get<PlanItemEvent[]>(`${BASE}/items/${itemId}/history`);
        return data;
    },

    /** Кнопка «Создать ТИД»: запускает цикл актуализации по привязанной ВНД (PLN-05). */
    async startActualization(itemId: number, requiresApproval: boolean): Promise<PlanItem> {
        const {data} = await apiClient.post<PlanItem>(`${BASE}/items/${itemId}/start-actualization`, {
            requiresApproval,
            shiftNextPeriod: true,
        });
        return data;
    },

    async import(year: number, file: File): Promise<PlanImportResult> {
        const form = new FormData();
        form.append("file", file);

        const {data} = await apiClient.post<PlanImportResult>(`${BASE}/${year}/import`, form, {
            headers: {"Content-Type": "multipart/form-data"},
        });
        return data;
    },

    async settings(): Promise<ActualizationSettings> {
        const {data} = await apiClient.get<ActualizationSettings>(`${BASE}/settings`);
        return data;
    },

    async saveSettings(settings: ActualizationSettings): Promise<ActualizationSettings> {
        const {data} = await apiClient.put<ActualizationSettings>(`${BASE}/settings`, settings);
        return data;
    },

    templateUrl(): string {
        return `${BASE}/template`;
    },

    reportUrl(year: number): string {
        return `${BASE}/${year}/discipline-report`;
    },
};
