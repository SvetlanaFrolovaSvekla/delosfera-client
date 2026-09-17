import {apiClient} from "@/service/apiClient.ts";

/** Заявки на замещение (КСЗ-В9). */

export type SubstitutionReason = "Sick" | "Vacation" | "Dismissal" | "Other";
export const REASON_LABEL: Record<SubstitutionReason, string> = {
    Sick: "Больничный", Vacation: "Отпуск", Dismissal: "Увольнение", Other: "Другое",
};

export type HandoverMoment = "EndOfDay" | "StartOfDay";
export const HANDOVER_LABEL: Record<HandoverMoment, string> = {
    EndOfDay: "На конец рабочего дня", StartOfDay: "На начало рабочего дня",
};

export type SubstitutionStatus =
    "Draft" | "OnApproval" | "OnExecution" | "Executed" | "Rejected" | "Withdrawn";
export const STATUS_LABEL: Record<SubstitutionStatus, string> = {
    Draft: "Черновик", OnApproval: "На согласовании", OnExecution: "На исполнении",
    Executed: "Исполнено", Rejected: "Отклонено", Withdrawn: "Отозвано",
};

export interface CommissionMember {
    userId?: number | null;
    fullName: string;
    position?: string | null;
}

export type ApprovalState = "Pending" | "Active" | "Approved" | "Rejected";
export const APPROVAL_STATE_LABEL: Record<ApprovalState, string> = {
    Pending: "Ожидает", Active: "На согласовании", Approved: "Согласовано", Rejected: "Отклонено",
};

export interface ApprovalStep {
    order: number;
    roleLabel: string;
    userId: number;
    userName: string | null;
    state: ApprovalState;
    comment: string | null;
    decidedAt: string | null;
}

export interface SubstitutionListItem {
    id: number;
    regNumber: string | null;
    status: SubstitutionStatus;
    statusTitle: string;
    subject: string;
    reasonTitle: string;
    absentName: string;
    substituteName: string;
    startsOn: string | null;
    endsOn: string | null;
    initiatorName: string | null;
    createdAt: string;
}

export interface SubstitutionDetails extends SubstitutionListItem {
    reasonCode: SubstitutionReason;
    initiatorUserId: number;
    absentUserId: number | null;
    absentPosition: string | null;
    absentBranch: string | null;
    absentUnitId: number | null;
    absentUnit: string | null;
    substituteUserId: number | null;
    substitutePosition: string | null;
    substituteBranch: string | null;
    substituteUnitId: number | null;
    substituteUnit: string | null;
    passportSeriesNumber: string | null;
    passportIssuedBy: string | null;
    inn: string | null;
    passportIssuedOn: string | null;
    passportValidUntil: string | null;
    addressRegistration: string | null;
    addressResidence: string | null;
    daysCount: number | null;
    commissionChairUserId: number | null;
    commissionChairName: string | null;
    commissionChairPosition: string | null;
    handoverMoment: HandoverMoment;
    handoverOn: string | null;
    commissionMembers: CommissionMember[];
    description: string | null;
    passportExpiresBeforeEnd: boolean;
    approvals: ApprovalStep[];
}

export interface SubstitutionSaveRequest {
    initiatorUserId?: number | null;
    subject: string;
    reason: SubstitutionReason;
    absentUserId?: number | null;
    absentName: string;
    absentPosition?: string | null;
    absentBranch?: string | null;
    absentUnitId?: number | null;
    substituteUserId?: number | null;
    substituteName: string;
    substitutePosition?: string | null;
    substituteBranch?: string | null;
    substituteUnitId?: number | null;
    passportSeriesNumber?: string | null;
    passportIssuedBy?: string | null;
    inn?: string | null;
    passportIssuedOn?: string | null;
    passportValidUntil?: string | null;
    addressRegistration?: string | null;
    addressResidence?: string | null;
    daysCount?: number | null;
    startsOn?: string | null;
    endsOn?: string | null;
    commissionChairUserId?: number | null;
    commissionChairName?: string | null;
    commissionChairPosition?: string | null;
    handoverMoment: HandoverMoment;
    handoverOn?: string | null;
    commissionMembers: CommissionMember[];
    description?: string | null;
}

export interface SubstitutionPage {
    items: SubstitutionListItem[];
    total: number;
    page: number;
    pageSize: number;
}

const BASE = "/substitution-requests";

export const substitutionService = {
    async search(params: {query?: string; status?: string; mineOnly?: boolean; page?: number; pageSize?: number} = {}) {
        const {data} = await apiClient.get<SubstitutionPage>(BASE, {params});
        return data;
    },
    async get(id: number) {
        const {data} = await apiClient.get<SubstitutionDetails>(`${BASE}/${id}`);
        return data;
    },
    async create(request: SubstitutionSaveRequest) {
        const {data} = await apiClient.post<SubstitutionDetails>(BASE, request);
        return data;
    },
    async update(id: number, request: SubstitutionSaveRequest) {
        const {data} = await apiClient.put<SubstitutionDetails>(`${BASE}/${id}`, request);
        return data;
    },
    async submit(id: number) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/submit`);
        return data;
    },
    async approve(id: number, comment?: string) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/approve`, {comment});
        return data;
    },
    async reject(id: number, comment?: string) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/reject`, {comment});
        return data;
    },
    async execute(id: number) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/execute`);
        return data;
    },
    async withdraw(id: number) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/withdraw`);
        return data;
    },
    async remove(id: number) {
        await apiClient.delete(`${BASE}/${id}`);
    },

    /** Скачать печатную форму: form = "order" (приказ) или "liability" (договор МО). */
    async print(id: number, form: "order" | "liability", fileName: string) {
        const response = await apiClient.get(`${BASE}/${id}/print/${form}`, {responseType: "blob"});
        const url = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },
};
