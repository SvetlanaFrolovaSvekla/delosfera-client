import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    PositionResponse,
    CreatePositionRequest,
    UpdatePositionRequest,
    PositionFilter,
} from "./positionServiceType.ts";

class PositionService {
    private readonly basePath = "/dictionaries/position";

    /** Список всех должностей */
    async getAll(filter?: PositionFilter): Promise<PositionResponse[]> {
        const response = await axiosInstance.get<PositionResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новую должность */
    async create(request: CreatePositionRequest): Promise<PositionResponse> {
        const response = await axiosInstance.post<PositionResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующую должность */
    async update(id: number, request: UpdatePositionRequest): Promise<PositionResponse> {
        const response = await axiosInstance.put<PositionResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить должность */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const positionService = new PositionService();