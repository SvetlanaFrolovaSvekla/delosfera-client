import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    SzRubricResponse,
    CreateSzRubricRequest,
    UpdateSzRubricRequest,
    SzRubricFilter,
} from "./szRubricServiceType.ts";

// Рубрикатор служебных записок — отдельный справочник от Рубрикатора ВНД (rubricService.ts),
// своя ручка на бэке (/dictionaries/sz-rubric), но по форме и поведению 1:1 такой же.
class SzRubricService {
    private readonly basePath = "/dictionaries/sz-rubric";

    /** Список всех рубрик СЗ */
    async getAll(filter?: SzRubricFilter): Promise<SzRubricResponse[]> {
        const response = await axiosInstance.get<SzRubricResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новую рубрику СЗ */
    async create(request: CreateSzRubricRequest): Promise<SzRubricResponse> {
        const response = await axiosInstance.post<SzRubricResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующую рубрику СЗ */
    async update(id: number, request: UpdateSzRubricRequest): Promise<SzRubricResponse> {
        const response = await axiosInstance.put<SzRubricResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить рубрику СЗ */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const szRubricService = new SzRubricService();
