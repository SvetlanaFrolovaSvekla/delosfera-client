import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    UserGroupResponse,
    CreateUserGroupRequest,
    UpdateUserGroupRequest,
    UserGroupFilter,
} from "./userGroupServiceType.ts";

class UserGroupService {
    private readonly basePath = "/dictionaries/user-group";

    /** Список всех групп пользователей */
    async getAll(filter?: UserGroupFilter): Promise<UserGroupResponse[]> {
        const response = await axiosInstance.get<UserGroupResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новую группу пользователей */
    async create(request: CreateUserGroupRequest): Promise<UserGroupResponse> {
        const response = await axiosInstance.post<UserGroupResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующую группу пользователей */
    async update(id: number, request: UpdateUserGroupRequest): Promise<UserGroupResponse> {
        const response = await axiosInstance.put<UserGroupResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить группу пользователей */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const userGroupService = new UserGroupService();