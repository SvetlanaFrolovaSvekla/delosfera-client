import {apiClient} from "@/service/apiClient.ts";

/** Настройки связи со службой каталогов. Пароль с сервера не приходит никогда. */
export interface DirectorySettings {
    enabled: boolean;
    server: string;
    port: number;
    useSsl: boolean;
    serviceAccountLogin: string;

    /** Пароль задан. Само значение недоступно даже администратору. */
    hasPassword: boolean;

    usersBaseDn: string;
    usersFilter: string;
    pageSize: number;
    loginAttribute: string;
    emailAttribute: string;
    fullNameAttribute: string;
    syncIntervalMinutes: number;
    defaultRoleId: number | null;

    lastSyncAt: string | null;
    lastSyncCreated: number;
    lastSyncUpdated: number;
    lastSyncDeactivated: number;
    lastSyncError: string | null;
}

/** Сохранение настроек. Пустой пароль означает «оставить прежний». */
export interface DirectorySettingsRequest {
    enabled: boolean;
    server: string;
    port: number;
    useSsl: boolean;
    serviceAccountLogin: string;
    serviceAccountPassword?: string | null;
    usersBaseDn: string;
    usersFilter?: string | null;
    pageSize: number;
    loginAttribute?: string | null;
    emailAttribute?: string | null;
    fullNameAttribute?: string | null;
    syncIntervalMinutes: number;
    defaultRoleId?: number | null;
}

export interface DirectoryTestResult {
    success: boolean;
    total: number;
    active: number;
    message: string;
}

export interface DirectorySyncResult {
    success: boolean;
    created?: number;
    updated?: number;
    deactivated?: number;
    message: string;
}

const BASE = "/system/directory";

export const directorySettingsService = {
    get: () => apiClient.get<DirectorySettings>(BASE).then((r) => r.data),

    save: (request: DirectorySettingsRequest) =>
        apiClient.put<DirectorySettings>(BASE, request).then((r) => r.data),

    /** Проверка связи: подключиться и посчитать, сколько пользователей видно. */
    test: () => apiClient.post<DirectoryTestResult>(`${BASE}/test`).then((r) => r.data),

    /** Синхронизировать сейчас, не дожидаясь расписания. */
    syncNow: () => apiClient.post<DirectorySyncResult>(`${BASE}/sync`).then((r) => r.data),
};
