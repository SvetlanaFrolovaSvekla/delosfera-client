import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    PositionResponse,
    CreatePositionRequest,
    UpdatePositionRequest,
    PositionFilter,
} from "./positionServiceType.ts";
import {cached, invalidate} from "@/service/dictionaryCache.ts";

class PositionService {
    private readonly basePath = "/dictionaries/position";

    /** Список всех должностей */
    async getAll(filter?: PositionFilter): Promise<PositionResponse[]> {
        // Отбор входит в ключ: иначе отфильтрованный список подменит собой полный.
        return cached(`${this.basePath}:${JSON.stringify(filter ?? {})}`, async () => {
            const response = await axiosInstance.get<PositionResponse[]>(this.basePath, {
                params: filter,
            });
            return response.data;
        });
    }

    /** Создать новую должность */
    async create(request: CreatePositionRequest): Promise<PositionResponse> {
        const response = await axiosInstance.post<PositionResponse>(this.basePath, request);
        // Список изменился — забываем прежний, иначе форма подставит его ещё пять минут.
        invalidate(this.basePath);
        return response.data;
    }

    /** Обновить существующую должность */
    async update(id: number, request: UpdatePositionRequest): Promise<PositionResponse> {
        const response = await axiosInstance.put<PositionResponse>(`${this.basePath}/${id}`, request);
        invalidate(this.basePath);
        return response.data;
    }

    /** Удалить должность */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
        invalidate(this.basePath);
    }
}

export const positionService = new PositionService();