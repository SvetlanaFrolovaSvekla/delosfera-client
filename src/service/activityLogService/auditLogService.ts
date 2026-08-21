import {apiClient} from "@/service/apiClient.ts";

/** Запись журнала действий — то, что предъявляют при разбирательстве. */
export interface AuditRecord {
    id: number;
    at: string;
    userId: number | null;

    /** Пусто — действие выполнила сама система (фоновая служба, автоакцепт). */
    userName: string | null;

    entityType: string;
    entityId: number;
    action: string;
    actionText: string;
    payload: string | null;
}

export interface AuditPage {
    total: number;
    page: number;
    pageSize: number;
    items: AuditRecord[];
}

export interface AuditFilter {
    from?: string;
    to?: string;
    userId?: number;
    entityType?: string;
    action?: string;
    page?: number;
    pageSize?: number;
}

// Журнал аудита переехал на /api/audit: на /api/activity-log теперь лента
// событий рабочего стола — это разные вещи, и делить один адрес им незачем.
const BASE = "/audit";

export const auditLogService = {
    async search(filter: AuditFilter): Promise<AuditPage> {
        const {data} = await apiClient.get<AuditPage>(BASE, {params: filter});
        return data;
    },

    /** Перечни для отбора — берутся из самого журнала, а не из справочника. */
    async dictionaries(): Promise<{entityTypes: string[]; actions: string[]}> {
        const {data} = await apiClient.get<{entityTypes: string[]; actions: string[]}>(`${BASE}/dictionaries`);
        return data;
    },

    async export(filter: AuditFilter): Promise<void> {
        const response = await apiClient.get(`${BASE}/export`, {params: filter, responseType: "blob"});
        const url = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Журнал действий ${new Date().toLocaleDateString("ru-RU")}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    },
};
