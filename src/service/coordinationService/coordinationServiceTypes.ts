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

/** Согласен ли инициатор со всеми замечаниями (см. ResubmitAfterRevisionRequest.remarksAgreement).
 * FullyAgree - обычное повторное согласование. PartiallyAgree/FullyDisagree - нужна заполненная
 * матрица разногласий, повторное согласование пропускается, сразу финальная выдержка (маршрут
 * одинаковый для обоих - разница только в том, что при PartiallyAgree редакция ещё и обновляется). */
export const RemarksAgreement = {
    FullyAgree: "FullyAgree",
    PartiallyAgree: "PartiallyAgree",
    FullyDisagree: "FullyDisagree",
} as const;

export type RemarksAgreement = (typeof RemarksAgreement)[keyof typeof RemarksAgreement];

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
    /** Файлы, приложенные согласующим к своей резолюции (необязательно). Хранятся бессрочно,
     * наравне с текстом комментария — остаются частью истории согласования и после того,
     * как редакция станет согласованной. */
    files?: File[];
    /** Цитаты из текста редакции, на которые согласующий сослался в comment (см.
     * "+ Сослаться на текст редакции"). Хранятся бессрочно вместе с резолюцией и используются
     * для подсветки маркеров в тексте редакции — см. ApprovalStageQuoteResponse. */
    quotes?: ApprovalQuoteItem[];
}

/** Один элемент quotes в ApprovalDecisionRequest. */
export interface ApprovalQuoteItem {
    /** "ru"/"kg"/"en"/"tid"/"approvalSheet"/"disagreementMatrix" — см. RedactionViewTarget. */
    documentTarget: string;
    text: string;
}

export interface ResubmitAfterRevisionRequest {
    docRu?: File;
    docKg?: File;
    docEn?: File;
    /** Убрать документ на кыргызском без замены (игнорируется, если передан docKg) */
    removeDocKg?: boolean;
    /** Убрать документ на английском без замены (игнорируется, если передан docEn) */
    removeDocEn?: boolean;
    /** Таблица изменений и дополнений (ТИД) — обязателен, если у редакции при первичной подаче
     * уже был обязателен ТИД (т.е. редакция не первая для этого ВНД, см. redaction.number > 1).
     * Прикладывается заново на каждый круг доработки вместе с обновлённой редакцией. */
    tid?: File;
    /** Новые вложения, добавляемые к редакции вместе с исправлениями */
    newAttachments?: File[];
    /** Id файлов существующих вложений редакции, которые нужно удалить */
    removedAttachmentFileIds?: number[];
    /** Комментарий инициатора о внесённых исправлениях */
    comment?: string;
    /** Файлы, приложенные к комментарию о внесённых исправлениях (необязательно). Полностью
     * заменяют предыдущий набор вложений — актуальны только для последней отправки. */
    commentAttachments?: File[];
    /** Согласен ли инициатор со всеми замечаниями - см. RemarksAgreement. */
    remarksAgreement: RemarksAgreement;
    /** Матрица разногласий - .docx-файл, обязателен, если remarksAgreement !== "FullyAgree".
     * Либо сформирован на клиенте по строкам матрицы (см. docxDisagreementMatrixExport.ts),
     * либо загружен инициатором готовым файлом - выбор способа см. в компоненте-обёртке с
     * радио-кнопками поверх DisagreementMatrixTable. */
    disagreementMatrix?: File;
}

export interface AddDisagreementMatrixRowRequest {
    developerPosition: string; // Редакция (позиция) разработчика - HTML (см. RichDiffEditor)
    opponentPosition: string; // Редакция и комментарий оппонента - HTML
    developerJustification?: string; // Комментарий (обоснование) разработчика - HTML
}

export interface UpdateDisagreementMatrixRowRequest {
    developerPosition: string;
    opponentPosition: string;
    developerJustification?: string;
}

// ===== Response DTOs =====

export interface DisagreementMatrixRowResponse {
    id: number;
    /** HTML - см. RichDiffEditor (текст с выделением красным/зелёным/чёрным) */
    developerPosition: string;
    opponentPosition: string;
    developerJustification: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Файл, приложенный согласующим к резолюции. Остаётся доступен и после того, как редакция
 * станет согласованной — часть истории согласования наравне с текстом резолюции. */
export interface ApprovalStageAttachmentResponse {
    id: number;
    fileId: number;
    fileName: string;
    sizeBytes: number;
}

/** Цитата из текста редакции, на которую согласующий сослался в резолюции — маркер для
 * подсветки в тексте (см. useDocxQuoteMarks). Отдельного комментария к цитате нет — по клику
 * на маркер показывается вся резолюция фазы (primary/repeat/finalHoldComment), в которую эта
 * цитата попадает. */
export interface ApprovalStageQuoteResponse {
    id: number;
    /** "ru"/"kg"/"en"/"tid"/"approvalSheet"/"disagreementMatrix" — см. RedactionViewTarget. */
    documentTarget: string;
    text: string;
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
    primaryAttachments: ApprovalStageAttachmentResponse[];
    primaryQuotes: ApprovalStageQuoteResponse[];
    participatesInRepeat: boolean;
    repeatDecision: ApprovalStageDecisionResponse | null;
    repeatComment: string | null;
    repeatDecidedAt: string | null;
    repeatAttachments: ApprovalStageAttachmentResponse[];
    repeatQuotes: ApprovalStageQuoteResponse[];
    finalHoldDecision: ApprovalStageDecisionResponse | null;
    finalHoldComment: string | null;
    finalHoldDecidedAt: string | null;
    finalHoldAttachments: ApprovalStageAttachmentResponse[];
    finalHoldQuotes: ApprovalStageQuoteResponse[];
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
    /** Файлы, приложенные инициатором к repeatInitiatorComment. Остаются доступны и после
     * согласования редакции — часть истории согласования. */
    repeatInitiatorCommentAttachments: ApprovalStageAttachmentResponse[];
    finalHoldStartedAt: string | null;
    finalHoldDeadlineAt: string | null;
    completedAt: string | null;
    disagreementMatrixRows: DisagreementMatrixRowResponse[];
    stages: ApprovalStageResponse[];
    createdAt: string;
    updatedAt: string;
}