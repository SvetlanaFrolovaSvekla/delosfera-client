export type RubricSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface RubricResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRubricRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface UpdateRubricRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface RubricFilter {
    sortBy?: RubricSortBy;
    search?: string;
}