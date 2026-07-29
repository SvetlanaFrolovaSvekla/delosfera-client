import {apiClient} from "@/service/apiClient.ts";
import type {
    CreateRoleRequest,
    PermissionResponse,
    RoleResponse,
    RoleSortBy,
    UpdateRoleRequest,
} from "./rolesPermissionTypeService.ts";

export const rolesPermissionService = {
    /**
     * Получить список всех доступных прав — для построения формы
     * создания/редактирования роли (чекбоксы).
     */
    async getAllPermissions(): Promise<PermissionResponse[]> {
        const response = await apiClient.get<PermissionResponse[]>("/api/users/roles/permissions");
        return response.data;
    },

    /**
     * Получить список ролей.
     */
    async getAll(params?: {sortBy?: RoleSortBy; search?: string}): Promise<RoleResponse[]> {
        const response = await apiClient.get<RoleResponse[]>("/api/users/roles", {
            params: {
                sortBy: params?.sortBy,
                search: params?.search,
            },
        });
        return response.data;
    },

    /**
     * Создать новую роль.
     */
    async create(request: CreateRoleRequest): Promise<RoleResponse> {
        const response = await apiClient.post<RoleResponse>("/api/users/roles", request);
        return response.data;
    },

    /**
     * Обновить существующую роль.
     */
    async update(id: number, request: UpdateRoleRequest): Promise<RoleResponse> {
        const response = await apiClient.put<RoleResponse>(`/api/users/roles/${id}`, request);
        return response.data;
    },

    /**
     * Удалить роль.
     */
    async remove(id: number): Promise<void> {
        await apiClient.delete(`/api/users/roles/${id}`);
    },
};