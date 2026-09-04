import type {
    StartApprovalRequest,
    ApprovalDecisionRequest,
    ResubmitAfterRevisionRequest,
    AddDisagreementMatrixRowRequest,
    UpdateDisagreementMatrixRowRequest,
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

    /** Решение согласующего по своему этапу. Можно приложить файлы к резолюции —
     * они хранятся бессрочно, наравне с текстом комментария, и остаются частью истории
     * согласования и после того, как редакция станет согласованной. */
    async decide(
        vndId: number,
        stageId: number,
        request: ApprovalDecisionRequest,
    ): Promise<ApprovalProcessResponse> {
        const formData = new FormData();
        formData.append("Decision", request.decision);
        if (request.comment) formData.append("Comment", request.comment);
        for (const file of request.files ?? []) {
            formData.append("Files", file);
        }
        // Цитаты передаются одним JSON-полем, а не как список сложных объектов через
        // FormData (см. комментарий у QuotesJson в ApprovalDecisionRequest на бэке) —
        // комплексный биндинг списков через [FromForm] в ASP.NET Core ненадёжен.
        if (request.quotes && request.quotes.length > 0) {
            formData.append("QuotesJson", JSON.stringify(request.quotes));
        }

        // Content-Type НЕ задаём вручную: axios/браузер сам подставит
        // "multipart/form-data; boundary=...". Если прописать заголовок явно без
        // boundary (как было раньше), браузер не переопределяет наш заголовок —
        // и сервер получает тело без границы между частями, из-за чего вложения
        // либо не долетают вовсе, либо долетает только часть (нестабильно от
        // раза к разу). Именно это ломало повторное/первое прикрепление файла.
        const { data } = await axiosInstance.post<ApprovalProcessResponse>(
            `${this.basePath(vndId)}/stages/${stageId}/decision`,
            formData,
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
        if (request.removeDocKg) formData.append("RemoveDocKg", "true");
        if (request.removeDocEn) formData.append("RemoveDocEn", "true");
        if (request.tid) formData.append("Tid", request.tid);
        for (const file of request.newAttachments ?? []) {
            formData.append("NewAttachments", file);
        }
        for (const fileId of request.removedAttachmentFileIds ?? []) {
            formData.append("RemovedAttachmentFileIds", String(fileId));
        }
        if (request.comment) formData.append("Comment", request.comment);
        for (const file of request.commentAttachments ?? []) {
            formData.append("CommentAttachments", file);
        }
        formData.append("RemarksAgreement", request.remarksAgreement);
        if (request.disagreementMatrix) formData.append("DisagreementMatrix", request.disagreementMatrix);

        // См. комментарий в decide() выше — Content-Type не задаём вручную.
        const { data } = await axiosInstance.post<ApprovalProcessResponse>(
            `${this.basePath(vndId)}/resubmit`,
            formData,
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

    /** Изменить строку матрицы разногласий */
    async updateDisagreementRow(
        vndId: number,
        rowId: number,
        request: UpdateDisagreementMatrixRowRequest,
    ): Promise<DisagreementMatrixRowResponse> {
        const { data } = await axiosInstance.put<DisagreementMatrixRowResponse>(
            `${this.basePath(vndId)}/disagreement-matrix/rows/${rowId}`,
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