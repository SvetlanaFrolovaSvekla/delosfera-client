export interface CoordinationDefaultApproverResponse {
    id: number;
    title: string;
    order: number;
    orgUnitId: number;
    orgUnitName: string;
    approverUserId: number | null;
    approverName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCoordinationDefaultApproverRequest {
    title: string;
    orgUnitId: number;
    approverUserId?: number | null;
}

export interface UpdateCoordinationDefaultApproverRequest {
    title: string;
    orgUnitId: number;
    approverUserId?: number | null;
}

export interface ReorderCoordinationDefaultApproverRequest {
    orderedIds: number[];
}
