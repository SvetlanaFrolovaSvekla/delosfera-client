import {apiClient} from "@/service/apiClient.ts";

export type RouteStatus =
    | "Draft" | "Running" | "OnRevision" | "Approved" | "Rejected" | "Interrupted" | "Arbitration";

export type ParticipantState = "Pending" | "Active" | "Done" | "Cancelled";

export type ResolutionType = "Approved" | "ApprovedWithRemarks" | "Rejected" | "Veto";

export interface Remark {
    id: number;
    text: string;
    state: "Open" | "Resolved";
}

export interface Resolution {
    type: ResolutionType;
    comment: string | null;
    remarks: Remark[];

    /** Подпись под резолюцией — реквизиты для штампа. */
    signature: SignatureStamp | null;
}

/**
 * Штамп подписи. Реквизиты приходят с сервера такими, какими были в момент
 * подписания: должность подписанта может смениться, штамп меняться не должен.
 */
export interface SignatureStamp {
    id: number;
    levelTitle: string;
    fullName: string | null;
    position: string | null;
    at: string;

    /** Начало отпечатка подписанного — для сверки. */
    fingerprint: string | null;

    revoked: boolean;
    revokedReason: string | null;

    /**
     * Время, удостоверённое службой меток. Отличается от at тем, что его назвал не
     * наш сервер: именно оно доказывает, что подпись поставлена, пока сертификат
     * действовал. Пусто — метки нет.
     */
    timestampedAt: string | null;

    timestampAuthority: string | null;

    /** Каким удостоверяющим центром подтверждён сертификат подписанта. */
    trustAuthority: string | null;

    /** Что в подписи осталось непроверенным: цепочка, отзыв, метка. */
    caveats: string[];
}

export interface RouteParticipant {
    id: number;
    userId: number | null;
    /** ФИО с сервера — справочник пользователей доступен не каждой роли. */
    userFullName: string | null;
    required: boolean;
    state: ParticipantState;
    resolution: Resolution | null;
}

export interface RouteStep {
    id: number;
    order: number;
    mode: string;
    kind: string;
    isFinalMethodology: boolean;

    /**
     * Чем закрывается этап. Пусто — подписи не требуется; «Simple» ставится самим
     * нажатием кнопки; «Qualified» требует криптопровайдера на рабочем месте, и
     * тогда решению предшествует подписание.
     */
    requiredSignatureLevel: "Simple" | "Qualified" | null;

    participants: RouteParticipant[];
}

export interface RouteInstance {
    id: number;
    documentId: number;
    status: RouteStatus;
    currentStepOrder: number;
    steps: RouteStep[];
}

export const RESOLUTION_LABEL: Record<ResolutionType, string> = {
    Approved: "Согласовано",
    ApprovedWithRemarks: "Согласовано с замечаниями",
    Rejected: "Отклонено",
    Veto: "Вето",
};

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
    Draft: "Черновик маршрута",
    Running: "Идёт согласование",
    OnRevision: "На доработке у инициатора",
    Approved: "Согласовано",
    Rejected: "Отклонено",
    Interrupted: "Прерван",
    Arbitration: "Арбитраж",
};

export const PARTICIPANT_STATE_LABEL: Record<ParticipantState, string> = {
    Pending: "Ожидает очереди",
    Active: "Ждёт решения",
    Done: "Решение принято",
    Cancelled: "Аннулировано",
};

const BASE = "/workflow";

