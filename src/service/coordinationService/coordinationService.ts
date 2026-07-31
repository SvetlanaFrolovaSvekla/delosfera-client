import type {
    StartApprovalRequest,
    ApprovalDecisionRequest,
    ResubmitAfterRevisionRequest,
    ApprovalProcessResponse,
} from "./coordinationServiceTypes";
import {axiosInstance} from "@/service/axiosInstance.ts";

class CoordinationService {
    private basePath(vndId: number): string {
        return `/vnd/${vndId}/approval`;
    }

    /** Запустить согласование последней редакции ВНД */
    async start(vndId: number, request: StartApprovalRequest): Promise<ApprovalProcessResponse> {
        const { data } = await axiosInstance.post<ApprovalProcessResponse>(
            `${this.basePath(vndId)}/start`,
            request,
        );
        return data;
    }

    /** Текущий процесс согласования для последней редакции ВНД */
    async getByVndId(vndId: number): Promise<ApprovalProcessResponse> {
        const { data } = await axiosInstance.get<ApprovalProcessResponse>(this.basePath(vndId));
        return data;
    }

    /** Решение согласующего по своему этапу */
    async decide(
        vndId: number,
        stageId: number,
        request: ApprovalDecisionRequest,
    ): Promise<ApprovalProcessResponse> {
        const { data } = await axiosInstance.post<ApprovalProcessResponse>(
            `${this.basePath(vndId)}/stages/${stageId}/decision`,
            request,
        );
        return data;
    }

    /** Инициатор отправляет исправленную редакцию на повторное согласование */
    async resubmit(
        vndId: number,
        request: ResubmitAfterRevisionRequest,
    ): Promise<ApprovalProcessResponse> {
        const formData = new FormData();
        if (request.docRu) formData.append("DocRu", request.docRu);
        if (request.docKg) formData.append("DocKg", request.docKg);
        if (request.docEn) formData.append("DocEn", request.docEn);

        const { data } = await axiosInstance.post<ApprovalProcessResponse>(
            `${this.basePath(vndId)}/resubmit`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
        );
        return data;
    }
}

export const coordinationService = new CoordinationService();