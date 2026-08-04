import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    TypeVndResponse,
    CreateTypeVndRequest,
    UpdateTypeVndRequest,
    TypeVndFilter,
} from "./typeVndServiceType.ts";

class TypeVndService {
    private readonly basePath = "/dictionaries/type-vnd";

    /** Список всех видов ВНД */
    async getAll(filter?: TypeVndFilter): Promise<TypeVndResponse[]> {
        const response = await axiosInstance.get<TypeVndResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новый вид ВНД */
    async create(request: CreateTypeVndRequest): Promise<TypeVndResponse> {
        const response = await axiosInstance.post<TypeVndResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующий вид ВНД */
    async update(id: number, request: UpdateTypeVndRequest): Promise<TypeVndResponse> {
        const response = await axiosInstance.put<TypeVndResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить вид ВНД */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const typeVndService = new TypeVndService();