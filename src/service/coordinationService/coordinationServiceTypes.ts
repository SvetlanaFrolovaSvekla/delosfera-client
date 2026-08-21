export type ApprovalProcessStatus =
    | "primary"  // первичное согласование в процессе
    | "revision_needed" // на доработке - есть замечания/отклонения
    | "repeated" // повторное согласование (только по замечаниям)
    | "final_hold" // финальная выдержка (теперь тоже может быть с замечанием)
    | "approved"  // завершено, ВНД стал действующим
    | "cancelled" // отозван инициатором (на будущее, пока логики нет) // TODO: Пока логику не добавила
    | "rejected"; // Отклонен

export type ApprovalStageKindResponse =
    | "legal" // Юристы
    | "risk_management" // Риск-менеджеры
    | "compliance" // Комплаенс
    | "custom" // Доп. участник
    | "methodology"; // Методология

export type ApprovalStageDecisionResponse =
    | "pending"  // в ожидании
    | "approved" // согласовано
    | "approved_with_comment" // отправлено на устранение замечаний
    | "rejected" // отклонено
    | "auto_approved_timeout"; // просрочка - засчитано как согласование

// ===== Request enums (то, что реально можно ОТПРАВИТЬ на бэк - уже, чем response-типы) =====
export const ApprovalStageKind = {
    Legal: "Legal",
    RiskManagement: "RiskManagement",
    Compliance: "Compliance",
    Custom: "Custom",
    Methodology: "Methodology",
} as const;

export type ApprovalStageKind = (typeof ApprovalStageKind)[keyof typeof ApprovalStageKind];

export const ApprovalDecisionType = {
    Approve: "Approve",
    ApproveWithComment: "ApproveWithComment",
    Reject: "Reject",
} as const;

export type ApprovalDecisionType = (typeof ApprovalDecisionType)[keyof typeof ApprovalDecisionType];

export interface ApprovalStageRequest {
    kind: ApprovalStageKind; // Тип участника согласования
    approverUserId: number; // id согласующего пользователя
}

export interface StartApprovalRequest {
    stages: ApprovalStageRequest[];  // Список этапов согласования
    primaryDeadlineMinutes: number; // Норматив первичного согласования, в минутах
    repeatDeadlineMinutes: number; // Норматив согласования после исправленных замечаний, в минутах
    finalHoldDeadlineMinutes: number; // Норматив финальной выдержки, в минутах
}

export interface ApprovalDecisionRequest {
    decision: ApprovalDecisionType; // Решение, резолюция
    /** Обязателен для ApproveWithComment и Reject */
    comment?: string; // Комментарий к решению
}

export interface ResubmitAfterRevisionRequest {
    docRu?: File;
    docKg?: File;
    docEn?: File;
    /** Таблица изменений и дополнений (ТИД) — обязателен, если у редакции при первичной подаче
     * уже был обязателен ТИД (т.е. редакция не первая для этого ВНД, см. redaction.number > 1).
     * Прикладывается заново на каждый круг доработки вместе с обновлённой редакцией. */
    tid?: File;
    /** Комментарий инициатора о внесённых исправлениях */
    comment?: string;
    /** Согласен ли инициатор со всеми замечаниями.
     * false → нужна заполненная матрица разногласий, повторное согласование
     * пропускается, процесс сразу переходит на финальную выдержку. */
    agreesWithAllRemarks: boolean;
}

export interface AddDisagreementMatrixRowRequest {
    developerPosition: string; // Редакция (позиция) разработчика
    opponentPosition: string; // Редакция и комментарий оппонента
    developerJustification?: string; // Комментарий (обоснование) разработчика
}

// ===== Response DTOs =====

export interface DisagreementMatrixRowResponse {
    id: number;
    developerPosition: string;
    opponentPosition: string;
    developerJustification: string | null;
    createdAt: string;
}

export interface ApprovalStageResponse {
    id: number;
    order: number;
    kind: ApprovalStageKindResponse;
    orgUnitId: number;
    orgUnitName: string;
    approverUserId: number;
    approverName: string;
    primaryDecision: ApprovalStageDecisionResponse;
    primaryComment: string | null;
    primaryDecidedAt: string | null;
    participatesInRepeat: boolean;
    repeatDecision: ApprovalStageDecisionResponse | null;
    repeatComment: string | null;
    repeatDecidedAt: string | null;
    finalHoldDecision: ApprovalStageDecisionResponse | null;
    finalHoldComment: string | null;
    finalHoldDecidedAt: string | null;
}

export interface ApprovalProcessResponse {
    id: number;
    vndId: number;
    redactionId: number;
    initiatorUserId: number;
    initiatorName: string;
    /** Должность инициатора согласования */
    initiatorPosition?: string;
    status: ApprovalProcessStatus;
    primaryDeadlineMinutes: number;
    repeatDeadlineMinutes: number;
    finalHoldDeadlineMinutes: number;
    primaryStartedAt: string;
    primaryDeadlineAt: string;
    repeatStartedAt: string | null;
    repeatDeadlineAt: string | null;
    /** Комментарий инициатора при повторной отправке на согласование */
    repeatInitiatorComment: string | null;
    finalHoldStartedAt: string | null;
    finalHoldDeadlineAt: string | null;
    completedAt: string | null;
    disagreementMatrixRows: DisagreementMatrixRowResponse[];
    stages: ApprovalStageResponse[];
    createdAt: string;
    updatedAt: string;
}