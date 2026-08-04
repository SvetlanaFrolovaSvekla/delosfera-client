import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    SecurityLevelResponse,
    CreateSecurityLevelRequest,
    UpdateSecurityLevelRequest,
    SecurityLevelFilter,
} from "./securityLevelServiceType.ts";

class SecurityLevelService {
    private readonly basePath = "/dictionaries/security-level";

    /** Список всех уровней секретности */
    async getAll(filter?: SecurityLevelFilter): Promise<SecurityLevelResponse[]> {
        const response = await axiosInstance.get<SecurityLevelResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новый уровень секретности */
    async create(request: CreateSecurityLevelRequest): Promise<SecurityLevelResponse> {
        const response = await axiosInstance.post<SecurityLevelResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующий уровень секретности */
    async update(id: number, request: UpdateSecurityLevelRequest): Promise<SecurityLevelResponse> {
        const response = await axiosInstance.put<SecurityLevelResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить уровень секретности */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const securityLevelService = new SecurityLevelService();