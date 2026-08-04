export type SecurityLevelSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface SecurityLevelResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSecurityLevelRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

export interface UpdateSecurityLevelRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
}

export interface SecurityLevelFilter {
    sortBy?: SecurityLevelSortBy;
    search?: string;
}