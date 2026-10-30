export type StatementRubricSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface StatementRubricResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStatementRubricRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface UpdateStatementRubricRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    parentId?: number;
}

export interface StatementRubricFilter {
    sortBy?: StatementRubricSortBy;
    search?: string;
}
