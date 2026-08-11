import type {
    StartApprovalRequest,
    ApprovalDecisionRequest,
    ResubmitAfterRevisionRequest,
    AddDisagreementMatrixRowRequest,
    ApprovalProcessResponse,
    DisagreementMatrixRowResponse,
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

    /** Инициатор отправляет исправленную редакцию на повторное согласование
     * (или сразу на финальную выдержку, если agreesWithAllRemarks === false).
     * ТИД (tid) обязателен на бэке, если редакция не первая для этого ВНД —
     * компонент вызова обязан проверить это перед отправкой (см. redaction.number). */
    async resubmit(
        vndId: number,
        request: ResubmitAfterRevisionRequest,
    ): Promise<ApprovalProcessResponse> {
        const formData = new FormData();
        if (request.docRu) formData.append("DocRu", request.docRu);
        if (request.docKg) formData.append("DocKg", request.docKg);
        if (request.docEn) formData.append("DocEn", request.docEn);
        if (request.tid) formData.append("Tid", request.tid);
        if (request.comment) formData.append("Comment", request.comment);
        formData.append("AgreesWithAllRemarks", String(request.agreesWithAllRemarks));

        const { data } = await axiosInstance.post<ApprovalProcessResponse>(
            `${this.basePath(vndId)}/resubmit`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
        );
        return data;
    }

    /** Добавить строку в матрицу разногласий (только инициатор, только на доработке) */
    async addDisagreementRow(
        vndId: number,
        request: AddDisagreementMatrixRowRequest,
    ): Promise<DisagreementMatrixRowResponse> {
        const { data } = await axiosInstance.post<DisagreementMatrixRowResponse>(
            `${this.basePath(vndId)}/disagreement-matrix/rows`,
            request,
        );
        return data;
    }

    /** Удалить строку из матрицы разногласий */
    async deleteDisagreementRow(vndId: number, rowId: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath(vndId)}/disagreement-matrix/rows/${rowId}`);
    }

    /** Инициатор отзывает согласование — редакция и документ возвращаются в черновик */
    async cancel(vndId: number): Promise<ApprovalProcessResponse> {
        const { data } = await axiosInstance.post<ApprovalProcessResponse>(`${this.basePath(vndId)}/cancel`);
        return data;
    }
}

export const coordinationService = new CoordinationService();