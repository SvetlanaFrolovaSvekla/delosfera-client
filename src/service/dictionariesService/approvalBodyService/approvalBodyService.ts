import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    ApprovalBodyResponse,
    CreateApprovalBodyRequest,
    UpdateApprovalBodyRequest,
    ApprovalBodyFilter,
} from "./approvalBodyServiceType.ts";

class ApprovalBodyService {
    private readonly basePath = "/dictionaries/approval-body";

    /** Список всех органов утверждения */
    async getAll(filter?: ApprovalBodyFilter): Promise<ApprovalBodyResponse[]> {
        const response = await axiosInstance.get<ApprovalBodyResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новый орган утверждения */
    async create(request: CreateApprovalBodyRequest): Promise<ApprovalBodyResponse> {
        const response = await axiosInstance.post<ApprovalBodyResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующий орган утверждения */
    async update(id: number, request: UpdateApprovalBodyRequest): Promise<ApprovalBodyResponse> {
        const response = await axiosInstance.put<ApprovalBodyResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить орган утверждения */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const approvalBodyService = new ApprovalBodyService();