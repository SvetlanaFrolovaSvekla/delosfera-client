import type {
    ActualizationRequestDecisionRequest,
    ConfirmActualizationStartRequest,
    PerformActualizationRequest,
    PublishVndActualizationRequest,
    RequestActualizationAccessRequest,
    StartActualizationRequest,
    VndActualizationRequestResponse,
    VndActualizationStateResponse,
} from "./actualizationServiceTypes";
import type {VndActualizationRecordResponse} from "@/service/vndService/vndServiceType.ts";
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

    /** Запросить доступ к актуализации у главного редактора (по запросу права) — всегда
     * "с последующим согласованием", без выбора и без пожелания по сдвигу срока (решает
     * главный редактор при одобрении), поэтому тело запроса пустое. */
    async requestAccess(vndId: number): Promise<VndActualizationRequestResponse> {
        const {data} = await axiosInstance.post<VndActualizationRequestResponse>(
            `${this.basePath(vndId)}/request-access`,
            {} satisfies RequestActualizationAccessRequest,
        );
        return data;
    }

    /** Выполнить актуализацию (шаг Б для цикла, начатого напрямую через start) — зафиксировать
     * финальные сдвиг срока/"без изменений". Доступно ответственному за актуализацию или
     * главному редактору ВНД. */
    async perform(
        vndId: number,
        request: PerformActualizationRequest,
    ): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.post<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/perform`,
            request,
        );
        return data;
    }

    /** Изменить уже зафиксированные на шаге "Выполнить актуализацию" настройки (сдвиг срока/"без
     * изменений") — пока цикл ещё не ушёл дальше OnActualization. Доступно ответственному за
     * актуализацию или главному редактору ВНД. */
    async updatePerformedSettings(
        vndId: number,
        request: PerformActualizationRequest,
    ): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.put<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/performed-settings`,
            request,
        );
        return data;
    }

    /** Подтвердить старт актуализации после одобренной заявки на доступ — совмещает старт цикла
     * и шаг "Выполнить актуализацию" (для пути "по заявке") */
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

    /** Подтвердить, что заявленная "актуализация без изменений" прошла без изменений (только
     * когда для цикла не требуется согласование) — OnActualization → Consolidation напрямую,
     * без загрузки новой редакции. */
    async confirmNoChanges(vndId: number): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.post<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/confirm-no-changes`,
        );
        return data;
    }

    /** Отменить черновик редакции, уже загруженный в рамках текущего цикла актуализации (со
     * всеми файлами и ТИД), и вернуть план цикла на "без изменений" — для переключения
     * "Актуализация без изменений" обратно на включено уже после загрузки редакции. Необратимо -
     * вызывается только после подтверждения пользователем (см. ActualizationSettingsPanel). */
    async discardDraft(vndId: number): Promise<VndActualizationStateResponse> {
        const {data} = await axiosInstance.post<VndActualizationStateResponse>(
            `${this.basePath(vndId)}/discard-draft`,
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

    /** История циклов актуализации документа — кто и когда актуализировал, от новых к старым */
    async getHistory(vndId: number): Promise<VndActualizationRecordResponse[]> {
        const {data} = await axiosInstance.get<VndActualizationRecordResponse[]>(
            `${this.basePath(vndId)}/history`,
        );
        return data;
    }

    /** Все заявки на доступ к актуализации этого документа (любого статуса) — кто запросил
     * доступ и кто его выдал/отклонил. В отличие от getPendingRequests — доступно не только
     * главному редактору, а всем, кто может просматривать сам ВНД. */
    async getRequests(vndId: number): Promise<VndActualizationRequestResponse[]> {
        const {data} = await axiosInstance.get<VndActualizationRequestResponse[]>(
            `${this.basePath(vndId)}/requests`,
        );
        return data;
    }
}

export const actualizationService = new ActualizationService();
