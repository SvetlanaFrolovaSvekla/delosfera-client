export type UserSource = "Local" | "Ldap";

export interface PermissionResponse {
    code: number;
    key: string;
    description: string;
}


// 1 - Администратор, 2 - Рядовой пользователь, 3 - Редактор ВНД, 4 - Главный редактор ВНД
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

export interface PositionResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    createdAt: string;
    updatedAt: string;
}

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

export type UserSortBy = "CreatedAtAsc" | "CreatedAtDesc" | "NameAsc" | "NameDesc";

export interface UserResponse {
    id: number;
    fullName: string;
    email: string;
    position: PositionResponse | null;
    orgUnit: OrganizationUnitResponse | null;
    isActive: boolean;
    lastLoginAt: string | null;
    source: UserSource;
    isBlocked: boolean;
    blockedAt: string | null;
    blockedByUserName: string | null;
    blockReason: string | null;
    roles: RoleResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserRequest {
    fullName: string;
    email: string;
    password: string;
    positionId?: number | null;
    orgUnitId?: number | null;
    roleIds?: number[];
}

export interface UpdateUserRequest {
    fullName: string;
    email: string;
    password?: string;
    positionId?: number | null;
    orgUnitId?: number | null;
    isActive: boolean;
    roleIds?: number[];
}

export interface BlockUserRequest {
    reason?: string;
}

export interface GetUsersParams {
    sortBy?: UserSortBy;
    search?: string;
    orgUnitIds?: number[];
    positionIds?: number[];
    roleIds?: number[];
    source?: UserSource;
    isBlocked?: boolean;
}
// Лента активности пользователя (GET /users/{id}/activity)
export interface UserActivityItem {
    type: "vnd_created" | "approval_decided" | "approval_initiated";
    vndId?: number | null;
    vndCode?: string | null;
    vndTitle?: string | null;
    timestamp: string;
    description: string;
}

export interface UserActivityResponse {
    vndCreatedCount: number;
    approvalsDecidedCount: number;
    approvalsInitiatedCount: number;
    recent: UserActivityItem[];
}
