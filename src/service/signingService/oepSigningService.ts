import {apiClient} from "@/service/apiClient.ts";

/**
 * Облачная ЭП ГП «Инфоком» (ОЭП, INT-03).
 *
 * Закрытый ключ живёт в облаке УЦ. Подпись ставится по пин-коду: выбираем метод
 * доставки (SMS/email) → получаем код → вводим его → сервер получает от УЦ подпись
 * отпечатка документа и сохраняет её как квалифицированную. Сервис-токен и
 * наименование организации — на стороне сервера, здесь их нет.
 */

export interface OepAuthMethod {
    authType: string | null;   // "email" | "sms"
    isActive: boolean;
}

export interface OepAuthMethodsResult {
    userAuthMethodList: OepAuthMethod[];
    /** Заполняется, когда учётная запись неактивна. */
    isActive: boolean | null;
    inactiveReason: string | null;
}

export interface OepSignResult {
    signatureId: number;
    personFio: string | null;
    signedAtUtc: string;
    verified: boolean;
    certificateSubject: string | null;
    certificateValidTo: string | null;
}

export interface OepSubjectRef {
    /** ПИН физлица (для юрлица не обязателен). */
    personIdnp?: string;
    /** ИНН организации (для физлица не обязателен). */
    organizationInn?: string;
}

export const oepSigningService = {
    /** Включена ли облачная ЭП на этом контуре. */
    async status(): Promise<boolean> {
        try {
            const {data} = await apiClient.get<{enabled: boolean}>("/signing/oep/status");
            return data.enabled;
        } catch {
            return false;
        }
    },

    /** 2.1 Доступные методы авторизации (email/sms) и статус учётной записи. */
    async authMethods(ref: OepSubjectRef): Promise<OepAuthMethodsResult> {
        const {data} = await apiClient.post<OepAuthMethodsResult>("/signing/oep/auth-methods", ref);
        return data;
    },

    /** 2.2 Отправить пин-код выбранным методом. */
    async sendPin(ref: OepSubjectRef, method: string): Promise<void> {
        await apiClient.post("/signing/oep/send-pin", {...ref, method});
    },

    /** Подписать карточку документа по пин-коду. */
    async signDocument(documentId: number, ref: OepSubjectRef, byPin: string): Promise<OepSignResult> {
        const {data} = await apiClient.post<OepSignResult>(
            `/signing/oep/documents/${documentId}/sign`, {...ref, byPin});
        return data;
    },

    /** Подписать вложение по пин-коду. */
    async signAttachment(attachmentId: number, ref: OepSubjectRef, byPin: string): Promise<OepSignResult> {
        const {data} = await apiClient.post<OepSignResult>(
            `/signing/oep/attachments/${attachmentId}/sign`, {...ref, byPin});
        return data;
    },
};
