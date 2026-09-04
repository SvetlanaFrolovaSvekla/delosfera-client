import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    CoordinationDefaultApproverResponse,
    CreateCoordinationDefaultApproverRequest,
    UpdateCoordinationDefaultApproverRequest,
    ReorderCoordinationDefaultApproverRequest,
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";


class CoordinationApproverService {
    private readonly basePath = "/dictionaries/coordination-users";

    /** Все обязательные (фиксированные) этапы, в порядке маршрута */
    async getAll(): Promise<CoordinationDefaultApproverResponse[]> {
        const response = await axiosInstance.get<CoordinationDefaultApproverResponse[]>(this.basePath);
        return response.data;
    }

    /** Добавить новый обязательный этап (добавляется последним в маршруте) */
    async create(
        request: CreateCoordinationDefaultApproverRequest
    ): Promise<CoordinationDefaultApproverResponse> {
        const response = await axiosInstance.post<CoordinationDefaultApproverResponse>(this.basePath, request);
        return response.data;
    }

    /** Изменить название, СП и/или согласующего по умолчанию одного из этапов */
    async update(
        id: number,
        request: UpdateCoordinationDefaultApproverRequest
    ): Promise<CoordinationDefaultApproverResponse> {
        const response = await axiosInstance.put<CoordinationDefaultApproverResponse>(
            `${this.basePath}/${id}`,
            request
        );
        return response.data;
    }

    /** Удалить обязательный этап из маршрута согласования */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }

    /** Изменить порядок этапов в маршруте */
    async reorder(
        request: ReorderCoordinationDefaultApproverRequest
    ): Promise<CoordinationDefaultApproverResponse[]> {
        const response = await axiosInstance.post<CoordinationDefaultApproverResponse[]>(
            `${this.basePath}/reorder`,
            request
        );
        return response.data;
    }
}

export const coordinationApproverService = new CoordinationApproverService();
