export type VndStatusKey = "draft" | "active" | "onact" | "review" | "consol" | "arch";

export type RedactionApprovalStatus = "NotRequired" | "Draft" | "Pending" | "Approved" | "Rejected";

// --- Статус срока актуализации (вычисляется на бэке от dueActualizationDate) ---
export type ActualizationBucketKey = "normal" | "approaching" | "critical" | "overdue";

export interface DateRangeFilter {
    exact?: string | null;
    from?: string | null;
    to?: string | null;
}

// --- Период актуализации (для создания) ---
export type ActualizationPeriod =
    | "Quarterly"   // 3 месяца
    | "HalfYear"    // 6 месяцев
    | "Annual"      // 12 месяцев
    | "Biennial"    // 24 месяца
    | "Triennial"   // 36 месяцев
    | "Custom";     // явная дата dueActualizationDate


// --- Обновление реквизитов ---
export interface UpdateVndRequisitesRequest {
    /** Какую редакцию редактируем (вкладки Р1/Р2/.../Рn на вкладке "Реквизиты") — если не
     * передать, бэк сам возьмёт текущую/последнюю редакцию. titleRu/En/Kg и typeId общие
     * на весь документ и от этого поля не зависят. */
    redactionId?: number | null;
    typeId: number;
    organId: number;
    developerId?: number | null;
    curatorDeveloperId?: number | null;
    responsibleExecutorIds?: number[];

    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;

    adoptionDate?: string | null;
    adoptionCode?: string | null;
    effectiveDate?: string | null;

    dueActualizationDate?: string | null;
    lastActualizationDate?: string | null;
    lastActualizationHadChanges?: boolean;

    cancelDate?: string | null;
    cancelCode?: string | null;
    cancelReason?: string | null;
    archivedDate?: string | null;
    daysInArchive?: number | null;

    keywordIds?: number[];
    rubricIds?: number[];
    secrecyLevelId?: number | null;
    userGroupIds?: number[];
}

// --- Запрос на поиск ---
export interface VndSearchRequest {
    code?: string;
    name?: string;
    revisionText?: string;

    statuses?: VndStatusKey[];
    typeIds?: number[];
    organIds?: number[];
    developerIds?: number[];
    responsibleExecutorIds?: number[];
    keywordIds?: number[];
    rubricIds?: number[];
    secrecyLevelIds?: number[];
    userGroupIds?: number[];

    /** Фильтр по инициатору (пользователь, создавший документ) */
    createdByUserIds?: number[];

    /** Фильтр по статусу срока актуализации. Пусто = без фильтра
     * (включая документы без даты актуализации). */
    actualizationBuckets?: ActualizationBucketKey[];

    adoptionDate?: DateRangeFilter | null;
    adoptionCode?: string;
    effectiveDate?: DateRangeFilter | null;
    requisitesChangedDate?: DateRangeFilter | null;
    revisionChangedDate?: DateRangeFilter | null;
    cancelDate?: DateRangeFilter | null;
    cancelCode?: string;
    dueActualizationDate?: DateRangeFilter | null;
    lastActualizationDate?: DateRangeFilter | null;
    archivedDate?: DateRangeFilter | null;

    /** Только ВНД, где текущий пользователь — инициатор, согласующий, либо
     * ответственный за актуализацию/консолидацию */
    linkedToMeOnly?: boolean;

    /** Какие именно виды связи учитывать при linkedToMeOnly (LinkedToMeRelationKey[]).
     * Пусто/не задано при linkedToMeOnly=true — не совпадёт ни с чем (фронт всегда
     * передаёт явный список, по умолчанию — все виды связи). */
    linkedToMeRelations?: string[];

    /** Для вкладки "Черновики": "mine" — только свои, "others" — черновики других
     * пользователей (требует право ViewOtherUsersDrafts) */
    draftOwnerScope?: "mine" | "others";
}

// --- Запрос на создание ---
export interface CreateVndRequest {
    typeId: number;
    organId: number;

    /** Разработчик (СП). Если не указан — берётся подразделение текущего пользователя */
    developerId?: number | null;

    /** Куратор разработчика. Если не указан — берётся куратор подразделения-разработчика */
    curatorDeveloperId?: number | null;

    /** Ответственные исполнители (СП). Если пусто — по умолчанию само подразделение-разработчик */
    responsibleExecutorIds?: number[];

    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;

    keywordIds?: number[];
    rubricIds?: number[];
    secrecyLevelId?: number | null;
    userGroupIds?: number[];

