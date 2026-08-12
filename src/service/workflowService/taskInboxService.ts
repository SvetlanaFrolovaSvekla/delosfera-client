import {apiClient} from "@/service/apiClient.ts";

/** Задача в сводном реестре по всем контурам. */
export interface InboxTask {
    taskId: number;
    participantId: number;

    documentId: number;
    regNumber: string | null;
    documentTitle: string;

    /** Sz | Procurement | Vnd | Tid | Contract — по нему строится ссылка. */
    documentType: string;
    documentTypeTitle: string;

    taskType: string;
    stepOrder: number;
    stepKind: string;

    dueAt: string | null;
    isOverdue: boolean;

    /** Задача получена по замещению — за кого выполняется. */
    onBehalfOf: string | null;

    createdAt: string;
}

export interface TaskInbox {
    tasks: InboxTask[];
    total: number;
    overdue: number;
    delegated: number;
}

export const taskInboxService = {
    async get(documentType?: string): Promise<TaskInbox> {
        const {data} = await apiClient.get<TaskInbox>("/api/workflow/inbox", {
            params: documentType ? {documentType} : undefined,
        });
        return data;
    },
};

/** Куда ведёт задача: у каждого контура свой маршрут в интерфейсе. */
export function taskLink(task: InboxTask): string {
    switch (task.documentType) {
        case "Sz":
            return `/sz/${task.documentId}`;
        case "Procurement":
            return `/prc/${task.documentId}`;
        default:
            return "/tasks";
    }
}
