import {axiosInstance} from "@/service/axiosInstance.ts";

/**
 * Проверка подлинности согласования ВНД по файлу редакции (POST /api/vnd/authenticity/check).
 * Сервер считает SHA-256 файла и находит редакции, текстом которых он был, и подписи ЭЦП,
 * поставленные именно под этим текстом. Файл нигде не сохраняется.
 */

export type VndAuthenticityDecision =
    "pending" | "approved" | "approved_with_comment" | "rejected" | "auto_approved" | "removed";

export type VndAuthenticityPhase = "primary" | "repeat" | "finalHold";

export type VndAuthenticitySignatureState =
    "signed_this_text" | "signed_other_text" | "auto_initiator" | "auto" | "no_signature" | "pending";

export type VndAuthenticityProcessStatus =
    "primary" | "revision_needed" | "repeated" | "final_hold" | "approved" | "cancelled" | "rejected";

export interface VndAuthenticitySignature {
    id: number;
    stageTitle: string | null;
    phase: VndAuthenticityPhase;
    roundNumber: number;
    decision: VndAuthenticityDecision;
    commentText: string;
    accountFullName: string | null;
    personFio: string | null;
    organizationName: string | null;
    certCommonName: string | null;
    certIssuerCommonName: string | null;
    certValidNotAfter: string | null;
    signedAt: string;
    cmsSigningTime: string | null;
    verified: boolean;
    hashSchemaVersion: string;
    hash: string;
    contentDigest: string;
    vndCode: string;
    signatureSha256: string;
    /** Подпись стоит под загруженным файлом (его SHA-256 входит в отпечаток текста). */
    underThisText: boolean;
}

export interface VndAuthenticityHistoryEntry {
    /** decision — решение согласующего; initiator_comment — комментарий инициатора к исправлениям. */
    kind: "decision" | "initiator_comment";
    phase: VndAuthenticityPhase;
    roundNumber: number;
    at: string | null;
    stageTitle: string | null;
    fullName: string | null;
    position: string | null;
    decision: VndAuthenticityDecision | null;
    comment: string | null;
    signatureState: VndAuthenticitySignatureState | null;
    signature: VndAuthenticitySignature | null;
}

export interface VndAuthenticityApprover {
    stageTitle: string | null;
    fullName: string;
    position: string | null;
    decision: VndAuthenticityDecision;
    phase: VndAuthenticityPhase;
    decidedAt: string | null;
    signatureState: VndAuthenticitySignatureState;
    signatureId: number | null;
}

export interface VndAuthenticityProcess {
    approvalProcessId: number;
    status: VndAuthenticityProcessStatus;
    startedAt: string;
    completedAt: string | null;
    isNoChangesActualization: boolean;
    signedUnderThisText: number;
    approversTotal: number;
    approvers: VndAuthenticityApprover[];
    signatures: VndAuthenticitySignature[];
    history: VndAuthenticityHistoryEntry[];
}

export interface VndAuthenticityRedactionMatch {
    vndId: number;
    vndCode: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    redactionId: number;
    redactionCode: string;
    redactionNumber: number;
    language: "ru" | "kg" | "en";
    isCurrentText: boolean;
    snapshotNumbers: number[];
    processes: VndAuthenticityProcess[];
}

export interface VndAuthenticityCheckResponse {
    fileName: string;
    fileSize: number;
    fileSha256: string;
    hasHiddenMatches: boolean;
    truncated: boolean;
    matches: VndAuthenticityRedactionMatch[];
}

/** Имя файла из Content-Disposition (сначала filename* — RFC 5987, в нём кириллица не искажается). */
function fileNameFrom(disposition: string | undefined): string | null {
    if (!disposition) return null;
    const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (star) return decodeURIComponent(star[1].trim());
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1].trim() : null;
}

class VndAuthenticityService {
    async check(file: File): Promise<VndAuthenticityCheckResponse> {
        const form = new FormData();
        form.append("file", file);
        const {data} = await axiosInstance.post<VndAuthenticityCheckResponse>("/vnd/authenticity/check", form);
        return data;
    }

    /**
     * Скачать файл подписи резолюции для проверки вне системы (нужно право «Экспорт ВНД»):
     * "signature" — CMS-подпись в base64 ({код}-resolution-{id}.sig.b64);
     * "data" — подписанные данные ({код}-resolution-{id}.txt), SHA-256 которых и подписан.
     */
    async downloadSignatureFile(vndId: number, signatureId: number, file: "signature" | "data"): Promise<void> {
        const response = await axiosInstance.get<Blob>(`/vnd/${vndId}/signatures/${signatureId}/download`, {
            params: {file},
            responseType: "blob",
        });
        const name = fileNameFrom(response.headers["content-disposition"] as string | undefined)
            ?? `resolution-${signatureId}${file === "data" ? ".txt" : ".sig.b64"}`;

        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
}

export const vndAuthenticityService = new VndAuthenticityService();
