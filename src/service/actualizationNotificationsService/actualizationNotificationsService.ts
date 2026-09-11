// Раздел "Уведомления" → "Настройки рассылок" → "Нормотворчество" (см.
// NotificationMailingSettingsPage): ответственные сотрудники СП за актуализацию ВНД и
// ежемесячная сводка им 1-го числа.
import {apiClient} from "@/service/apiClient.ts";

export interface ActualizationNotificationResponsible {
    id: number;
    orgUnitId: number;
    orgUnitName: string;
    userId: number;
    userFullName: string;
    /** Своё СП сотрудника — не обязательно то же, за что он отвечает: ответственного можно
     * назначить и из другого подразделения. Отличает "свой"/"чужой" сотрудник в модалке
     * назначения (см. AssignResponsiblesModal). */
    userOrgUnitId: number | null;
    userOrgUnitName: string | null;
}

export interface ActualizationNotificationSettings {
    monthlyDigestEnabled: boolean;
    /** Ключи доп. колонок Excel-вложения — те же, что ACTUALIZATION_COLUMNS на фронте.
     * Обязательные (fixed) колонки сюда не входят — вкладываются всегда. */
    monthlyDigestColumns: string[];
}

export interface ActualizationNotificationPreview {
    orgUnitId: number;
    orgUnitName: string;
    subject: string;
    body: string;
    attachmentFileName: string;
    recipientNames: string[];
    totalCount: number;
    normalCount: number;
    approachingCount: number;
    criticalCount: number;
    overdueCount: number;
}

const BASE = "/vnd/actualization-notifications";

export const actualizationNotificationsService = {
    async getResponsibles(): Promise<ActualizationNotificationResponsible[]> {
        const {data} = await apiClient.get<ActualizationNotificationResponsible[]>(`${BASE}/responsibles`);
        return data;
    },

    /** Полная замена состава ответственных для одного СП — возвращает обновлённый список по
     * всем СП сразу (тот же формат, что getResponsibles). */
    async setResponsibles(orgUnitId: number, userIds: number[]): Promise<ActualizationNotificationResponsible[]> {
        const {data} = await apiClient.put<ActualizationNotificationResponsible[]>(
            `${BASE}/responsibles`, {orgUnitId, userIds});
        return data;
    },

    async getSettings(): Promise<ActualizationNotificationSettings> {
        const {data} = await apiClient.get<ActualizationNotificationSettings>(`${BASE}/settings`);
        return data;
    },

    async updateSettings(settings: ActualizationNotificationSettings): Promise<ActualizationNotificationSettings> {
        const {data} = await apiClient.put<ActualizationNotificationSettings>(`${BASE}/settings`, settings);
        return data;
    },

    /** Демонстрация письма ежемесячной сводки для одного СП — без отправки. */
    async preview(orgUnitId: number): Promise<ActualizationNotificationPreview> {
        const {data} = await apiClient.get<ActualizationNotificationPreview>(`${BASE}/preview`, {params: {orgUnitId}});
        return data;
    },
};
