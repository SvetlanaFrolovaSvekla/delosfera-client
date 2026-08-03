export type TaskScope = "coordination" | "actualization" | "consolidation";
export type TaskStagePhase = "primary" | "repeat" | "final";

export interface VndTaskCountsResponse {
    coordination: number;
    actualization: number;
    consolidation: number;
}

export interface VndTaskResponse {
    vndId: number;
    vndCode: string;
    vndTitle: string;
    scope: TaskScope;

    redactionId: number | null;
    redactionCode: string | null;
    stageId: number | null;
    stagePhase: TaskStagePhase | null;
    deadlineAt: string | null;

    initiatorName: string | null;
    deadlineHours: number | null;

    dueActualizationDate: string | null;

    createdAt: string;
}