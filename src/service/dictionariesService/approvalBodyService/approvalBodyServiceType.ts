export type ApprovalBodySortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface ApprovalBodyResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateApprovalBodyRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface UpdateApprovalBodyRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface ApprovalBodyFilter {
    sortBy?: ApprovalBodySortBy;
    search?: string;
}