    period: ActualizationPeriod;

    /** Обязательно, если period === "Custom" */
    dueActualizationDate?: string | null; // "YYYY-MM-DD"
}

// --- Ответ (GET /vnd/{id}, элементы массива из POST /vnd/search, и результат POST /vnd) ---
export interface VndResponse {
    id: number;
    code: string;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    status: VndStatusKey;

    typeId: number;
    typeName: string;

    developerId: number;
    developerName: string;
    curatorDeveloperId: number | null;
    curatorDeveloperName: string | null;

    organId: number;
    organName: string;

    responsibleExecutorIds: number[];

    /** Инициатор — пользователь, создавший документ. Только для отображения, не редактируется. */
    createdByUserId: number | null;
    createdByUserName: string | null;

    /** Ответственный за текущий/последний цикл актуализации. Только для отображения, не редактируется. */
    actualizationResponsibleUserId: number | null;
    actualizationResponsibleUserName: string | null;

    /** Требуется ли согласование в ТЕКУЩЕМ цикле актуализации — заполнено, только пока
     * документ в OnActualization/Review/Consolidation в рамках этого цикла. */
    actualizationRequiresApproval: boolean;
    /** Заявлено ли, что текущий цикл актуализации пройдёт без изменений документа. */
    actualizationPlannedNoChanges: boolean;
    /** Сдвигать ли DueActualizationDate после публикации текущего цикла — зафиксировано на шаге
     * "Выполнить актуализацию". Пока этот шаг не пройден, значение ещё не окончательное. */
    actualizationShiftNextPeriod: boolean;
    /** Пройден ли шаг "Выполнить актуализацию" в текущем открытом цикле — пока false, загрузка
     * новой редакции заблокирована, и должна показываться кнопка "Выполнить актуализацию" вместо
     * загрузки/согласования. */
    actualizationPerformed: boolean;

    // --- Даты
    adoptionDate: string | null; // "YYYY-MM-DD"
    adoptionCode: string | null;
    effectiveDate: string | null;
    requisitesChangedDate: string | null;
    revisionChangedDate: string | null;
    cancelDate: string | null;
    cancelCode: string | null;
    cancelReason: string | null;
    archivedDate: string | null;
    dueActualizationDate: string | null;
    lastActualizationDate: string | null;
    lastActualizationHadChanges: boolean;
    daysInArchive: number;

    /** "normal" | "approaching" | "critical" | "overdue" | null (нет даты актуализации) */
    actualizationBucket: ActualizationBucketKey | null;

    keywordIds: number[];
    rubricIds: number[];
    secrecyLevelId: number;
    userGroupIds: number[];

    redactionIds: number[];

    createdAt: string; // ISO datetime
    updatedAt: string;

    /** Виды связи текущего пользователя с этим документом (LinkedToMeRelationKey[]) —
     * заполнено только когда поиск шёл с linkedToMeOnly=true, иначе пустой массив */
    linkedToMeRelations: string[];
}

// --- Редакции
export interface VndRedactionResponse {
    id: number;
    code: string;
    number: number;
    description?: string | null;
    isCurrent: boolean;

    docFileRuId: number;
    docFileKgId: number | null;
    docFileEnId: number | null;

    /** Когда документ на соответствующем языке в последний раз заменялся файлом (напр. при
     * повторной отправке после замечаний) — null, если это исходный файл редакции, ни разу
     * не заменявшийся. Используется для метки "Обновлено, дата" (см. RedactionDocumentsPanel). */
    docRuUpdatedAt: string | null;
    docKgUpdatedAt: string | null;
    docEnUpdatedAt: string | null;

    /** Таблица изменений и дополнений (ТИД) — null, если для этой редакции ТИД не требовался
     * (это первая редакция документа, number === 1) */
    tidFileId: number | null;

    /** Лист согласования — формируется автоматически, когда согласование редакции окончательно
     * завершается. Null, пока редакция не согласована. Показывается отдельным блоком
     * "Специальные вложения" (см. RedactionDocumentsPanel). */
    approvalSheetFileId: number | null;

    /** Матрица разногласий - null, пока инициатор не отправил редакцию с несогласием (частичным
     * или полным) по замечаниям. Показывается в "Специальные вложения" (см. RedactionDocumentsPanel). */
    disagreementMatrixFileId: number | null;

    requiresApproval: boolean;
    approvalStatus: RedactionApprovalStatus;

    /** @deprecated Оставлено для обратной совместимости — используйте attachments (там есть
     * настоящее имя файла, как при загрузке, а не "Вложение #id"). */
    attachmentFileIds: number[];
    attachments: VndRedactionAttachmentResponse[];

