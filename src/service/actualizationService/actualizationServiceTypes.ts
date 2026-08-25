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
    actualizationPlannedNoChanges: boolean;
    /** Пройден ли шаг "Выполнить актуализацию" — пока false, shiftNextPeriod/plannedNoChanges
     * выше ещё не окончательные, и загрузка новой редакции заблокирована. */
    actualizationPerformed: boolean;
    dueActualizationDate: string | null;
    lastActualizationDate: string | null;
}

/** Шаг А: сразу начать актуализацию (для ActualizeAnyVndWithApproval/WithoutApproval) — только
 * переводит документ в "На актуализации" и фиксирует ответственного/порядок. Сдвиг срока и
 * "без изменений" решаются отдельно, позже, шагом "Выполнить актуализацию" (см. PerformActualizationRequest). */
export interface StartActualizationRequest {
    /** Ответственный за актуализацию. Если не указан — берётся текущий пользователь */
    responsibleUserId?: number | null;
    /** Актуализировать с согласованием или без */
    requiresApproval: boolean;
}

/** Шаг Б (для цикла, начатого через StartActualizationRequest): выполнить актуализацию —
 * зафиксировать финальные сдвиг срока/"без изменений". До этого шага загрузка новой редакции
 * заблокирована. */
export interface PerformActualizationRequest {
    /** Сдвигать ли DueActualizationDate после публикации текущего цикла */
    shiftNextPeriod: boolean;
    /** Планируется ли актуализация без изменений документа */
    plannedNoChanges: boolean;
}

/** Запросить доступ к актуализации у главного редактора (по запросу права) */
export interface RequestActualizationAccessRequest {
    requiresApproval: boolean;
    /** Личное пожелание заявителя насчёт сдвига срока следующей актуализации — главный
     * редактор увидит его при рассмотрении заявки и сможет скорректировать. */
    shiftNextPeriod: boolean;
}

/** Подтвердить старт актуализации после одобренной заявки — совмещает старт цикла и шаг
 * "Выполнить актуализацию" (единственная кнопка для пути "по заявке"). Сдвиг срока сюда уже не
 * передаём — берётся из одобренной заявки (см. VndActualizationRequestResponse.shiftNextPeriod). */
export interface ConfirmActualizationStartRequest {
    /** Планируется ли актуализация без изменений документа */
    plannedNoChanges: boolean;
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
    /** Пожелание заявителя о сдвиге срока — после одобрения может быть заменено на финальное
     * значение, скорректированное главным редактором. */
    shiftNextPeriod: boolean;
    status: ActualizationAccessStatus;

    decidedByUserId: number | null;
    decidedByName: string | null;
    decidedAt: string | null;

    /** Момент, когда одобренная заявка была фактически использована для старта цикла
     * актуализации. Null, пока заявка не одобрена или одобрена, но ещё не использована. */
    consumedAt: string | null;

    createdAt: string;
}

export interface ActualizationRequestDecisionRequest {
    approve: boolean;
    /** Финальное значение сдвига срока — обязательно при approve === true. По умолчанию на
     * фронте предзаполняется тем, что выбрал сам заявитель, но главный редактор может изменить. */
    shiftNextPeriod?: boolean | null;
}
