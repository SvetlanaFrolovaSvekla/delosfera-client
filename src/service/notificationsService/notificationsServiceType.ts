// --- Категории уведомлений (совпадают с NotificationCategory на бэке,
// сериализуются как строки благодаря JsonStringEnumConverter)
// Approval/Task/Other оставлены только ради уже существующих старых уведомлений с такой
// категорией - новых с ними не создаётся, отдельной вкладки у них больше нет (Other раньше
// была "Разное" - теперь то, что было в ней про ознакомление, ушло в свою Acknowledgement,
// а обязательства/встречи/переписка остались без вкладки, см. NotificationCategoryCatalog).
export type NotificationCategory =
    | "System"
    | "Vnd"
    | "Approval"
    | "Task"
    | "Other"
    | "Sz"
    | "Procurement"
    | "Acknowledgement";

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

    // Код и название ВНД, если уведомление о ней (entityType === "Vnd") - чтобы показать их
    // прямо в списке уведомлений, не открывая карточку
    vndCode: string | null;
    vndTitle: string | null;

    // Файл, приложенный к уведомлению (например, Excel-план единоразовой рассылки
    // актуализации) — виден и скачивается прямо из карточки уведомления, без почты
    // (см. GET /api/files/{id}, доступ проверяет VndFileAccessAuthorizer на бэке).
    // Null, если к уведомлению ничего не приложено.
    attachmentFileId: number | null;
    attachmentFileName: string | null;

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
