export type OrganizationUnitSortBy = "CreatedAtAsc" | "CreatedAtDesc" | "NameAsc" | "NameDesc";

export interface OrganizationUnitResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    parentId: number | null;

    headUserId: number | null;
    headUserName: string | null;
    curatorUserId: number | null;
    curatorUserName: string | null;

    createdAt: string;
    updatedAt: string;
}

export interface CreateOrganizationUnitRequest {
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
    parentId?: number | null;
    headUserId?: number | null;
    curatorUserId?: number | null;
}

export interface UpdateOrganizationUnitRequest {
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
    parentId?: number | null;
    headUserId?: number | null;
    curatorUserId?: number | null;
}