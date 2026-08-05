// Типы для консолидации/актуализации ВНД (POST /vnd/{id}/actualization/publish и связанные)

export type VndActualizationStatus = "active" | "onact" | "review" | "consol" | "arch" | "draft";

export interface PublishVndActualizationRequest {
    /** Прошла ли актуализация с изменениями. Для первой редакции нового ВНД значение
     * не влияет на бизнес-логику (ActualizationResponsibleUserId ещё не выставлен),
     * поэтому можно отправлять true по умолчанию. */
    hadChanges: boolean;

    /** Обязательно, если у ВНД Period === "Custom" и был выбран сдвиг периода актуализации */
    newDueActualizationDate?: string | null; // "YYYY-MM-DD"
}

export interface VndActualizationStateResponse {
    vndId: number;
    status: VndActualizationStatus;
    actualizationResponsibleUserId: number | null;
    actualizationResponsibleUserName: string | null;
    actualizationRequiresApproval: boolean;
    actualizationShiftNextPeriod: boolean;
    dueActualizationDate: string | null;
    lastActualizationDate: string | null;
}

/** Сразу начать актуализацию (для ActualizeAnyVndWithApproval/WithoutApproval) */
export interface StartActualizationRequest {
    /** Ответственный за актуализацию. Если не указан — берётся текущий пользователь */
    responsibleUserId?: number | null;
    /** Сдвигать ли DueActualizationDate после публикации */
    shiftNextPeriod: boolean;
    /** Актуализировать с согласованием или без */
    requiresApproval: boolean;
}

/** Запросить доступ к актуализации у главного редактора (по запросу права) */
export interface RequestActualizationAccessRequest {
    requiresApproval: boolean;
}

/** Подтвердить старт актуализации после одобренной заявки */
export interface ConfirmActualizationStartRequest {
    shiftNextPeriod: boolean;
}

export type ActualizationAccessStatus = "pending" | "approved" | "rejected";

export interface VndActualizationRequestResponse {
    id: number;
    vndId: number;
    vndCode: string;
    vndTitle: string;

    requestedByUserId: number;
    requestedByName: string;

    requiresApproval: boolean;
    status: ActualizationAccessStatus;

    decidedByUserId: number | null;
    decidedByName: string | null;
    decidedAt: string | null;

    createdAt: string;
}

export interface ActualizationRequestDecisionRequest {
    approve: boolean;
}
