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

    /** Задача делегирована текущему исполнителю — от кого (СК-3). */
    delegatedBy: string | null;

    createdAt: string;
}

export interface TaskInbox {
    tasks: InboxTask[];
    total: number;
    overdue: number;
    delegated: number;
}

/** Группа в статистике задач: контур или тип, со счётчиком и просрочкой (ЗД-1). */
export interface TaskStatGroup {
    key: string;
    title: string;
    count: number;
    overdue: number;
}

export interface TaskStats {
    total: number;
    overdue: number;
    delegated: number;
    dueToday: number;
    dueThisWeek: number;
    noDue: number;
    byContour: TaskStatGroup[];
    byType: TaskStatGroup[];
}

export const taskInboxService = {
    async get(documentType?: string): Promise<TaskInbox> {
        const {data} = await apiClient.get<TaskInbox>("/workflow/inbox", {
            params: documentType ? {documentType} : undefined,
        });
        return data;
    },

    /** Статистика по моим задачам (ЗД-1). */
    async stats(): Promise<TaskStats> {
        const {data} = await apiClient.get<TaskStats>("/workflow/inbox/stats");
        return data;
    },

    /** Делегировать задачу коллеге (СК-3). */
    async delegate(taskId: number, toUserId: number, comment?: string): Promise<void> {
        await apiClient.post(`/workflow/tasks/${taskId}/delegate`, {toUserId, comment});
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
    // Ознакомление открывается на общей странице листов, не по карточке документа:
    // отдельного экрана листа нет, поэтому entityId у него пустой — проверяем первым.
    if (task.documentType === "Acknowledgement") return "/hr-ack";

    if (task.entityId === null) return "/tasks";

    switch (task.documentType) {
        case "Sz":
            return `/sz/${task.entityId}`;
        case "Procurement":
            return `/prc/${task.entityId}`;
        case "Vnd":
            return `/base-vnd/${task.entityId}`;
        default:
            return "/tasks";
    }
}

/**
 * Уникальный ключ строки: id задачи движка и id строки листа ознакомления живут в
 * разных таблицах и могут совпасть числом. Без контура в ключе React путает строки.
 */
export function taskKey(task: InboxTask): string {
    return `${task.documentType}-${task.taskId}`;
}
