export type UserGroupSortBy =
    | "CreatedAtAsc"
    | "CreatedAtDesc"
    | "NameAsc"
    | "NameDesc";

export interface UserGroupMemberResponse {
    id: number;
    fullName: string;
    email: string;
}

export interface UserGroupResponse {
    id: number;
    name: string;
    titleRu: string;
    titleEn: string | null;
    titleKg: string | null;
    users: UserGroupMemberResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserGroupRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    userIds: number[];
}

export interface UpdateUserGroupRequest {
    titleRu: string;
    titleEn?: string;
    titleKg?: string;
    userIds: number[];
}

export interface UserGroupFilter {
    sortBy?: UserGroupSortBy;
    search?: string;
}