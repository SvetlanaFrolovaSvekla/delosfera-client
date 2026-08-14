import {apiClient} from "@/service/apiClient.ts";

export type SzAssignmentState = "Open" | "Reported" | "Done" | "Cancelled";

export const ASSIGNMENT_STATE_LABEL: Record<SzAssignmentState, string> = {
    Open: "В работе",
    Reported: "Отчёт сдан",
    Done: "Исполнено",
    Cancelled: "Снято",
};

export interface SzAssignment {
    id: number;
    szDocumentId: number;
    assigneeUserId: number;
    assigneeName: string | null;
    assigneeUnit: string | null;
    text: string;
    isPrimary: boolean;
    dueDate: string | null;
    state: SzAssignmentState;
    reportText: string | null;
    reportedAt: string | null;
    closedAt: string | null;
    returnReason: string | null;
    isOverdue: boolean;
    daysLeft: number | null;
    szRegNumber: string | null;
    szTitle: string | null;
}

export interface SzAssignmentDraft {
    assigneeUserId: number;
    text: string;
    isPrimary: boolean;
    dueDate?: string | null;
}

const BASE = "/sz";

export const szExecutionService = {
    /** Очередь «Мои поручения». */
    async my(includeClosed = false): Promise<SzAssignment[]> {
        const {data} = await apiClient.get<SzAssignment[]>(`${BASE}/assignments/my`, {params: {includeClosed}});
        return data;
    },

    async list(szId: number): Promise<SzAssignment[]> {
        const {data} = await apiClient.get<SzAssignment[]>(`${BASE}/${szId}/assignments`);
        return data;
    },

    /** Резолюция руководителя: текст + поручения исполнителям. */
    async resolve(szId: number, text: string, assignments: SzAssignmentDraft[]): Promise<SzAssignment[]> {
        const {data} = await apiClient.post<SzAssignment[]>(`${BASE}/${szId}/resolution`, {text, assignments});
        return data;
    },

    async report(assignmentId: number, reportText: string): Promise<SzAssignment> {
        const {data} = await apiClient.post<SzAssignment>(`${BASE}/assignments/${assignmentId}/report`, {reportText});
        return data;
    },

    async accept(assignmentId: number): Promise<SzAssignment> {
        const {data} = await apiClient.post<SzAssignment>(`${BASE}/assignments/${assignmentId}/accept`);
        return data;
    },

    async returnForRework(assignmentId: number, reason: string): Promise<SzAssignment> {
        const {data} = await apiClient.post<SzAssignment>(`${BASE}/assignments/${assignmentId}/return`, {reason});
        return data;
    },

    async cancel(assignmentId: number): Promise<SzAssignment> {
        const {data} = await apiClient.post<SzAssignment>(`${BASE}/assignments/${assignmentId}/cancel`);
        return data;
    },

    /** Продлить срок исполнения записки с обоснованием. */
    async extend(szId: number, dueDate: string, reason: string): Promise<void> {
        await apiClient.post(`${BASE}/${szId}/extend`, {dueDate, reason});
    },

    /** Отметить записку исполненной. */
    async complete(szId: number, summary: string): Promise<void> {
        await apiClient.post(`${BASE}/${szId}/complete`, {summary});
    },
};
