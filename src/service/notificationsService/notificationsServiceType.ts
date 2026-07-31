// --- Категории уведомлений (совпадают с NotificationCategory на бэке,
// сериализуются как строки благодаря JsonStringEnumConverter)
export type NotificationCategory =
    | "System"
    | "Vnd"
    | "Approval"
    | "Task"
    | "Other";

export type NotificationSeverity = "Info" | "Success" | "Warning" | "Urgent";

export interface NotificationCategoryOption {
    code: number;
    key: string;
    name: string;
}

// --- Основная сущность уведомления в списке пользователя
export interface Notification {
    id: number; // id записи UserNotification - используется для read/unread/favorite/delete
    notificationId: number;

    title: string;
    body: string;

    category: NotificationCategory;
    severity: NotificationSeverity;

    entityType: string | null;
    entityId: number | null;
    url: string | null;

    createdByUserId: number | null;
    createdByName: string | null;

    isRead: boolean;
    readAt: string | null; // ISO date string

    isFavorite: boolean;
    favoritedAt: string | null;

    createdAt: string;
}

// --- Фильтр для поиска/списка уведомлений
export interface NotificationFilter {
    categories?: NotificationCategory[];
    severities?: NotificationSeverity[];
    isRead?: boolean | null;
    isFavorite?: boolean | null;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface PagedNotificationResponse {
    items: Notification[];
    totalCount: number;
    page: number;
    pageSize: number;
}

// --- Счётчики уведомлений
export interface NotificationCounts {
    totalUnread: number;
    totalFavorites: number;
    unreadByCategory: Record<string, number>; // ключ - код категории, как строка
}

// --- Создание уведомления (для администратора)
export interface CreateNotificationRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;

    bodyRu: string;
    bodyEn?: string;
    bodyKg?: string;

    category: NotificationCategory;

    entityType?: string;
    entityId?: number;
    url?: string;

    userIds?: number[];
    toAllUsers?: boolean;
}