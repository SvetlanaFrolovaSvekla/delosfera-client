import {apiClient} from "@/service/apiClient.ts";

export type RouteStatus =
    | "Draft" | "Running" | "OnRevision" | "Approved" | "Rejected" | "Interrupted" | "Arbitration";

export type ParticipantState = "Pending" | "Active" | "Done" | "Cancelled";

export type ResolutionType = "Approved" | "ApprovedWithRemarks" | "Rejected" | "Veto";

export interface Remark {
    id: number;
    text: string;
    state: "Open" | "Resolved";
}

export interface Resolution {
    type: ResolutionType;
    comment: string | null;
    remarks: Remark[];

    /** Подпись под резолюцией — реквизиты для штампа. */
    signature: SignatureStamp | null;
}

/**
 * Штамп подписи. Реквизиты приходят с сервера такими, какими были в момент
 * подписания: должность подписанта может смениться, штамп меняться не должен.
 */
export interface SignatureStamp {
    id: number;
    levelTitle: string;
    fullName: string | null;
    position: string | null;
    at: string;

    /** Начало отпечатка подписанного — для сверки. */
    fingerprint: string | null;

    revoked: boolean;
    revokedReason: string | null;

    /**
     * Время, удостоверённое службой меток. Отличается от at тем, что его назвал не
     * наш сервер: именно оно доказывает, что подпись поставлена, пока сертификат
     * действовал. Пусто — метки нет.
     */
    timestampedAt: string | null;

    timestampAuthority: string | null;

    /** Каким удостоверяющим центром подтверждён сертификат подписанта. */
    trustAuthority: string | null;

    /** Что в подписи осталось непроверенным: цепочка, отзыв, метка. */
    caveats: string[];
}

export interface RouteParticipant {
    id: number;
    userId: number | null;
    /** ФИО с сервера — справочник пользователей доступен не каждой роли. */
    userFullName: string | null;
    required: boolean;
    state: ParticipantState;
    resolution: Resolution | null;
}

export interface RouteStep {
    id: number;
    order: number;
    mode: string;
    kind: string;
    isFinalMethodology: boolean;

    /**
     * Чем закрывается этап. Пусто — подписи не требуется; «Simple» ставится самим
     * нажатием кнопки; «Qualified» требует криптопровайдера на рабочем месте, и
     * тогда решению предшествует подписание.
     */
    requiredSignatureLevel: "Simple" | "Qualified" | null;

    participants: RouteParticipant[];
}

export interface RouteInstance {
    id: number;
    documentId: number;
    status: RouteStatus;
    currentStepOrder: number;
    steps: RouteStep[];
}

export const RESOLUTION_LABEL: Record<ResolutionType, string> = {
    Approved: "Согласовано",
    ApprovedWithRemarks: "Согласовано с замечаниями",
    Rejected: "Отклонено",
    Veto: "Вето",
};

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
    Draft: "Черновик маршрута",
    Running: "Идёт согласование",
    OnRevision: "На доработке у инициатора",
    Approved: "Согласовано",
    Rejected: "Отклонено",
    Interrupted: "Прерван",
    Arbitration: "Арбитраж",
};

export const PARTICIPANT_STATE_LABEL: Record<ParticipantState, string> = {
    Pending: "Ожидает очереди",
    Active: "Ждёт решения",
    Done: "Решение принято",
    Cancelled: "Аннулировано",
};

const BASE = "/workflow";

export const workflowService = {
    async instance(id: number): Promise<RouteInstance> {
        const {data} = await apiClient.get<RouteInstance>(`${BASE}/instances/${id}`);
        return data;
    },

    /** Резолюция участника: согласовано / с замечаниями / отклонить / вето. */
    /**
     * signatureId прикладывается, когда этап закрывается квалифицированной подписью:
     * её ставят до решения, отдельным действием с криптопровайдером. Для простой
     * подписи он не нужен — её создаёт сам сервер в момент решения.
     */
    async resolve(
        participantId: number, type: ResolutionType, comment?: string, signatureId?: number,
    ): Promise<void> {
        await apiClient.post(`${BASE}/participants/${participantId}/resolve`, {type, comment, signatureId});
    },

    /** Инициатор подтверждает, что замечание устранено — маршрут продолжится с того же этапа. */
    async confirmRemark(remarkId: number): Promise<void> {
        await apiClient.post(`${BASE}/remarks/${remarkId}/confirm`);
    },
};
