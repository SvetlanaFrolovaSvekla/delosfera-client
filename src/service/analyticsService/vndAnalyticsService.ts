import {axiosInstance} from "@/service/axiosInstance.ts";
import type {
    AnalyticsPeriodRequest,
    ChartCategoryPoint,
    VndActualizationTrendPoint,
    VndApprovalPerformanceResponse,
    VndApproverWorkloadItem,
    VndDynamicsPoint,
    VndOrgUnitStatusMatrixItem,
    VndOverviewResponse,
} from "./vndAnalyticsServiceType.ts";

const BASE = "/analytics/vnd";

export const vndAnalyticsService = {
    async getOverview(): Promise<VndOverviewResponse> {
        const res = await axiosInstance.get<VndOverviewResponse>(`${BASE}/overview`);
        return res.data;
    },

    async getStatusDistribution(): Promise<ChartCategoryPoint[]> {
        const res = await axiosInstance.get<ChartCategoryPoint[]>(`${BASE}/status-distribution`);
        return res.data;
    },

    async getTypeDistribution(): Promise<ChartCategoryPoint[]> {
        const res = await axiosInstance.get<ChartCategoryPoint[]>(`${BASE}/type-distribution`);
        return res.data;
    },

    async getDeveloperDistribution(top = 10): Promise<ChartCategoryPoint[]> {
        const res = await axiosInstance.get<ChartCategoryPoint[]>(`${BASE}/developer-distribution`, {params: {top}});
        return res.data;
    },

    async getSecurityLevelDistribution(): Promise<ChartCategoryPoint[]> {
        const res = await axiosInstance.get<ChartCategoryPoint[]>(`${BASE}/security-level-distribution`);
        return res.data;
    },

    async getRubricDistribution(top = 10): Promise<ChartCategoryPoint[]> {
        const res = await axiosInstance.get<ChartCategoryPoint[]>(`${BASE}/rubric-distribution`, {params: {top}});
        return res.data;
    },

    async getKeywordCloud(top = 30): Promise<ChartCategoryPoint[]> {
        const res = await axiosInstance.get<ChartCategoryPoint[]>(`${BASE}/keyword-cloud`, {params: {top}});
        return res.data;
    },

    async getDynamics(request: AnalyticsPeriodRequest): Promise<VndDynamicsPoint[]> {
        const res = await axiosInstance.post<VndDynamicsPoint[]>(`${BASE}/dynamics`, request);
        return res.data;
    },

    async getActualizationTrend(request: AnalyticsPeriodRequest): Promise<VndActualizationTrendPoint[]> {
        const res = await axiosInstance.post<VndActualizationTrendPoint[]>(`${BASE}/actualization-trend`, request);
        return res.data;
    },

    async getApprovalPerformance(request?: AnalyticsPeriodRequest | null): Promise<VndApprovalPerformanceResponse> {
        const res = await axiosInstance.post<VndApprovalPerformanceResponse>(`${BASE}/approval-performance`, request ?? null);
        return res.data;
    },

    async getApproverWorkload(byUser: boolean): Promise<VndApproverWorkloadItem[]> {
        const url = byUser ? `${BASE}/approver-workload/by-user` : `${BASE}/approver-workload`;
        const res = await axiosInstance.get<VndApproverWorkloadItem[]>(url);
        return res.data;
    },

    async getOrgUnitStatusMatrix(): Promise<VndOrgUnitStatusMatrixItem[]> {
        const res = await axiosInstance.get<VndOrgUnitStatusMatrixItem[]>(`${BASE}/org-unit-status-matrix`);
        return res.data;
    },

    /** Скачивает сводный CSV-отчёт и триггерит сохранение файла в браузере */
    async downloadExportCsv(): Promise<void> {
        const res = await axiosInstance.get(`${BASE}/export`, {responseType: "blob"});
        const disposition = res.headers["content-disposition"] as string | undefined;
        const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
        const fileName = match ? decodeURIComponent(match[1]) : "vnd-report.csv";

        const url = URL.createObjectURL(res.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },
};
