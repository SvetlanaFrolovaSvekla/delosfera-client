export type SzRubricSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface SzRubricResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSzRubricRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface UpdateSzRubricRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface SzRubricFilter {
    sortBy?: SzRubricSortBy;
    search?: string;
}
