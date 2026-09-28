// Зеркало backend DTO (Modules/Analytics/DTO/**/ProcessMining) — process mining по
// трейсам маршрутов согласования (MINE-1).

/** Фильтр отчёта process mining. Пустой фильтр берёт все запущенные маршруты. */
export interface ProcessMiningFilter {
    documentType?: number | null; // Documents.DocumentType как число
    templateId?: number | null;
    dateFrom?: string | null; // "YYYY-MM-DD"
    dateTo?: string | null;
    businessHours?: boolean;
}

export interface ProcessMiningOverview {
    totalInstances: number;
    completedInstances: number;
    runningInstances: number;
    reworkInstances: number;
    reworkRatePercent: number;
    distinctVariants: number;
    averageDurationHours: number;
    medianDurationHours: number;
}

export interface ProcessPathVariant {
    signature: string;
    steps: string[];
    frequency: number;
    percent: number;
    averageDurationHours: number;
    reworkCount: number;
}

export interface ProcessReworkStep {
    stepLabel: string;
    stepKind: number;
    occurrences: number;
    returns: number;
    returnRatePercent: number;
}

export interface ProcessBottleneckStep {
    stepLabel: string;
    stepKind: number;
    samples: number;
    averageWaitHours: number;
    medianWaitHours: number;
    maxWaitHours: number;
    timeoutRatePercent: number;
}

export interface ProcessBottleneckParticipant {
    userId: number | null;
    label: string;
    samples: number;
    averageWaitHours: number;
    medianWaitHours: number;
}

export interface ProcessMiningReport {
    overview: ProcessMiningOverview;
    variants: ProcessPathVariant[];
    rework: ProcessReworkStep[];
    bottleneckSteps: ProcessBottleneckStep[];
    bottleneckParticipants: ProcessBottleneckParticipant[];
    durationUnit: string;
}

export interface ProcessMiningOption {
    id: number;
    label: string;
}

export interface ProcessMiningFilterOptions {
    documentTypes: ProcessMiningOption[];
    templates: ProcessMiningOption[];
}
