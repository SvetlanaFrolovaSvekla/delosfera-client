import {apiClient} from "@/service/apiClient.ts";

/** Разрез сводки: сколько записок в каждом состоянии. */
export interface SzStatisticsCell {
    total: number;
    inWork: number;
    overdue: number;
    executed: number;
    other: number;
}

export interface SzStatistics {
    from: string | null;
    to: string | null;

    total: number;
    inWork: number;
    overdue: number;
    executed: number;

    /** Черновики, отозванные и забракованные — в работу не считаются. */
    other: number;

    byUnit: Record<string, SzStatisticsCell>;
    byKind: Record<string, SzStatisticsCell>;
    byMonth: Record<string, SzStatisticsCell>;
}

export interface SzStatisticsFilter {
    from?: string;
    to?: string;
    orgUnitId?: number;
    kindId?: number;
}

const BASE = "/sz/statistics";

export const szStatisticsService = {
    async get(filter: SzStatisticsFilter): Promise<SzStatistics> {
        const {data} = await apiClient.get<SzStatistics>(BASE, {params: filter});
        return data;
    },

    /**
     * Выгрузка книгой Excel. Файл забираем запросом, а не переходом по адресу:
     * токен уходит заголовком, и по прямой ссылке сервер ответил бы отказом.
     */
    async export(filter: SzStatisticsFilter): Promise<void> {
        const response = await apiClient.get(`${BASE}/export`, {params: filter, responseType: "blob"});

        const имя = (response.headers as Record<string, string>)["content-disposition"]
            ?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];

        const url = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = имя ? decodeURIComponent(имя) : "Статистика служебных записок.xlsx";
        link.click();
        URL.revokeObjectURL(url);
    },
};
