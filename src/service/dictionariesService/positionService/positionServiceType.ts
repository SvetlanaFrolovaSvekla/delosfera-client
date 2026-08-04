export type PositionSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface PositionResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePositionRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

export interface UpdatePositionRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

export interface PositionFilter {
    sortBy?: PositionSortBy;
    search?: string;
}