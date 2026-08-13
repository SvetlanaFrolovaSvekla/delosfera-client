import {apiClient} from "@/service/apiClient.ts";

/** Задача в сводном реестре по всем контурам. */
export interface InboxTask {
    taskId: number;

    /** Участник маршрута; у задач контура (решение адресата, поручение) его нет. */
    participantId: number | null;

    documentId: number;

    /** Идентификатор записи контура — по нему открывается карточка. */
    entityId: number | null;

    regNumber: string | null;
    documentTitle: string;

    /** Sz | Procurement | Vnd | Tid | Contract — по нему строится ссылка. */
    documentType: string;
    documentTypeTitle: string;

    taskType: string;

    /** Этап маршрута; у задач вне маршрута этапа нет. */
    stepOrder: number | null;
    stepKind: string | null;

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

/**
 * Куда ведёт задача: у каждого контура свой маршрут в интерфейсе.
 *
 * Карточка открывается по идентификатору записи контура, а не документа: числа
 * разные, и ссылка по документу уводит на чужую карточку. Пока сервер его не
 * прислал, задача ведёт в общий список — лучше, чем на посторонний документ.
 */
export function taskLink(task: InboxTask): string {
    if (task.entityId === null) return "/tasks";

    switch (task.documentType) {
        case "Sz":
            return `/sz/${task.entityId}`;
        case "Procurement":
            return `/prc/${task.entityId}`;
        default:
            return "/tasks";
    }
}