    // --- Реквизиты ИМЕННО этой редакции (см. миграцию "реквизиты по редакции") — используются
    // для вкладок Р1/Р2/.../Рn на вкладке "Реквизиты" и для подсветки изменений по сравнению
    // с предыдущей редакцией.
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    typeId: number;
    typeName: string;

    adoptionDate: string | null;
    adoptionCode: string | null;
    effectiveDate: string | null;
    period: ActualizationPeriod;

    developerId: number;
    developerName: string;
    curatorDeveloperId: number | null;
    curatorDeveloperName: string | null;

    organId: number;
    organName: string;

    secrecyLevelId: number;

    responsibleExecutorIds: number[];
    keywordIds: number[];
    rubricIds: number[];

    createdAt: string; // ISO datetime
}

/** Прочее вложение редакции — с оригинальным именем файла, под которым его загрузили. */
export interface VndRedactionAttachmentResponse {
    fileId: number;
    fileName: string;
    sizeBytes: number;
}

// --- Создание (загрузка) новой редакции
export interface CreateVndRedactionRequest {
    docRu: File;
    docKg?: File | null;
    docEn?: File | null;
    /** Таблица изменений и дополнений (ТИД). Обязателен на бэке, если у ВНД уже есть предыдущая
     * редакция (то есть документ актуализируется, а не создаётся впервые) — форма загрузки
     * должна проверить это сама, ориентируясь на наличие уже существующих редакций у ВНД. */
    tid?: File | null;
    attachments?: File[];
    /** Id уже существующих файлов вложений (из предыдущей редакции этого же ВНД), переносимых
     * в новую редакцию как есть, без повторной загрузки - см. previousAttachments в
     * VndUploadRedactionModal. Дубли по содержимому (SHA-256) среди новых attachments сервер
     * тоже не грузит повторно сам - см. AddRedactionAsync/BuildAttachmentEntitiesAsync. */
    existingAttachmentFileIds?: number[];
    description?: string;
    requiresApproval: boolean;
}

// --- Сводка по срокам актуализации (для дашборда планирования) ---
export interface VndActualizationSummaryResponse {
    normal: number;
    approaching: number;
    critical: number;
    overdue: number;
    /** normal + approaching + critical + overdue. Документы без даты актуализации сюда не входят. */
    total: number;
}

// --- История циклов актуализации (GET /vnd/{vndId}/actualization/history)
export interface VndActualizationRecordResponse {
    id: number;

    responsibleUserId: number;
    responsibleUserName: string;

    requiresApproval: boolean;
    shiftNextPeriod: boolean;
    plannedNoChanges: boolean;

    startedAt: string; // ISO datetime
    /** null, пока шаг "Выполнить актуализацию" ещё не пройден — до этого момента
     * shiftNextPeriod/plannedNoChanges выше ещё не окончательные */
    performedAt: string | null;
    /** null, пока документ не дошёл (в рамках этого цикла) до статуса "Консолидация" */
    consolidationStartedAt: string | null;
    /** null, пока цикл ещё не завершён (см. isCompleted) */
    publishedAt: string | null;
    hadChanges: boolean | null;
    dueActualizationDateBefore: string | null; // "YYYY-MM-DD"
    dueActualizationDateAfter: string | null;

    /** false — цикл ещё в процессе (документ сейчас в OnActualization/Consolidation) */
    isCompleted: boolean;
}

export interface VndLinkItem {
    id: number;
    vndId: number;
    code: string;
    title: string;
    status: string; // "active" | "onact" | "review" | "consol" | "arch" | "draft"
}

export interface VndLinksResponse {
    outgoing: VndLinkItem[];
    incoming: VndLinkItem[];
}

export interface EditLastRevisionDirectlyRequest {
    docRu?: File;
    docKg?: File;
    docEn?: File;
    /** Убрать документ на кыргызском без замены - игнорируется, если одновременно передан docKg. */
    removeDocKg?: boolean;
    /** Убрать документ на английском без замены - игнорируется, если одновременно передан docEn. */
    removeDocEn?: boolean;
    description?: string;
    /** Новые вложения, добавляемые к редакции. */
    newAttachments?: File[];
    /** Id файлов существующих вложений редакции, которые нужно удалить. */
    removedAttachmentFileIds?: number[];
}

export interface VndQuickSearchResult {
    id: number;
    code: string;
    name: string;
    status: VndStatusKey;
}