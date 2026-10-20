import {apiClient} from "@/service/apiClient.ts";
import type {StoredEcpSignature} from "@/service/ecpCredentialService.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";

/** Заявки на замещение (КСЗ-В9). */

export type SubstitutionReason = "Sick" | "Vacation" | "Dismissal" | "Other";
export const REASON_LABEL: Record<SubstitutionReason, string> = {
    Sick: "Больничный", Vacation: "Отпуск", Dismissal: "Увольнение", Other: "Другое",
};

export type HandoverMoment = "EndOfDay" | "StartOfDay";
export const HANDOVER_LABEL: Record<HandoverMoment, string> = {
    EndOfDay: "На конец рабочего дня", StartOfDay: "На начало рабочего дня",
};

export type SubstitutionStatus =
    "Draft" | "OnApproval" | "OnExecution" | "Executed" | "Rejected" | "Withdrawn";
export const STATUS_LABEL: Record<SubstitutionStatus, string> = {
    Draft: "Черновик", OnApproval: "На согласовании", OnExecution: "На подписании",
    Executed: "Исполнено", Rejected: "Отклонено", Withdrawn: "Отозвано",
};

export interface CommissionMember {
    userId?: number | null;
    fullName: string;
    position?: string | null;
}

/** Skipped — очередь до этапа не дошла: круг закончился отклонением или повторной отправкой. */
export type ApprovalState = "Pending" | "Active" | "Approved" | "Rejected" | "Skipped";
export const APPROVAL_STATE_LABEL: Record<ApprovalState, string> = {
    Pending: "Ожидает", Active: "На согласовании", Approved: "Согласовано", Rejected: "Отклонено",
    Skipped: "Не дошла очередь",
};

export interface ApprovalStep {
    id: number;
    /** Круг согласования: 1 — первая отправка, 2 — после отклонения… Действующий — последний. */
    round: number;
    order: number;
    roleLabel: string;
    userId: number;
    userName: string | null;
    state: ApprovalState;
    comment: string | null;
    decidedAt: string | null;
    /** Кто фактически решил — отличается от userId, если решал замещающий (GEN-14). */
    decidedByUserId: number | null;
}

export interface SubstitutionListItem {
    id: number;
    regNumber: string | null;
    status: SubstitutionStatus;
    statusTitle: string;
    subject: string;
    reasonTitle: string;
    absentName: string;
    substituteName: string;
    startsOn: string | null;
    endsOn: string | null;
    initiatorName: string | null;
    /** Автор заявки — кто её создал; неизменяемое поле. */
    authorUserId: number | null;
    authorName: string | null;
    createdAt: string;
}

export interface SubstitutionDetails extends SubstitutionListItem {
    reasonCode: SubstitutionReason;
    initiatorUserId: number;
    absentUserId: number | null;
    absentPosition: string | null;
    absentBranch: string | null;
    absentUnitId: number | null;
    absentUnit: string | null;
    substituteUserId: number | null;
    substitutePosition: string | null;
    substituteBranch: string | null;
    substituteUnitId: number | null;
    substituteUnit: string | null;
    passportSeriesNumber: string | null;
    passportIssuedBy: string | null;
    inn: string | null;
    passportIssuedOn: string | null;
    passportValidUntil: string | null;
    addressRegistration: string | null;
    addressResidence: string | null;
    daysCount: number | null;
    commissionChairUserId: number | null;
    commissionChairName: string | null;
    commissionChairPosition: string | null;
    handoverMoment: HandoverMoment;
    handoverOn: string | null;
    commissionMembers: CommissionMember[];
    description: string | null;
    passportExpiresBeforeEnd: boolean;
    approvals: ApprovalStep[];
    /** За кого текущий пользователь действует по замещению (GEN-14). */
    actingForUserIds?: number[];
    /** id → ФИО тех, кто решал за назначенного на этап (по замещению). */
    deciderNames?: Record<number, string>;
    /** Какие этапы маршрута пропущены, потому что в системе не настроены согласующие. */
    routeNote?: string | null;
    /** Что текущему пользователю можно делать с заявкой (считает сервер). */
    access?: SubstitutionAccess;
}

export interface SubstitutionAccess {
    /** УЧР (кадровик ГО/филиалов из настроек маршрута) или администратор. */
    canManage: boolean;
    isInitiator: boolean;
    canWithdraw: boolean;
    canDelete: boolean;
    /** Отметить «Исполнено» вручную — даже если документы не подписаны. */
    canExecute: boolean;
}

/* ---------- Этап «На подписании»: ЭЦП ГП «Инфоком» под приказом и договором ---------- */

export type SubstitutionDocumentKind = "Order" | "Liability";
export type SubstitutionSignerRole = "Director" | "Absent" | "Substitute";

