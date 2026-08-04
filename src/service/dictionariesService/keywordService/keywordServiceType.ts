export type KeywordSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface KeywordResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateKeywordRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface UpdateKeywordRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface KeywordFilter {
    sortBy?: KeywordSortBy;
    search?: string;
}