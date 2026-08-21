import {apiClient} from "@/service/apiClient.ts";

/**
 * Пожелания и замечания сотрудников с экранов системы.
 *
 * Кнопка стоит на каждой странице, потому что обкатку ведут подразделения, для
 * которых система — не работа, а помеха работе. Письмо с описанием, где именно и
 * что именно не так, они писать не станут; контекст — маршрут, заголовок, браузер,
 * размер окна — система снимает сама.
 */

export type FeedbackKind = "Problem" | "Wish" | "Question";

export const KIND_TITLE: Record<FeedbackKind, string> = {
    Problem: "Не работает",
    Wish: "Неудобно, есть пожелание",
    Question: "Непонятно, что делать",
};

/** Порядок в форме — от того, что требует правки кода, к тому, что требует правки инструкции. */
export const KIND_ORDER: FeedbackKind[] = ["Problem", "Wish", "Question"];

export type FeedbackStatus = "New" | "InProgress" | "Accepted" | "Declined" | "Done";

export const STATUS_TITLE: Record<FeedbackStatus, string> = {
    New: "Новое",
    InProgress: "В работе",
    Accepted: "Принято",
    Declined: "Отклонено",
    Done: "Сделано",
};

export const STATUS_ORDER: FeedbackStatus[] = ["New", "InProgress", "Accepted", "Done", "Declined"];

export interface FeedbackAuthor {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
}

export interface FeedbackRow {
    id: number;
    kind: FeedbackKind;
    text: string;
    routePath: string;
    entityId: number | null;
    pageTitle: string | null;
    createdAt: string;
    status: FeedbackStatus;
    handlerComment: string | null;
    handledAt: string | null;
    author: FeedbackAuthor | null;
    handledBy: string | null;
    userAgent: string | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
}

export interface MyFeedbackRow {
    id: number;
    kind: FeedbackKind;
    text: string;
    routePath: string;
    pageTitle: string | null;
    createdAt: string;
    status: FeedbackStatus;
    handlerComment: string | null;
}

export interface FeedbackSummary {
    byStatus: { status: FeedbackStatus; count: number }[];
    byKind: { kind: FeedbackKind; count: number }[];
    byPage: { routePath: string; pageTitle: string | null; count: number; problems: number }[];
}

const BASE = "/feedback";

export const feedbackService = {
    /** Отправить сообщение с текущего экрана. Контекст берётся из окна браузера здесь же. */
    async send(kind: FeedbackKind, text: string, pageTitle?: string) {
        const {data} = await apiClient.post<{ id: number }>(BASE, {
            kind,
            text,
            path: window.location.pathname,
            pageTitle: pageTitle ?? document.title,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        });
        return data;
    },

    async mine() {
        const {data} = await apiClient.get<MyFeedbackRow[]>(`${BASE}/mine`);
        return data;
    },

    async list(params: {
        status?: FeedbackStatus;
        kind?: FeedbackKind;
        routePath?: string;
        page?: number;
        pageSize?: number;
    } = {}) {
        const {data} = await apiClient.get<{
            total: number;
            page: number;
            pageSize: number;
            items: FeedbackRow[];
        }>(BASE, {params});
        return data;
    },

    async summary() {
        const {data} = await apiClient.get<FeedbackSummary>(`${BASE}/summary`);
        return data;
    },

    async handle(id: number, status: FeedbackStatus, comment?: string) {
        await apiClient.patch(`${BASE}/${id}`, {status, comment});
    },
};
