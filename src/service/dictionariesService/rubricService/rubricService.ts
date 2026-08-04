import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    RubricResponse,
    CreateRubricRequest,
    UpdateRubricRequest,
    RubricFilter,
} from "./rubricServiceType.ts";

class RubricService {
    private readonly basePath = "/dictionaries/rubric";

    /** Список всех рубрик */
    async getAll(filter?: RubricFilter): Promise<RubricResponse[]> {
        const response = await axiosInstance.get<RubricResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новую рубрику */
    async create(request: CreateRubricRequest): Promise<RubricResponse> {
        const response = await axiosInstance.post<RubricResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующую рубрику */
    async update(id: number, request: UpdateRubricRequest): Promise<RubricResponse> {
        const response = await axiosInstance.put<RubricResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить рубрику */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const rubricService = new RubricService();