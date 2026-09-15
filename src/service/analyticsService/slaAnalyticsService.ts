import {axiosInstance} from "@/service/axiosInstance.ts";

// Зеркало backend DTO (Modules/Analytics/DTO/Response/Sla/**) — SLA-срез по всем контурам.

/** Строка разбивки соблюдения сроков по одному контуру. */
export interface SlaContourRow {
    contour: string; // Sz | Procurement | Vnd | Acknowledgement
    label: string;
    open: number;
    overdue: number;
    dueSoon: number;
    compliancePercent: number;
}

/** KPI-плашки + разбивка по контурам. */
export interface SlaOverviewResponse {
    openTasks: number;
    overdue: number;
    dueSoon: number;
    compliancePercent: number;
    contours: SlaContourRow[];
}

/** Сотрудник с наибольшим числом просроченных задач. */
export interface SlaViolatorItem {
    userId: number;
    fullName: string;
    orgUnitLabel: string | null;
    open: number;
    overdue: number;
}

const BASE = "/analytics/sla";

export const slaAnalyticsService = {
    async getOverview(): Promise<SlaOverviewResponse> {
        const res = await axiosInstance.get<SlaOverviewResponse>(`${BASE}/overview`);
        return res.data;
    },

    async getTopOverdue(top = 15): Promise<SlaViolatorItem[]> {
        const res = await axiosInstance.get<SlaViolatorItem[]>(`${BASE}/top-overdue`, {params: {top}});
        return res.data;
    },
};
