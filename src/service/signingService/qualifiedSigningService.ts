import {apiClient} from "@/service/apiClient.ts";

/**
 * Квалифицированная электронная подпись (SIG-02).
 *
 * Сервер отдаёт хеш того, что подписывается, и принимает обратно подпись с
 * сертификатом. Закрытый ключ здесь не появляется ни на одном шаге — им
 * распоряжается криптопровайдер на рабочем месте.
 */

export interface SignatureInfo {
    id: number;
    userId: number;
    userName: string | null;
    level: "Simple" | "Qualified";
    levelTitle: string;
    at: string;
    revoked: boolean;
    revokedReason: string | null;

    certificateSubject: string | null;
    certificateSerial: string | null;
    certificateValidTo: string | null;

    /** Каким удостоверяющим центром подтверждён сертификат. */
    trustAuthority: string | null;

    /** Цепочка не проверялась — доверенные центры не заведены. */
    trustNotChecked: boolean;

    /** Отзыв сертификата проверен по списку удостоверяющего центра. */
    revocationChecked: boolean;

    /** Почему отзыв не проверен. */
    revocationNote: string | null;

    /** Время, удостоверённое службой меток. Пусто — метки нет. */
    timestampedAt: string | null;

    timestampAuthority: string | null;

    /** Почему метки нет. */
    timestampNote: string | null;
}

export interface SigningSettings {
    timestampEnabled: boolean;
    timestampAuthorityUrl: string | null;
    timestampRequired: boolean;
    timestampTimeoutSeconds: number;

    revocationCheckEnabled: boolean;
    revocationStrict: boolean;
    revocationRecheckHours: number;

    updatedAt: string | null;

    /** Сколько подписей уже стоит без метки: включение не действует задним числом. */
    signaturesWithoutTimestamp: number;
}

export interface SignChallenge {
    attachmentId: number | null;
    documentId: number | null;

    /** Что именно подписывается — показывается человеку перед вводом PIN. */
    fileName: string;

    hash: string;
    hashAlgorithm: string;

    /** Тот же хеш в base64 — в таком виде его принимает провайдер. */
    dataToSign: string;

    signatures: SignatureInfo[];
}

export interface MyCertificate {
    id: number;
    subject: string;
    issuer: string;
    serialNumber: string;
    notBefore: string;
    notAfter: string;
    registeredAt: string;
    revokedAt: string | null;
    revokedReason: string | null;
    expired: boolean;
}

export interface Authority {
    id: number;
    title: string;
    subject: string;
    issuer: string;
    thumbprint: string;
    serialNumber: string;
    notBefore: string;
    notAfter: string;
    isActive: boolean;
    disabledReason: string | null;
    addedAt: string;
    selfSigned: boolean;
    expired: boolean;
}

export interface AuthorityList {
    items: Authority[];

    /** Хотя бы один действующий центр заведён — значит цепочка проверяется. */
    trustEnforced: boolean;

    registeredCertificates: number;
}

export const qualifiedSigningService = {
    /** Данные для подписи карточки документа целиком. */
    async documentChallenge(documentId: number): Promise<SignChallenge> {
        const {data} = await apiClient.get<SignChallenge>(`/signing/documents/${documentId}/challenge`);
        return data;
    },

    async signDocument(documentId: number, signature: string, certificate: string): Promise<SignatureInfo> {
        const {data} = await apiClient.post<SignatureInfo>(
            `/signing/documents/${documentId}/qualified`, {signature, certificate});
        return data;
    },

    /** Данные для подписи отдельного вложения. */
    async attachmentChallenge(attachmentId: number): Promise<SignChallenge> {
        const {data} = await apiClient.get<SignChallenge>(`/signing/attachments/${attachmentId}/challenge`);
        return data;
    },

    async signAttachment(attachmentId: number, signature: string, certificate: string): Promise<SignatureInfo> {
        const {data} = await apiClient.post<SignatureInfo>(
            `/signing/attachments/${attachmentId}/qualified`, {signature, certificate});
        return data;
    },

    async myCertificates(): Promise<MyCertificate[]> {
        const {data} = await apiClient.get<MyCertificate[]>("/signing/certificates/mine");
        return data;
    },

    async authorities(): Promise<AuthorityList> {
        const {data} = await apiClient.get<AuthorityList>("/signing/authorities");
        return data;
    },

    async addAuthority(certificate: string, title?: string): Promise<void> {
        await apiClient.post("/signing/authorities", {certificate, title});
    },

    async disableAuthority(id: number, reason?: string): Promise<void> {
        await apiClient.post(`/signing/authorities/${id}/disable`, {reason});
    },

    async enableAuthority(id: number): Promise<void> {
        await apiClient.post(`/signing/authorities/${id}/enable`, null);
    },

    async settings(): Promise<SigningSettings> {
        const {data} = await apiClient.get<SigningSettings>("/signing/settings");
        return data;
    },

    async saveSettings(settings: Omit<SigningSettings, "updatedAt" | "signaturesWithoutTimestamp">): Promise<void> {
        await apiClient.put("/signing/settings", settings);
    },

    /** Проверить связь со службой меток, ничего не подписывая. */
    async testTimestamp(): Promise<{at: string; authority: string | null}> {
        const {data} = await apiClient.post<{at: string; authority: string | null}>(
            "/signing/settings/timestamp/test", null);
        return data;
    },
};
