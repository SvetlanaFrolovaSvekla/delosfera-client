import {apiClient} from "@/service/apiClient.ts";

// Календарь сроков (ЗС-13) — зеркало backend DTO (Modules/Analytics/DTO/CalendarEventDto.cs).

export interface CalendarEvent {
    date: string; // "YYYY-MM-DD"
    entityId: number | null;
    documentType: string;
    documentTypeTitle: string;
    regNumber: string | null;
    title: string;
    taskType: string;
    isOverdue: boolean;
    dueAt: string;
}

export const calendarService = {
    async get(): Promise<CalendarEvent[]> {
        const {data} = await apiClient.get<CalendarEvent[]>("/calendar");
        return data;
    },
};
