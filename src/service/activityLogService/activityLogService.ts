import {apiClient} from "@/service/apiClient.ts";
import type {ActivityLogEntryResponse} from "./activityLogServiceType.ts";

export const activityLogService = {
    /**
     * Последние события журнала активности. Если module не указан — по всем контурам.
     *
     * Идёт через общий транспорт: свой запрос обращался к порту первой версии и
     * брал токен из хранилища браузера, где его нет — токен живёт в памяти вкладки.
     */
    async getRecent(limit = 8, module?: string): Promise<ActivityLogEntryResponse[]> {
        const {data} = await apiClient.get<ActivityLogEntryResponse[]>("/activity-log/recent", {
            params: module ? {limit, module} : {limit},
        });
        return data;
    },
};
