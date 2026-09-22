// Типы для консолидации/актуализации ВНД (POST /vnd/{id}/actualization/publish и связанные)

export type VndActualizationStatus = "active" | "onact" | "review" | "consol" | "arch" | "draft";

export interface PublishVndActualizationRequest {
    /** Прошла ли актуализация с изменениями. Для первой редакции нового ВНД значение
     * не влияет на бизнес-логику (ActualizationResponsibleUserId ещё не выставлен),
     * поэтому можно отправлять true по умолчанию. */
    hadChanges: boolean;

    /** Обязательно, если у ВНД Period === "Custom" и был выбран сдвиг периода актуализации */
    newDueActualizationDate?: string | null; // "YYYY-MM-DD"

    // --- Реквизиты, обязательные к вводу прямо в модалке консолидации (см.
    // ConsolidateVndModal) - бэк отклонит запрос без непустого AdoptionCode.
    /** № принятия */
    adoptionCode: string;
    /** Дата принятия - "YYYY-MM-DD" */
    adoptionDate: string;
    /** Дата вступления в силу - "YYYY-MM-DD" */
    effectiveDate: string;
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

/** Запросить доступ к актуализации у главного редактора (по запросу права). Заявка всегда
 * уходит "с последующим согласованием" - без согласования актуализацию может начать только
 * главный редактор напрямую (см. StartActualizationRequest). Сдвиг срока следующей
 * актуализации заявителем больше не выбирается - это решает исключительно главный редактор
 * при одобрении (см. ActualizationRequestDecisionRequest), поэтому тело запроса пустое. */
export type RequestActualizationAccessRequest = Record<string, never>;

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

    /** Всегда true - заявка "по запросу" всегда требует последующего согласования главным
     * редактором ВНД. */
    requiresApproval: boolean;
    /** До решения по заявке (status === "pending") значение не задано заявителем и не несёт
     * смысла - финальное значение проставляется главным редактором при одобрении, см.
     * ActualizationRequestDecisionRequest.shiftNextPeriod. */
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
    /** Финальное значение сдвига срока — обязательно при approve === true. Решает
     * исключительно главный редактор при одобрении, заявитель это значение не выбирает. */
    shiftNextPeriod?: boolean | null;
}
