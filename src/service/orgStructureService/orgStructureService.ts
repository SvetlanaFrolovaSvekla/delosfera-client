import {apiClient} from "@/service/apiClient.ts";

/**
 * Оргструктуру ведёт портал банка, сюда она приходит копией.
 *
 * Токен наружу не отдаётся никогда: с сервера приходит лишь признак, задан он
 * или нет. Поэтому при сохранении пустое поле означает «оставить прежний», а не
 * «стереть» — иначе правка адреса или интервала стирала бы доступ.
 */

export interface OrgStructureSettings {
    enabled: boolean;
    portalUrl: string;
    hasToken: boolean;
    syncIntervalMinutes: number;
    /** Заводить подразделения, которых нет в справочнике. */
    createMissingUnits: boolean;
    /** Сопоставлять сотрудников по почте: логин при смене фамилии меняют, почта остаётся. */
    matchByEmail: boolean;
}

export interface OrgStructureSettingsRequest {
    enabled: boolean;
    portalUrl: string;
    /** Пусто — оставить прежний. */
    token?: string;
    syncIntervalMinutes: number;
    createMissingUnits: boolean;
    matchByEmail: boolean;
}

export type SyncOutcome = "Success" | "Partial" | "Failed";

export const OUTCOME_TITLE: Record<SyncOutcome, string> = {
    Success: "Прошла",
    Partial: "Прошла с замечаниями",
    Failed: "Не прошла",
};

export interface OrgSyncRun {
    id: number;
    startedAt: string;
    finishedAt: string | null;
    outcome: SyncOutcome;
    /** Кто запустил. Пусто — сработало расписание. */
    startedBy: string | null;

    unitsReceived: number;
    unitsCreated: number;
    unitsUpdated: number;
    unitsSkipped: number;

    employeesReceived: number;
    employeesMatched: number;
    employeesUnmatched: number;
    employeesUpdated: number;
    /** Скольким закрыли доступ: в портале уволены. */
    employeesDeactivated: number;

    error: string | null;
    notes: string[];
}

const BASE = "/integrations/org-structure";

export const orgStructureService = {
    async settings() {
        const {data} = await apiClient.get<OrgStructureSettings>(`${BASE}/settings`);
        return data;
    },

    async save(request: OrgStructureSettingsRequest) {
        const {data} = await apiClient.put<OrgStructureSettings>(`${BASE}/settings`, request);
        return data;
    },

    /** Проверка связи. Отвечает и при неудаче — с текстом, что именно не так. */
    async check(request: OrgStructureSettingsRequest) {
        const {data} = await apiClient.post<{ok: boolean; message: string}>(`${BASE}/check`, request);
        return data;
    },

    /** Забрать структуру сейчас, не дожидаясь расписания. */
    async syncNow() {
        const {data} = await apiClient.post<OrgSyncRun>(`${BASE}/sync`);
        return data;
    },

    async runs(take = 20) {
        const {data} = await apiClient.get<OrgSyncRun[]>(`${BASE}/runs`, {params: {take}});
        return data;
    },
};

/** Интервал человеку: минуты до часа, дальше часы, от суток — сутками. */
export function intervalTitle(minutes: number): string {
    if (minutes < 60) return `${minutes} мин`;
    if (minutes < 1440) {
        const hours = Math.round(minutes / 60);
        return `${hours} ч`;
    }
    const days = Math.round(minutes / 1440);
    return days === 1 ? "раз в сутки" : `раз в ${days} сут`;
}
