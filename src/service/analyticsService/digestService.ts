import {apiClient} from "@/service/apiClient.ts";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";

// Персональный дайджест (УВ-14) — зеркало backend DTO (Modules/Analytics/DTO/DigestDto.cs).

export interface DigestContour {
    contour: string;
    title: string;
    count: number;
    overdue: number;
}

export interface Digest {
    total: number;
    overdue: number;
    dueSoon: number;
    delegated: number;
    contours: DigestContour[];
    upcoming: InboxTask[];
    overdueItems: InboxTask[];
}

export const digestService = {
    async get(): Promise<Digest> {
        const {data} = await apiClient.get<Digest>("/digest");
        return data;
    },
};
