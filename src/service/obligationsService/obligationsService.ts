import {apiClient} from "@/service/apiClient.ts";

/**
 * Регулярные обязательства: заседания комитетов, отчёты, пересмотр политик,
 * график сдачи в НБКР.
 *
 * Регулятор мыслит периодичностью — «не реже раза в месяц», «ежеквартально».
 * Раздел отвечает, соблюдается ли она, до проверки, а не на ней.
 */

export type Periodicity = "Weekly" | "Monthly" | "Quarterly" | "SemiAnnual" | "Annual";

export const PERIODICITY_TITLE: Record<Periodicity, string> = {
    Weekly: "Еженедельно",
    Monthly: "Ежемесячно",
    Quarterly: "Ежеквартально",
    SemiAnnual: "Раз в полугодие",
    Annual: "Ежегодно",
};

export const PERIODICITY_ORDER: Periodicity[] = [
    "Weekly", "Monthly", "Quarterly", "SemiAnnual", "Annual",
];

export type ObligationKind = "MeetingHeld" | "ReportSubmitted" | "DocumentReviewed" | "Other";

export const KIND_TITLE: Record<ObligationKind, string> = {
    MeetingHeld: "Заседание проведено",
    ReportSubmitted: "Отчёт представлен",
    DocumentReviewed: "Документ пересмотрен",
    Other: "Иное",
};

/** Заседания закрываются сами — человеку отмечать нечего. */
export const SELF_CLOSING: ObligationKind = "MeetingHeld";

export type PeriodStatus = "Pending" | "Fulfilled" | "Missed" | "Waived";

export const PERIOD_STATUS_TITLE: Record<PeriodStatus, string> = {
    Pending: "Ожидается",
    Fulfilled: "Исполнено",
    Missed: "Просрочено",
    Waived: "Снято",
};

export type MeetingBody = "Board" | "Kpa" | "CreditCommittee";

export const BODY_TITLE: Record<MeetingBody, string> = {
    Board: "Правление",
    Kpa: "Комитет по проблемным активам",
    CreditCommittee: "Кредитный комитет",
};

export interface CurrentPeriod {
    id: number;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    status: PeriodStatus;
}

export interface Obligation {
    id: number;
    title: string;
    description: string | null;
    basis: string | null;
    kind: ObligationKind;
    periodicity: Periodicity;
    body: MeetingBody | null;
    graceDays: number;
    startsOn: string;
    endsOn: string | null;
    isActive: boolean;
    responsible: string | null;
    responsibleUnit: string | null;
    current: CurrentPeriod | null;
    missedCount: number;
}

export interface ObligationPeriod {
    id: number;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    status: PeriodStatus;
    fulfilledAt: string | null;
    fulfilledBy: string | null;
    meetingId: number | null;
    comment: string | null;
    isLate: boolean;
}

export interface AttentionRow {
    periodId: number;
    obligationId: number;
    title: string;
    basis: string | null;
    periodicity: Periodicity;
    responsible: string | null;
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    status: PeriodStatus;
    daysLeft: number;
}

export interface ObligationSaveRequest {
    title: string;
    description?: string | null;
    basis?: string | null;
    kind: ObligationKind;
    periodicity: Periodicity;
    body?: MeetingBody | null;
    responsibleUserId?: number | null;
    responsibleUnitId?: number | null;
    graceDays: number;
    startsOn: string;
    endsOn?: string | null;
    isActive: boolean;
}

const BASE = "/obligations";

export const obligationsService = {
    async list(includeInactive = false) {
        const {data} = await apiClient.get<Obligation[]>(BASE, {params: {includeInactive}});
        return data;
    },

    async periods(id: number) {
        const {data} = await apiClient.get<ObligationPeriod[]>(`${BASE}/${id}/periods`);
        return data;
    },

    /** Что просрочено и что горит — сводка по всем обязательствам. */
    async attention(days = 14) {
        const {data} = await apiClient.get<AttentionRow[]>(`${BASE}/attention`, {params: {days}});
        return data;
    },

    async create(request: ObligationSaveRequest) {
        const {data} = await apiClient.post<{id: number}>(BASE, request);
        return data;
    },

    async update(id: number, request: ObligationSaveRequest) {
        await apiClient.put(`${BASE}/${id}`, request);
    },

    async fulfil(periodId: number, comment?: string) {
        await apiClient.post(`${BASE}/periods/${periodId}/fulfil`, {comment});
    },

    async waive(periodId: number, reason: string) {
        await apiClient.post(`${BASE}/periods/${periodId}/waive`, {reason});
    },
};
