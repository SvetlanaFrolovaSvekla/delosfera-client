import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    OrganizationUnitResponse,
    CreateOrganizationUnitRequest,
    UpdateOrganizationUnitRequest,
    OrganizationUnitFilter,
} from "./organizationUnitServiceType.ts";
import {cached, invalidate} from "@/service/dictionaryCache.ts";

class OrganizationUnitService {
    private readonly basePath = "/dictionaries/organization-unit";

    /** Список всех структурных подразделений */
    async getAll(filter?: OrganizationUnitFilter): Promise<OrganizationUnitResponse[]> {
        // Отбор входит в ключ: иначе отфильтрованный список подменит собой полный.
        return cached(`${this.basePath}:${JSON.stringify(filter ?? {})}`, async () => {
            const response = await axiosInstance.get<OrganizationUnitResponse[]>(this.basePath, {
                params: filter,
            });
            return response.data;
        });
    }

    /** Создать новое структурное подразделение */
    async create(request: CreateOrganizationUnitRequest): Promise<OrganizationUnitResponse> {
        const response = await axiosInstance.post<OrganizationUnitResponse>(this.basePath, request);
        // Список изменился — забываем прежний, иначе форма подставит его ещё пять
        // минут. Вместе со списком забываем дерево: это тот же справочник, только
        // в другом виде, и оно устареет от той же правки.
        invalidate(this.basePath);
        invalidate("org-tree");
        return response.data;
    }

    /** Обновить существующее структурное подразделение */
    async update(id: number, request: UpdateOrganizationUnitRequest): Promise<OrganizationUnitResponse> {
        const response = await axiosInstance.put<OrganizationUnitResponse>(`${this.basePath}/${id}`, request);
        invalidate(this.basePath);
        invalidate("org-tree");
        return response.data;
    }

    /** Удалить структурное подразделение */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
        invalidate(this.basePath);
        invalidate("org-tree");
    }
}

export const organizationUnitService = new OrganizationUnitService();