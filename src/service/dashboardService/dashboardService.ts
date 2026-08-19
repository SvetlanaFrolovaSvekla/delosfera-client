import {apiClient} from "@/service/apiClient.ts";

/** KPI-плитка рабочего стола. */
export interface DashboardKpi {
    /** Код для навигации по клику. */
    code: string;
    label: string;
    value: number;
    note: string | null;
    /** normal | warning | danger — по срочности, а не по контуру. */
    tone: "normal" | "warning" | "danger";
}

/** Активное замещение (GEN-14). */
export interface ActiveSubstitution {
    id: number;
    /** Id замещаемого (в actingFor) либо замещающего (в replacedBy). */
    userId: number;
    userName: string;
    startsOn: string;
    endsOn: string;
    reason: string | null;
}

export interface DashboardSummary {
    kpis: DashboardKpi[];
    /** Кого сейчас замещает пользователь. */
    actingFor: ActiveSubstitution[];
    /** Кто замещает самого пользователя. */
    replacedBy: ActiveSubstitution[];
}

/** Замещение целиком — для управления периодами. */
export interface Substitution {
    id: number;
    userId: number;
    userName: string;
    substituteUserId: number;
    substituteUserName: string;
    startsOn: string;
    endsOn: string;
    reason: string | null;
    isCancelled: boolean;
    isActive: boolean;
}

export interface SubstitutionCreateRequest {
    userId: number;
    substituteUserId: number;
    startsOn: string;
    endsOn: string;
    reason?: string;
}

export const dashboardService = {
    async summary(): Promise<DashboardSummary> {
        const {data} = await apiClient.get<DashboardSummary>("/dashboard/summary");
        return data;
    },
};

export const substitutionService = {
    async list(mine = false): Promise<Substitution[]> {
        const {data} = await apiClient.get<Substitution[]>("/substitutions", {params: {mine}});
        return data;
    },

    async create(request: SubstitutionCreateRequest): Promise<Substitution> {
        const {data} = await apiClient.post<Substitution>("/substitutions", request);
        return data;
    },

    async cancel(id: number): Promise<Substitution> {
        const {data} = await apiClient.post<Substitution>(`/substitutions/${id}/cancel`, {});
        return data;
    },
};
