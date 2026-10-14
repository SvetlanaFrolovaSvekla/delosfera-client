export type ActivityIcon = "check" | "x" | "doc" | "clock" | "edit" | "info" | "trash";

export interface ActivityLogEntryResponse {
    id: number;
    module: string;
    entityId: number;
    entityCode: string;
    icon: ActivityIcon;
    /** Точный тип события журнала ВНД (ActivityEventKind в camelCase: "created", "itemAdded",
     * "processStarted", "revisionNeeded", "published"...) - для цвета точки на вкладке «История».
     * null/нет - запись из технического аудита (СЗ/закупки) или старый сервер. */
    kind?: string | null;
    text: string;
    url: string;
    createdAt: string; // ISO datetime

    // false — запись о чужом черновике ВНД, который текущему пользователю не открыть (см.
    // тот же критерий видимости, что и в реестре/на самой странице ВНД). true для всех
    // остальных записей, включая записки/закупки — там такого ограничения нет.
    canOpen: boolean;
}
/** Отбор ленты "Активность на портале" (GET /activity-log/feed) */
export interface ActivityFeedQuery {
    module?: string;
    /** Слова через пробел - запись подходит, если в ней есть все */
    q?: string;
    /** ISO, включительно */
    from?: string;
    /** ISO, включительно */
    to?: string;
    icons?: ActivityIcon[];
    /** nextCursor из прошлой страницы */
    cursor?: string;
    limit?: number;
}

export interface ActivityFeedResponse {
    items: ActivityLogEntryResponse[];
    hasMore: boolean;
    nextCursor: string | null;
}
