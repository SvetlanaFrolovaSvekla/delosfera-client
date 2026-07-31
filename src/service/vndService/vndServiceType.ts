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

    requiresApproval: boolean;
    approvalStatus: RedactionApprovalStatus;

    attachmentFileIds: number[];

    createdAt: string; // ISO datetime
}

// --- Создание (загрузка) новой редакции
export interface CreateVndRedactionRequest {
    docRu: File;
    docKg?: File | null;
    docEn?: File | null;
    attachments?: File[];
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