export interface SubstitutionSignatureInfo {
    id: number;
    userId: number;
    userName: string | null;
    /** За кого подписал (директор в отсутствии — его замещающий). */
    onBehalfOfName: string | null;
    personFio: string | null;
    certIssuerCommonName: string | null;
    certValidNotAfter: string | null;
    hash: string;
    signedAt: string;
    verified: boolean;
    isTest: boolean;
    /** Версия документа, под которой стоит подпись. */
    documentVersion: number;
    /** Место подписи в ЭЦП-версии (после абзаца N); null — в конце текста. */
    placementAnchor: number | null;
    placementIndentMm: number | null;
}

/**
 * Место подписи, выбранное в окне подписания: после абзаца `anchor` текста документа (закладка
 * dsa_N в макете) с отступом `indentMm` от левого поля. В подписываемый хэш не входит.
 */
export interface SubstitutionSignPlacement {
    anchor: number;
    indentMm: number;
}

export interface SubstitutionSignerSlot {
    role: SubstitutionSignerRole;
    roleTitle: string;
    userId: number | null;
    userName: string | null;
    /** Текущий пользователь может поставить эту подпись сейчас. */
    canSign: boolean;
    signature: SubstitutionSignatureInfo | null;
    /** Подпись того же подписанта под прежней версией — неактуальная (документ изменили после подписи). */
    staleSignature: SubstitutionSignatureInfo | null;
    /** Новой подписи нет — на листе подписей ЭЦП место отмечено автосогласованием. */
    autoApproved: boolean;
}

export interface SubstitutionSigningDocument {
    id: number;
    kind: SubstitutionDocumentKind;
    title: string;
    version: number;
    isCurrent: boolean;
    fileName: string;
    contentSha256: string;
    createdAt: string;
    slots: SubstitutionSignerSlot[];
}

export interface SubstitutionSigningState {
    /** Подписи принимаются: «На подписании» или (участникам маршрута) «На согласовании». */
    isOpen: boolean;
    /** Заявка ещё на согласовании: подписать могут только участники маршрута на своём этапе. */
    isApprovalStage: boolean;
    allSigned: boolean;
    /** Сервер разрешает тестовую имитацию ЭЦП (EcpSigning:AllowSubstitutionTestEcp). */
    allowTestEcp: boolean;
    documents: SubstitutionSigningDocument[];
}

export interface SubstitutionSaveRequest {
    initiatorUserId?: number | null;
    subject: string;
    reason: SubstitutionReason;
    absentUserId?: number | null;
    absentName: string;
    absentPosition?: string | null;
    absentBranch?: string | null;
    absentUnitId?: number | null;
    substituteUserId?: number | null;
    substituteName: string;
    substitutePosition?: string | null;
    substituteBranch?: string | null;
    substituteUnitId?: number | null;
    passportSeriesNumber?: string | null;
    passportIssuedBy?: string | null;
    inn?: string | null;
    passportIssuedOn?: string | null;
    passportValidUntil?: string | null;
    addressRegistration?: string | null;
    addressResidence?: string | null;
    daysCount?: number | null;
    startsOn?: string | null;
    endsOn?: string | null;
    commissionChairUserId?: number | null;
    commissionChairName?: string | null;
    commissionChairPosition?: string | null;
    handoverMoment: HandoverMoment;
    handoverOn?: string | null;
    commissionMembers: CommissionMember[];
    description?: string | null;
}