export const workflowService = {
    async instance(id: number): Promise<RouteInstance> {
        const {data} = await apiClient.get<RouteInstance>(`${BASE}/instances/${id}`);
        return data;
    },

    /** Резолюция участника: согласовано / с замечаниями / отклонить / вето. */
    /**
     * signatureId прикладывается, когда этап закрывается квалифицированной подписью:
     * её ставят до решения, отдельным действием с криптопровайдером. Для простой
     * подписи он не нужен — её создаёт сам сервер в момент решения.
     */
    async resolve(
        participantId: number, type: ResolutionType, comment?: string, signatureId?: number,
    ): Promise<void> {
        await apiClient.post(`${BASE}/participants/${participantId}/resolve`, {type, comment, signatureId});
    },

    /** Инициатор подтверждает, что замечание устранено — маршрут продолжится с того же этапа. */
    async confirmRemark(remarkId: number): Promise<void> {
        await apiClient.post(`${BASE}/remarks/${remarkId}/confirm`);
    },

    /**
     * Шаблоны маршрутов — для выбора при настройке типа документа и при отправке.
     *
     * Без отбора отдаются все: у своего типа документа маршрут может быть любым,
     * и ограничивать выбор встроенными видами значило бы запретить банку то,
     * ради чего типы и заводятся.
     */
    async templates(documentType?: string): Promise<RouteTemplateBrief[]> {
        const {data} = await apiClient.get<RouteTemplateBrief[]>(`${BASE}/templates`, {
            params: documentType ? {documentType} : undefined,
        });
        return data;
    },

    /** Маршрут с этапами и согласующими — для экрана настройки. */
    async template(id: number): Promise<RouteTemplateDetails> {
        const {data} = await apiClient.get<RouteTemplateDetails>(`${BASE}/templates/${id}`);
        return data;
    },

    async createTemplate(request: RouteTemplateSaveRequest): Promise<number> {
        const {data} = await apiClient.post<number>(`${BASE}/templates`, request);
        return data;
    },

    /** Маршрут переписывается целиком: он и есть порядок этапов. */
    async updateTemplate(id: number, request: RouteTemplateSaveRequest): Promise<void> {
        await apiClient.put(`${BASE}/templates/${id}`, request);
    },

    async deleteTemplate(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/templates/${id}`);
    },
};

/** Кто согласует на этапе: человек, подразделение или роль. */
export interface TemplateParticipant {
    id?: number;
    userId: number | null;
    userName?: string | null;
    unitId: number | null;
    unitTitle?: string | null;
    /** Ролевая ссылка: роль разрешается в человека при запуске маршрута. */
    roleRef: string | null;
    /** Обязателен: без его решения этап не закрывается. */
    required: boolean;
}

export interface TemplateStep {
    id?: number;
    order: number;
    /** Sequential — по очереди, Parallel — всем сразу. */
    mode: "Sequential" | "Parallel";
    kind: "Approval" | "FinalControl" | "Signing" | "Board";
    isFinalMethodology: boolean;
    /** Норматив на этап в часах; пусто — без срока. */
    timeNormHours: number | null;
    requiredSignatureLevel: "Simple" | "Qualified" | null;
    participants: TemplateParticipant[];
}

export interface RouteTemplateDetails {
    id: number;
    name: string;
    documentType: string;
    isGlobalRule: boolean;
    steps: TemplateStep[];
}

export interface RouteTemplateSaveRequest {
    name: string;
    documentType: string;
    isGlobalRule: boolean;
    steps: TemplateStep[];
}

/**
 * Роли, которыми задают согласующего вместо конкретного человека.
 *
 * Так маршрут переживает смену людей в должностях: «руководитель подразделения
 * автора» остаётся верным и после того, как руководитель сменился.
 */
export const ROUTE_ROLES: {value: string; title: string}[] = [
    {value: "author-head", title: "Руководитель подразделения автора"},
    {value: "author-curator", title: "Куратор подразделения автора"},
    {value: "target-unit-head", title: "Руководитель подразделения из документа"},
    {value: "target-unit-curator", title: "Куратор подразделения из документа"},
    {value: "board-chairman", title: "Председатель Правления"},
];

export const STEP_KIND_TITLE: Record<TemplateStep["kind"], string> = {
    Approval: "Согласование",
    FinalControl: "Финальный контроль",
    Signing: "Подписание",
    Board: "Вынесение на орган",
};

/** Шаблон маршрута в списке выбора. */
export interface RouteTemplateBrief {
    id: number;
    name: string;
    /** Вид документа, под который заведён шаблон. */
    documentType: string;
    /** Применяется ко всем документам вида, а не выбирается вручную. */
    isGlobalRule: boolean;
}
