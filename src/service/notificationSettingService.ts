// Настройки уведомлений пользователя

import {apiClient} from "@/service/apiClient.ts";

export interface NotificationSetting {
    emailDigestEnabled: boolean;
}

const BASE = "/notification-settings";

export const notificationSettingService = {
    async get(): Promise<NotificationSetting> {
        const {data} = await apiClient.get<NotificationSetting>(BASE);
        return data;
    },

    async set(setting: NotificationSetting): Promise<NotificationSetting> {
        const {data} = await apiClient.put<NotificationSetting>(BASE, setting);
        return data;
    },
};
