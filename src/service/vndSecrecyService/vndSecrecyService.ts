// Настройки секретности ВНД (право ManageVndSecrecy): признак «секретный» и кому открыт документ —
// группы пользователей из справочника и отдельные сотрудники. См. VndSecrecyController на бэке.
import {apiClient} from "@/service/apiClient.ts";

export interface VndSecrecyUser {
    userId: number;
    fullName: string;
    email: string | null;
    orgUnitName: string | null;
    positionName: string | null;
    /** Заблокирован или отключён — доступ формально есть, но войти он не сможет. */
    isInactive: boolean;
}

export interface VndSecrecySettings {
    isSecret: boolean;
    groupIds: number[];
    users: VndSecrecyUser[];
}

export interface UpdateVndSecrecyRequest {
    isSecret: boolean;
    groupIds: number[];
    userIds: number[];
}

/** Текст ошибки из ответа сервера ({message}) — иначе axios отдаёт «Request failed with status code 400». */
function serverMessage(e: unknown, fallback: string): Error {
    const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
    return new Error(message || (e instanceof Error ? e.message : fallback));
}

export const vndSecrecyService = {
    async get(vndId: number): Promise<VndSecrecySettings> {
        try {
            const {data} = await apiClient.get<VndSecrecySettings>(`/vnd/${vndId}/secrecy`);
            return data;
        } catch (e) {
            throw serverMessage(e, "Не удалось загрузить настройки секретности");
        }
    },

    async update(vndId: number, request: UpdateVndSecrecyRequest): Promise<VndSecrecySettings> {
        try {
            const {data} = await apiClient.put<VndSecrecySettings>(`/vnd/${vndId}/secrecy`, request);
            return data;
        } catch (e) {
            throw serverMessage(e, "Не удалось сохранить настройки секретности");
        }
    },
};
