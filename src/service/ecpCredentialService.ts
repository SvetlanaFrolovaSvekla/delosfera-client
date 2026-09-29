import {apiClient} from "@/service/apiClient.ts";

/**
 * Сохранённая ЭЦП-идентификация ("личный кабинет → Электронная подпись"): ПИН и код из СМС/почты
 * один раз передаются на delosfera-server и хранятся там зашифрованно на ограниченный срок.
 * Пока запись действует, сервер сам обменивает код на минутный токен ГП «Инфоком» при каждом
 * подписании резолюции — ПИН и код вводить заново не нужно. См. UserEcpCredentialService на бэке.
 */

export interface EcpCredentialStatus {
    /** false — на сервере не задан ключ шифрования, сохранение выключено (подписание по обычному флоу). */
    available: boolean;
    enrolled: boolean;
    personIdnpMasked: string | null;
    createdAt: string | null;
    expiresAt: string | null;
    lastUsedAt: string | null;
    retentionDays: number;
}

/** То, что сервер вернул после подписания хэша резолюции сохранённой идентификацией. */
export interface StoredEcpSignature {
    signatureBase64: string;
    hash: string;
    personIdnp: string;
    timestamp: number;
    /** Токен из 2.3 — нужен только для сведений о сертификате в журнале подписей. */
    certToken: string;
}

/** Коды ошибок сохранённой идентификации (EcpCredentialErrorCodes на бэке). */
export const ECP_CREDENTIAL_MISSING = "ecp_credential_missing";
export const ECP_CREDENTIAL_EXPIRED = "ecp_credential_expired";
export const ECP_CREDENTIAL_INVALID = "ecp_credential_invalid";
export const ECP_CREDENTIAL_NOT_CONFIGURED = "ecp_credential_not_configured";

export function ecpCredentialErrorCode(e: unknown): string | undefined {
    return (e as { response?: { data?: { code?: string } } }).response?.data?.code;
}

export const ecpCredentialService = {
    async status(): Promise<EcpCredentialStatus> {
        const {data} = await apiClient.get<EcpCredentialStatus>("/signing/ecp-credential");
        return data;
    },

    /** Проверяет код обменом на токен (2.3) и сохраняет идентификацию. */
    async save(personIdnp: string, code: string): Promise<EcpCredentialStatus> {
        const {data} = await apiClient.put<EcpCredentialStatus>("/signing/ecp-credential", {personIdnp, code});
        return data;
    },

    async revoke(): Promise<void> {
        await apiClient.delete("/signing/ecp-credential");
    },

    /** Подписать хэш резолюции сохранённой идентификацией (хэш строит backend). */
    async signResolution(vndId: number, stageId: number, comment: string): Promise<StoredEcpSignature> {
        const {data} = await apiClient.post<StoredEcpSignature>(
            "/signing/ecp-credential/sign-resolution", {vndId, stageId, comment});
        return data;
    },
};
