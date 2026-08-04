import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    OrganizationUnitResponse,
    CreateOrganizationUnitRequest,
    UpdateOrganizationUnitRequest,
    OrganizationUnitFilter,
} from "./organizationUnitServiceType.ts";

class OrganizationUnitService {
    private readonly basePath = "/dictionaries/organization-unit";

    /** Список всех структурных подразделений */
    async getAll(filter?: OrganizationUnitFilter): Promise<OrganizationUnitResponse[]> {
        const response = await axiosInstance.get<OrganizationUnitResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новое структурное подразделение */
    async create(request: CreateOrganizationUnitRequest): Promise<OrganizationUnitResponse> {
        const response = await axiosInstance.post<OrganizationUnitResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующее структурное подразделение */
    async update(id: number, request: UpdateOrganizationUnitRequest): Promise<OrganizationUnitResponse> {
        const response = await axiosInstance.put<OrganizationUnitResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить структурное подразделение */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const organizationUnitService = new OrganizationUnitService();