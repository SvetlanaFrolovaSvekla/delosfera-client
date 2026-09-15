import {apiClient} from "@/service/apiClient.ts";
import type {ChartCategoryPoint} from "@/service/analyticsService/vndAnalyticsServiceType.ts";

// Отчёты по контурам (АН-1..4) — зеркало backend DTO (Modules/Analytics/DTO/ContourReportDto.cs).

export interface ReportKpi {
    label: string;
    value: string;
    note?: string | null;
    tone: string; // normal | warning | danger
}

export interface ReportChart {
    title: string;
    points: ChartCategoryPoint[];
}

export interface ContourReport {
    kpis: ReportKpi[];
    charts: ReportChart[];
}

const BASE = "/analytics/contour";

export const contourReportsService = {
    procurement: () => get("procurement"),
    meetings: () => get("meetings"),
    hr: () => get("hr"),
    office: () => get("office"),
};

async function get(contour: string): Promise<ContourReport> {
    const {data} = await apiClient.get<ContourReport>(`${BASE}/${contour}`);
    return data;
}
