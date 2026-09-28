import {axiosInstance} from "@/service/axiosInstance.ts";
import type {
    ProcessMiningFilter,
    ProcessMiningFilterOptions,
    ProcessMiningReport,
} from "./processMiningServiceType.ts";

const BASE = "/analytics/process-mining";

export const processMiningService = {
    /** Сводный отчёт: KPI, варианты маршрута, возвраты по этапам, узкие места */
    async getReport(filter?: ProcessMiningFilter | null): Promise<ProcessMiningReport> {
        const res = await axiosInstance.post<ProcessMiningReport>(`${BASE}/report`, filter ?? {});
        return res.data;
    },

    /** Доступные значения фильтров (типы документов и шаблоны маршрутов в данных) */
    async getFilters(): Promise<ProcessMiningFilterOptions> {
        const res = await axiosInstance.get<ProcessMiningFilterOptions>(`${BASE}/filters`);
        return res.data;
    },
};
