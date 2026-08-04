export type TypeVndSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface TypeVndResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTypeVndRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

export interface UpdateTypeVndRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

export interface TypeVndFilter {
    sortBy?: TypeVndSortBy;
    search?: string;
}