export type CoordinationStageKind =
    | "legal"
    | "risk_management"
    | "compliance"
    | "methodology";

export interface CoordinationDefaultApproverResponse {
    id: number;
    kind: CoordinationStageKind;
    kindTitle: string;
    orgUnitId: number;
    orgUnitName: string;
    approverUserId: number | null;
    approverName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateCoordinationDefaultApproverRequest {
    approverUserId?: number | null;
}