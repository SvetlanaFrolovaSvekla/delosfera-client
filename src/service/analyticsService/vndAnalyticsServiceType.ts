// Зеркало backend DTO (Modules/Analytics/DTO/**) для аналитики по модулю ВНД

export type AnalyticsGranularity = 0 | 1 | 2 | 3 | 4; // Day | Week | Month | Quarter | Year

export const GRANULARITY = {
    Day: 0,
    Week: 1,
    Month: 2,
    Quarter: 3,
    Year: 4,
} as const satisfies Record<string, AnalyticsGranularity>;

export interface AnalyticsPeriodRequest {
    dateFrom?: string | null; // "YYYY-MM-DD"
    dateTo?: string | null;
    granularity: AnalyticsGranularity;
}

/** Универсальная точка "категория — значение" для круговых/столбчатых диаграмм */
export interface ChartCategoryPoint {
    id: number | null;
    label: string;
    value: number;
    percent: number;
}

/** Универсальная точка временного ряда с одним значением */
export interface ChartTimePoint {
    periodStart: string;
    periodLabel: string;
    value: number;
}

/** KPI-плашки для верхней части страницы отчётности */
export interface VndOverviewResponse {
    total: number;
    active: number;
    onActualization: number;
    onReview: number;
    onConsolidation: number;
    archived: number;
    draft: number;
    requiresAttention: number;
    overdue: number;
    approvalsInProgress: number;
    createdLast30Days: number;
    publishedLast30Days: number;
    averageApprovalDurationDays: number;
    timeoutDecisionRatePercent: number;
}

/** Точка динамики жизненного цикла ВНД по периодам */
export interface VndDynamicsPoint {
    periodStart: string;
    periodLabel: string;
    created: number;
    published: number;
    sentToApproval: number;
    archived: number;
}

/** Точка динамики циклов актуализации по периодам */
export interface VndActualizationTrendPoint {
    periodStart: string;
    periodLabel: string;
    started: number;
    published: number;
    publishedWithChanges: number;
    averageDurationDays: number;
}

/** Эффективность процесса согласования */
export interface VndApprovalPerformanceResponse {
    totalProcesses: number;
    approved: number;
    rejected: number;
    cancelled: number;
    inProgress: number;
    approvalRatePercent: number;
    revisionRatePercent: number;
    averageDurationDays: number;
    medianDurationDays: number;
    durationTrend: ChartTimePoint[];
}

/** Загрузка согласующего подразделения/пользователя */
export interface VndApproverWorkloadItem {
    orgUnitId: number;
    orgUnitLabel: string;
    approverUserId: number | null;
    approverLabel: string | null;
    totalStages: number;
    decidedOnTime: number;
    autoApprovedByTimeout: number;
    withCommentsOrRejected: number;
    pending: number;
    averageDecisionHours: number;
    timeoutRatePercent: number;
}

/** Ячейка матрицы "подразделение-разработчик × статус ВНД" */
export interface VndOrgUnitStatusMatrixItem {
    orgUnitId: number;
    orgUnitLabel: string;
    status: "active" | "onact" | "review" | "consol" | "arch" | "draft";
    count: number;
}
