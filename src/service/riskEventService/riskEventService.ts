import {apiClient} from "@/service/apiClient.ts";

/**
 * События операционного риска (RISK-1, 716-П / НБКР). Поднимаются с шага согласования
 * или карточки документа; риск-подразделение ведёт по ним реестр и разбор.
 *
 * Строковые enum'ы — зеркало backend (Modules/RiskEvents/Models/RiskEvent.cs); подписи
 * совпадают с RiskEventLabels на сервере, чтобы реестр и карточка не расходились.
 */

// Тип события по классификации 716-П (семь категорий по источнику потерь).
export type RiskEventType =
    | "InternalFraud"
    | "ExternalFraud"
    | "EmploymentPractices"
    | "ClientsProductsBusinessPractices"
    | "DamageToPhysicalAssets"
    | "BusinessDisruptionSystemFailures"
    | "ExecutionDeliveryProcessManagement";

export const RISK_TYPE_LABEL: Record<RiskEventType, string> = {
    InternalFraud: "Внутреннее мошенничество",
    ExternalFraud: "Внешнее мошенничество",
    EmploymentPractices: "Кадровая политика и безопасность труда",
    ClientsProductsBusinessPractices: "Клиенты, продукты и деловая практика",
    DamageToPhysicalAssets: "Ущерб материальным активам",
    BusinessDisruptionSystemFailures: "Нарушение деятельности и сбои систем",
    ExecutionDeliveryProcessManagement: "Управление процессами, исполнение и поставка",
};

export type RiskEventSeverity = "Low" | "Medium" | "High" | "Critical";
export const RISK_SEVERITY_LABEL: Record<RiskEventSeverity, string> = {
    Low: "Незначительная", Medium: "Умеренная", High: "Существенная", Critical: "Критическая",
};

export type RiskEventStatus = "New" | "InProgress" | "Closed";
export const RISK_STATUS_LABEL: Record<RiskEventStatus, string> = {
    New: "Новое", InProgress: "В работе", Closed: "Закрыто",
};

export interface RiskEventListItem {
    id: number;
    type: RiskEventType;
    typeTitle: string;
    severity: RiskEventSeverity;
    severityTitle: string;
    status: RiskEventStatus;
    statusTitle: string;
    occurredOn: string;
    shortDescription: string;
    directLossAmount: number | null;
    lossCurrency: string;
    documentId: number | null;
    documentTitle: string | null;
    initiatorUserId: number;
    initiatorName: string | null;
    createdAt: string;
}

export interface RiskEventDetails extends RiskEventListItem {
    description: string;
    resolutionComment: string | null;
    routeInstanceId: number | null;
    routeStepId: number | null;
    routeParticipantId: number | null;
    updatedAt: string;
}

/** Поднять событие: источник задаётся любым из полей привязки. */
export interface RaiseRiskEventRequest {
    type: RiskEventType;
    severity: RiskEventSeverity;
    description: string;
    documentId?: number | null;
    routeInstanceId?: number | null;
    routeStepId?: number | null;
    routeParticipantId?: number | null;
    directLossAmount?: number | null;
    lossCurrency?: string | null;
    occurredOn?: string | null;
}

export interface ChangeRiskEventStatusRequest {
    status: RiskEventStatus;
    comment?: string | null;
    directLossAmount?: number | null;
    lossCurrency?: string | null;
}

export interface RiskEventFilterParams {
    type?: RiskEventType;
    severity?: RiskEventSeverity;
    status?: RiskEventStatus;
    documentId?: number;
    initiatorUserId?: number;
    from?: string;
    to?: string;
    query?: string;
    page?: number;
    pageSize?: number;
}

export interface RiskEventPage {
    items: RiskEventListItem[];
    total: number;
    page: number;
    pageSize: number;
}

const BASE = "/risk-events";

export const riskEventService = {
    async search(params: RiskEventFilterParams = {}) {
        const {data} = await apiClient.get<RiskEventPage>(BASE, {params});
        return data;
    },
    async get(id: number) {
        const {data} = await apiClient.get<RiskEventDetails>(`${BASE}/${id}`);
        return data;
    },
    async raise(request: RaiseRiskEventRequest) {
        const {data} = await apiClient.post<RiskEventDetails>(BASE, request);
        return data;
    },
    async changeStatus(id: number, request: ChangeRiskEventStatusRequest) {
        const {data} = await apiClient.patch<RiskEventDetails>(`${BASE}/${id}/status`, request);
        return data;
    },
};
