import {axiosInstance} from "@/service/axiosInstance.ts";
import type {
    Notification,
    NotificationFilter,
    PagedNotificationResponse,
    NotificationCounts,
    NotificationCategoryOption,
    NotificationCategory,
    CreateNotificationRequest,
    NotificationSelectionItem,
} from "./notificationsServiceType.ts";

class NotificationsService {
    private readonly basePath = "/notifications";

    /** Список уведомлений текущего пользователя с фильтрами */
    async search(filter: NotificationFilter): Promise<PagedNotificationResponse> {
        const response = await axiosInstance.post<PagedNotificationResponse>(
            `${this.basePath}/search`,
            filter
        );
        return response.data;
    }

    /** Список доступных категорий (для фильтра на фронте) */
    async getCategories(): Promise<NotificationCategoryOption[]> {
        const response = await axiosInstance.get<NotificationCategoryOption[]>(
            `${this.basePath}/categories`
        );
        return response.data;
    }

    /** Счётчики: всего непрочитанных, избранных, непрочитанных по категориям */
    async getCounts(): Promise<NotificationCounts> {
        const response = await axiosInstance.get<NotificationCounts>(
            `${this.basePath}/counts`
        );
        return response.data;
    }

    /** Одно уведомление по id (id записи в личном списке пользователя) */
    async getById(id: number): Promise<Notification> {
        const response = await axiosInstance.get<Notification>(
            `${this.basePath}/${id}`
        );
        return response.data;
    }

    /** Создать и разослать уведомление (для админских сценариев) */
    async create(request: CreateNotificationRequest): Promise<void> {
        await axiosInstance.post(this.basePath, request);
    }

    /** Отметить уведомление прочитанным */
    async markAsRead(id: number): Promise<Notification> {
        const response = await axiosInstance.post<Notification>(
            `${this.basePath}/${id}/read`
        );
        emitNotificationsChanged();
        return response.data;
    }

    /** Снять отметку "прочитано" */
    async markAsUnread(id: number): Promise<Notification> {
        const response = await axiosInstance.post<Notification>(
            `${this.basePath}/${id}/unread`
        );
        emitNotificationsChanged();
        return response.data;
    }

    /** Прочитать все уведомления (опционально — только в рамках одной категории) */
    async markAllAsRead(category?: NotificationCategory): Promise<{ markedCount: number }> {
        const response = await axiosInstance.post<{ markedCount: number }>(
            `${this.basePath}/read-all`,
            null,
            {params: category ? {category} : undefined}
        );
        emitNotificationsChanged();
        return response.data;
    }

    /** Добавить/убрать из избранного */
    async toggleFavorite(id: number): Promise<Notification> {
        const response = await axiosInstance.post<Notification>(
            `${this.basePath}/${id}/favorite`
        );
        return response.data;
    }

    /** Все id (и флаги) уведомлений по фильтру — для «выбрать всё», а не только страницу (до 5000). */
    async searchSelection(filter: NotificationFilter): Promise<NotificationSelectionItem[]> {
        const response = await axiosInstance.post<NotificationSelectionItem[]>(
            `${this.basePath}/search-selection`,
            filter
        );
        return response.data;
    }

    /** Массовые действия одним запросом (сервер сам пропускает уже прочитанные/чужие/удалённые). */
    /** Возвращают, сколько записей сервер реально изменил (affected). */
    async bulkMarkAsRead(ids: number[]): Promise<number> {
        const response = await axiosInstance.post<{ affected: number }>(`${this.basePath}/bulk/read`, {ids});
        emitNotificationsChanged();
        return response.data.affected;
    }

    async bulkSetFavorite(ids: number[], favorite: boolean): Promise<number> {
        const response = await axiosInstance.post<{ affected: number }>(`${this.basePath}/bulk/favorite`, {ids, favorite});
        return response.data.affected;
    }

    async bulkDelete(ids: number[]): Promise<number> {
        const response = await axiosInstance.post<{ affected: number }>(`${this.basePath}/bulk/delete`, {ids});
        emitNotificationsChanged();
        return response.data.affected;
    }

    /** Удалить уведомление из своего списка (мягкое удаление) */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
        emitNotificationsChanged();
    }
}

export const notificationsService = new NotificationsService();

/** Событие "у уведомлений поменялся статус прочтения/набор" - слушают счётчики (яблочко на Sidebar, колокольчик). */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

function emitNotificationsChanged() {
    try {
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
        // не критично
    }
}