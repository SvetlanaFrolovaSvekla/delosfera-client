// Раздел «Рассылка с уведомлением о новых редакциях» на странице «Настройки рассылок по
// актуализации ВНД»: включатель, каналы и получатели. Письмо уходит при каждой консолидации
// ВНД (и когда у нового ВНД появляется первая действующая редакция) — см.
// VndNewRedactionMailingController / VndNewRedactionMailingService на бэке.
import {apiClient} from "@/service/apiClient.ts";

export interface VndNewRedactionMailingRecipient {
    userId: number;
    fullName: string;
    email: string | null;
    orgUnitName: string | null;
    positionName: string | null;
    /** Заблокирован или отключён — письмо ему не уйдёт. */
    isInactive: boolean;
}

export interface VndNewRedactionMailingSettings {
    enabled: boolean;
    notifyInApp: boolean;
    notifyEmail: boolean;
    recipients: VndNewRedactionMailingRecipient[];
}

export interface UpdateVndNewRedactionMailingRequest {
    enabled: boolean;
    notifyInApp: boolean;
    notifyEmail: boolean;
    userIds: number[];
}

/** Текст ошибки из ответа сервера ({message}) — иначе axios отдаёт «Request failed with status code 400». */
function serverMessage(e: unknown, fallback: string): Error {
    const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
    return new Error(message || (e instanceof Error ? e.message : fallback));
}

export const vndNewRedactionMailingService = {
    async get(): Promise<VndNewRedactionMailingSettings> {
        try {
            const {data} = await apiClient.get<VndNewRedactionMailingSettings>("/vnd/new-redaction-mailing");
            return data;
        } catch (e) {
            throw serverMessage(e, "Не удалось загрузить настройки рассылки");
        }
    },

    async update(request: UpdateVndNewRedactionMailingRequest): Promise<VndNewRedactionMailingSettings> {
        try {
            const {data} = await apiClient.put<VndNewRedactionMailingSettings>("/vnd/new-redaction-mailing", request);
            return data;
        } catch (e) {
            throw serverMessage(e, "Не удалось сохранить настройки рассылки");
        }
    },
};
