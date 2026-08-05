import type {
    ActualizationRequestDecisionRequest,
    ConfirmActualizationStartRequest,
    PublishVndActualizationRequest,
    RequestActualizationAccessRequest,
    StartActualizationRequest,
    VndActualizationRequestResponse,
    VndActualizationStateResponse,
} from "./actualizationServiceTypes";
import {axiosInstance} from "@/service/axiosInstance.ts";

class ActualizationService {
    private basePath(vndId: number): string {
        return `/vnd/${vndId}/actualization`;
    }

    /** Сразу начать актуализацию (для ActualizeAnyVndWithApproval/WithoutApproval) */
    async start(
        vndId: number,
        request: StartActualizationRequest,
    ): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.post<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/start`,
            request,
        );
        return data;
    }

    /** Запросить доступ к актуализации у главного редактора (по запросу права) */
    async requestAccess(
        vndId: number,
        request: RequestActualizationAccessRequest,
    ): Promise<VndActualizationRequestResponse> {
        const {data} = await axiosInstance.post<VndActualizationRequestResponse>(
            `${this.basePath(vndId)}/request-access`,
            request,
        );
        return data;
    }

    /** Подтвердить старт актуализации после одобренной заявки на доступ */
    async confirmStart(
        vndId: number,
        request: ConfirmActualizationStartRequest,
    ): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.post<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/confirm-start`,
            request,
        );
        return data;
    }

    /** Консолидировать согласованную редакцию: ВНД переходит из статуса
     * «Консолидация» в статус «Действующий» (Consolidation → Active). */
    async publish(
        vndId: number,
        request: PublishVndActualizationRequest,
    ): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.post<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/publish`,
            request,
        );
        return data;
    }

    /** Список заявок на доступ к актуализации, ожидающих решения (только для главного редактора ВНД) */
    async getPendingRequests(): Promise<VndActualizationRequestResponse[]> {
        const {data} = await axiosInstance.get<VndActualizationRequestResponse[]>(
            "/vnd/actualization/requests",
        );
        return data;
    }

    /** Одобрить или отклонить заявку на доступ к актуализации */
    async decideRequest(
        requestId: number,
        request: ActualizationRequestDecisionRequest,
    ): Promise<VndActualizationRequestResponse> {
        const {data} = await axiosInstance.post<VndActualizationRequestResponse>(
            `/vnd/actualization/requests/${requestId}/decision`,
            request,
        );
        return data;
    }
}

export const actualizationService = new ActualizationService();
