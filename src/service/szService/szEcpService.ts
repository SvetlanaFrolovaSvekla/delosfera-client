// ЭЦП ГП «Инфоком» на резолюциях согласующих служебной записки (SzEcpController на бэке) — тот же
// принцип, что у ВНД: хэш строит backend (решение + комментарий + содержимое записки), клиент только
// подписывает его в ГП (2.5) и присылает подпись вместе с решением; backend проверяет её (2.6) и лишь
// затем выносит резолюцию маршрута.
import {apiClient} from "@/service/apiClient.ts";
import type {StoredEcpSignature} from "@/service/ecpCredentialService.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import type {SzDetails} from "@/service/szService/szService.ts";
import type {ResolutionSignatureVerifyResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

/** Решения согласующего, которые подписываются ЭЦП. */
export type SzSignableResolution = "Approved" | "ApprovedWithRemarks" | "Rejected";

/** Запись журнала подписей ЭЦП по записке (SzResolutionSignatureResponse на бэке). */
export interface SzResolutionSignature {
    id: number;
    routeParticipantId: number;
    routeInstanceId: number;
    /** Подпись из текущего маршрута (а не из прошлого круга согласования). */
    isCurrentRoute: boolean;
    stepOrder: number;
    decision: SzSignableResolution;
    userId: number;
    userFullName: string | null;
    personFio: string | null;
    organizationName: string | null;
    certCommonName: string | null;
    certIssuerCommonName: string | null;
    certValidNotAfter: string | null;
    hashSchemaVersion: string;
    hash: string;
    signatureSha256: string;
    /** Подпись стоит под текущей версией текста записки. */
    matchesCurrentContent: boolean;
    signedAt: string;
    verifiedAt: string;
    verified: boolean;
    /** Тестовая имитация ЭЦП — не подпись. */
    isTest: boolean;
}

/** Результат повторной проверки — тот же формат, что у ВНД. */
export type SzSignatureVerifyResult = Omit<ResolutionSignatureVerifyResponse, "changedComponents"> & {
    changedComponents: string[];
};

export interface SzResolutionHashResponse {
    hash: string;
    schemaVersion: string;
}

const base = (szId: number) => `/sz/${szId}/ecp`;

export const szEcpService = {
    /** Хэш резолюции для подписи — только активному участнику маршрута. */
    async getResolutionHash(
        szId: number, participantId: number, decision: SzSignableResolution, comment: string,
    ): Promise<SzResolutionHashResponse> {
        const {data} = await apiClient.post<SzResolutionHashResponse>(
            `${base(szId)}/resolution-hash`, {participantId, decision, comment});
        return data;
    },

    /** Подписать резолюцию сохранённой идентификацией (без окна ПИН/кода). */
    async signStored(
        szId: number, participantId: number, decision: SzSignableResolution, comment: string,
    ): Promise<StoredEcpSignature> {
        const {data} = await apiClient.post<StoredEcpSignature>(
            `${base(szId)}/sign-stored`, {participantId, decision, comment});
        return data;
    },

    /** Журнал подписей ЭЦП по записке. */
    async signatures(szId: number): Promise<SzResolutionSignature[]> {
        const {data} = await apiClient.get<SzResolutionSignature[]>(`${base(szId)}/signatures`);
        return data;
    },

    /** Повторная проверка подписи: 2.6 у провайдера + сверка с текущей запиской. Ничего не меняет. */
    async verifySignature(szId: number, signatureId: number): Promise<SzSignatureVerifyResult> {
        const {data} = await apiClient.post<SzSignatureVerifyResult>(`${base(szId)}/signatures/${signatureId}/verify`);
        return data;
    },

    /** Тестовый режим сервера (EcpSigning:AllowSzTestEcp): разрешена имитация ЭЦП в служебных записках. */
    async testMode(): Promise<{allowSzTestEcp: boolean}> {
        const {data} = await apiClient.get<{allowSzTestEcp: boolean}>("/sz/ecp/test-mode");
        return data;
    },

    /** ТЕСТ: решение с имитацией ЭЦП — без ПИН, кода и ГП «Инфоком». В листе — штамп «ТЕСТОВАЯ ИМИТАЦИЯ ЭЦП». */
    async resolveTest(
        szId: number, participantId: number, decision: SzSignableResolution, comment: string,
    ): Promise<SzDetails> {
        const {data} = await apiClient.post<SzDetails>(
            `${base(szId)}/resolve-test`, {participantId, decision, comment});
        return data;
    },

    /** Резолюция с подписью ЭЦП. Ошибки проверки — { message, code } (например, "document_changed"). */
    async resolve(
        szId: number, participantId: number, decision: SzSignableResolution, comment: string,
        ecp: ResolutionEcpSignature,
    ): Promise<SzDetails> {
        const {data} = await apiClient.post<SzDetails>(`${base(szId)}/resolve`, {
            participantId,
            decision,
            comment,
            signatureBase64: ecp.signatureBase64,
            hash: ecp.hash,
            personIdnp: ecp.personIdnp,
            certToken: ecp.certToken,
            providerTimestampMs: ecp.timestamp,
        });
        return data;
    },
};
