export type RoleSortBy = "CreatedAtAsc" | "CreatedAtDesc" | "NameAsc" | "NameDesc";

// --- Права

export interface PermissionResponse {
    code: number;
    key: string;
    description: string;
}

// --- Роли

export interface RoleResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    permissionCodes: number[];
    permissions: PermissionResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateRoleRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    permissionCodes: number[];
}

export interface UpdateRoleRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    permissionCodes: number[];
}