import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    CoordinationDefaultApproverResponse, UpdateCoordinationDefaultApproverRequest
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";


class CoordinationApproverService {
    private readonly basePath = "/dictionaries/coordination-users";

    /** Дефолтные согласующие по всем фиксированным этапам */
    async getAll(): Promise<CoordinationDefaultApproverResponse[]> {
        const response = await axiosInstance.get<CoordinationDefaultApproverResponse[]>(this.basePath);
        return response.data;
    }

    /** Изменить согласующего по умолчанию для одного из этапов */
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
}

export const coordinationApproverService = new CoordinationApproverService();