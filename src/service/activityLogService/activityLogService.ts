import {apiClient} from "@/service/apiClient.ts";
import type {ActivityFeedQuery, ActivityFeedResponse, ActivityLogEntryResponse} from "./activityLogServiceType.ts";

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

    /**
     * Лента "Активность на портале" с поиском, периодом, типом события и разделом - по
     * страницам (nextCursor из ответа - в cursor следующего запроса).
     */
    async getFeed(query: ActivityFeedQuery): Promise<ActivityFeedResponse> {
        const {icons, ...rest} = query;
        const params: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(rest)) {
            if (value !== undefined && value !== "") params[key] = value;
        }
        // Типы одной строкой через запятую: массив axios отправил бы как icons[]=..., а
        // ASP.NET такую запись не свяжет
        if (icons && icons.length > 0) params.icons = icons.join(",");
        const {data} = await apiClient.get<ActivityFeedResponse>("/activity-log/feed", {params});
        return data;
    },

    /**
     * История действий по одному документу — из технического аудита.
     *
     * Работает для любого контура: аудит пишут все, а человекочитаемый журнал
     * раньше был только у ВНД. entityType — тип документа как он лежит в аудите
     * («Sz», «ProcurementRequest», «ProcurementContract», …).
     */
    async history(
        entityType: string, entityId: number, assignmentIds?: number[],
    ): Promise<DocumentHistoryEntry[]> {
        const {data} = await apiClient.get<DocumentHistoryEntry[]>(
            `/activity-log/history/${entityType}/${entityId}`,
            {params: assignmentIds?.length ? {assignmentIds} : undefined},
        );
        return data;
    },

    /**
     * Весь журнал активности по одному документу (не "последние N" для дашборда — см.
     * getRecent — а полностью). Для таба "История" на карточке документа: у ВНД там уже
     * есть человекочитаемые записи на каждое значимое действие (module = "vnd").
     */
    async getByEntity(module: string, entityId: number): Promise<ActivityLogEntryResponse[]> {
        const {data} = await apiClient.get<ActivityLogEntryResponse[]>(
            `/activity-log/entity/${module}/${entityId}`,
        );
        return data;
    },
};

/** Одна строка истории документа. */
export interface DocumentHistoryEntry {
    id: number;
    action: string;
    text: string;
    icon: string;
    actorUserId: number | null;
    actorName: string;
    at: string;
}