export interface SubstitutionPage {
    items: SubstitutionListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface SubstitutionSearchParams {
    query?: string;
    status?: string;
    mineOnly?: boolean;
    /** Отсутствующий (id пользователя). */
    absentUserId?: number;
    /** Замещающий (id пользователя). */
    substituteUserId?: number;
    /** Автор заявки (id пользователя). */
    authorUserId?: number;
    /** Период "yyyy-MM-dd": заявки, чей период замещения пересекается с заданным (границы включительно). */
    periodFrom?: string;
    periodTo?: string;
    page?: number;
    pageSize?: number;
}

const BASE = "/substitution-requests";

export const substitutionService = {
    async search(params: SubstitutionSearchParams = {}) {
        const {data} = await apiClient.get<SubstitutionPage>(BASE, {params});
        return data;
    },
    async get(id: number) {
        const {data} = await apiClient.get<SubstitutionDetails>(`${BASE}/${id}`);
        return data;
    },
    async create(request: SubstitutionSaveRequest) {
        const {data} = await apiClient.post<SubstitutionDetails>(BASE, request);
        return data;
    },
    async update(id: number, request: SubstitutionSaveRequest) {
        const {data} = await apiClient.put<SubstitutionDetails>(`${BASE}/${id}`, request);
        return data;
    },
    async submit(id: number) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/submit`);
        return data;
    },
    async approve(id: number, comment?: string) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/approve`, {comment});
        return data;
    },
    /** Переназначить непройденный этап действующего маршрута (УЧР, администратор). */
    async reassign(id: number, approvalId: number, userId: number, reason: string) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/approvals/${approvalId}/reassign`, {userId, reason});
        return data;
    },

    /** Причина обязательна — без неё сервер отклонение не примет. */
    async reject(id: number, comment: string) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/reject`, {comment});
        return data;
    },
    async execute(id: number) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/execute`);
        return data;
    },
    async withdraw(id: number) {
        const {data} = await apiClient.post<SubstitutionDetails>(`${BASE}/${id}/withdraw`);
        return data;
    },
    async remove(id: number) {
        await apiClient.delete(`${BASE}/${id}`);
    },

    /** Может ли текущий пользователь вести все заявки (УЧР, администратор). */
    async access() {
        const {data} = await apiClient.get<{canManage: boolean}>(`${BASE}/access`);
        return data;
    },

    signingState(id: number) {
        return apiClient.get<SubstitutionSigningState>(`${BASE}/${id}/signing`).then(r => r.data);
    },
    async signingHash(id: number, documentId: number, role: SubstitutionSignerRole) {
        const {data} = await apiClient.post<{hash: string; schemaVersion: string}>(
            `${BASE}/${id}/signing/hash`, {documentId, role});
        return data.hash;
    },
    async signStored(id: number, documentId: number, role: SubstitutionSignerRole): Promise<StoredEcpSignature> {
        const {data} = await apiClient.post<StoredEcpSignature>(
            `${BASE}/${id}/signing/sign-stored`, {documentId, role});
        return data;
    },
    /** Подпись ЭЦП. Ошибки проверки — { message, code } (например, "document_changed"). */
    async sign(id: number, documentId: number, role: SubstitutionSignerRole, ecp: ResolutionEcpSignature,
               placement?: SubstitutionSignPlacement | null) {
        const {data} = await apiClient.post<SubstitutionSigningState>(`${BASE}/${id}/signing/sign`, {
            documentId,
            role,
            placement: placement ?? null,
            signatureBase64: ecp.signatureBase64,
            hash: ecp.hash,
            personIdnp: ecp.personIdnp,
            certToken: ecp.certToken,
            providerTimestampMs: ecp.timestamp,
        });
        return data;
    },
    /** ТЕСТ: имитация ЭЦП — только если сервер разрешает (allowTestEcp). */
    async signTest(id: number, documentId: number, role: SubstitutionSignerRole, placement?: SubstitutionSignPlacement | null) {
        const {data} = await apiClient.post<SubstitutionSigningState>(
            `${BASE}/${id}/signing/sign-test`, {documentId, role, placement: placement ?? null});
        return data;
    },
    /** Макет ЭЦП-версии для окна выбора места подписи: поставленные подписи и якоря dsa_N на абзацах. */
    async signingLayoutBlob(id: number, documentId: number): Promise<Blob> {
        const response = await apiClient.get(`${BASE}/${id}/signing/documents/${documentId}/layout`, {responseType: "blob"});
        return response.data as Blob;
    },
    /** Зафиксированный документ: signed=false — как есть, signed=true — с листом подписей ЭЦП. */
    async downloadSigningDocument(id: number, documentId: number, signed: boolean, fileName: string) {
        const response = await apiClient.get(`${BASE}/${id}/signing/documents/${documentId}`,
            {params: {signed}, responseType: "blob"});
        saveBlob(response.data as Blob, fileName);
    },

    /** Скачать печатную форму: form = "order" (приказ) или "liability" (договор МО). */
    async print(id: number, form: "order" | "liability" | "card", fileName: string) {
        const response = await apiClient.get(`${BASE}/${id}/print/${form}`, {responseType: "blob"});
        saveBlob(response.data as Blob, fileName);
    },

    /**
     * Документ для страницы «Скачать / печать» (как у СЗ): signed=true — действующая версия с листом
     * подписей ЭЦП, signed=false — для подписи от руки. Пока документы не зафиксированы (черновик) —
     * форма по текущим данным заявки.
     */
    async printBlob(id: number, form: SubstitutionPrintForm, signed: boolean): Promise<Blob> {
        const response = await apiClient.get(`${BASE}/${id}/print/${form}`, {params: {signed}, responseType: "blob"});
        return response.data as Blob;
    },
};

export type SubstitutionPrintForm = "order" | "liability";
export type SubstitutionPrintMode = "signed" | "paper";

/** Адрес страницы «Скачать / печать» документа заявки (открывается в новой вкладке, без меню). */
export function substitutionPrintUrl(id: number, form: SubstitutionPrintForm, mode: SubstitutionPrintMode = "signed") {
    return `/substitutions/${id}/print/${form}?mode=${mode}`;
}

export function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
