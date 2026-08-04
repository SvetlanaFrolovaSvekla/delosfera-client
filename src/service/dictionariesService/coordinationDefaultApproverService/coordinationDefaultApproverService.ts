import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    CoordinationDefaultApproverResponse,
    UpdateCoordinationDefaultApproverRequest,
} from "./coordinationDefaultApproverServiceType.ts";

class CoordinationDefaultApproverService {
    private readonly basePath = "/dictionaries/coordination-users";

    /** Дефолтные согласующие по всем фиксированным этапам (Юр. управление, Риск-менеджмент, Комплаенс, Методология) */
    async getAll(): Promise<CoordinationDefaultApproverResponse[]> {
        const response = await axiosInstance.get<CoordinationDefaultApproverResponse[]>(this.basePath);
        return response.data;
    }

    /** Изменить согласующего по умолчанию для одного из этапов. approverUserId: null — сбросить дефолт */
    async update(
        id: number,
        request: UpdateCoordinationDefaultApproverRequest,
    ): Promise<CoordinationDefaultApproverResponse> {
        const response = await axiosInstance.put<CoordinationDefaultApproverResponse>(
            `${this.basePath}/${id}`,
            request,
        );
        return response.data;
    }
}

export const coordinationDefaultApproverService = new CoordinationDefaultApproverService();