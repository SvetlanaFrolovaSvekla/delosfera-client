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

    /** Кворум развилки: сколько согласований достаточно; пусто — нужны все. */
    quorum: number | null;

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

const BASE = "/componentsWorkflow";

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

    /**
     * Каталог ролей согласующих с их названиями — источник для конструктора маршрута.
     * Список задаётся на сервере (RouteRoles.Title), чтобы не расходиться с движком;
     * при недоступности эндпоинта клиент падает на встроенный ROUTE_ROLES.
     */
    async routeRoles(): Promise<RouteRoleOption[]> {
        try {
            const {data} = await apiClient.get<RouteRoleOption[]>(`${BASE}/route-roles`);
            return data.length > 0 ? data : ROUTE_ROLES;
        } catch {
            return ROUTE_ROLES;
        }
    },

    /**
     * Условия включения этапов для вида документа. У закупки свои (хозтовары, порог
     * полномочий), у СЗ и ВНД условных этапов нет — вернётся пустой список, и
     * конструктор покажет только «Без условия».
     */
    async routeConditions(documentType: string): Promise<RouteConditionOption[]> {
        try {
            const {data} = await apiClient.get<RouteConditionOption[]>(`${BASE}/route-conditions`, {
                params: {documentType},
            });
            return data;
        } catch {
            return [];
        }
    },

    /**
     * Предпросмотр разрешения ролей: в кого развернётся роль на документе выбранного
     * подразделения. Показывает настройщику, что роль — конкретный человек, а не пустышка.
     */
    async previewRoles(request: RolePreviewRequest): Promise<RolePreviewItem[]> {
        const {data} = await apiClient.post<RolePreviewItem[]>(`${BASE}/route-roles/preview`, request);
        return data;
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
    /**
     * Кворум развилки: сколько согласований из назначенных достаточно, чтобы этап
     * прошёл. Пусто — нужны все. Действует только на mode === "Parallel".
     */
    quorum: number | null;
    requiredSignatureLevel: "Simple" | "Qualified" | null;
    /**
     * Условие включения этапа. Пусто — этап всегда в маршруте; строка (например
     * «household-goods» или «board-authority») — этап включается, только когда
     * поток сообщает это условие.
     */
    condition?: string | null;
    participants: TemplateParticipant[];
}

export interface RouteTemplateDetails {
    id: number;
    name: string;
    documentType: string;
    isGlobalRule: boolean;
    /**
     * Инициирующее подразделение шаблона: пусто — правило действует на весь вид
     * документа; число — шаблон только для этого подразделения-инициатора.
     */
    orgUnitId: number | null;
    /** Название привязанного подразделения — для показа при редактировании. */
    orgUnitTitle: string | null;
    steps: TemplateStep[];
}

export interface RouteTemplateSaveRequest {
    name: string;
    documentType: string;
    isGlobalRule: boolean;
    /** Инициирующее подразделение: null — правило для всего вида документа. */
    orgUnitId?: number | null;
    steps: TemplateStep[];
}

/**
 * Роли, которыми задают согласующего вместо конкретного человека.
 *
 * Так маршрут переживает смену людей в должностях: «руководитель подразделения
 * автора» остаётся верным и после того, как руководитель сменился.
 */
export interface RouteRoleOption {
    value: string;
    title: string;
}

export const ROUTE_ROLES: RouteRoleOption[] = [
    {value: "author-head", title: "Руководитель подразделения автора"},
    {value: "author-curator", title: "Куратор подразделения автора"},
    {value: "target-unit-head", title: "Руководитель подразделения из документа"},
    {value: "target-unit-curator", title: "Куратор подразделения из документа"},
    {value: "board-chairman", title: "Председатель Правления"},
    {value: "hr-officer", title: "Кадровик УЧР"},
];

/** Условие включения этапа: код + человеческое название, с сервера по виду документа. */
export interface RouteConditionOption {
    value: string;
    title: string;
}

/** Запрос предпросмотра ролей: контекст подразделений + список проверяемых ролей. */
export interface RolePreviewRequest {
    orgUnitId?: number | null;
    targetUnitId?: number | null;
    roles: string[];
}

/** Результат разрешения одной роли для предпросмотра. */
export interface RolePreviewItem {
    roleRef: string;
    title: string;
    userId: number | null;
    fullName: string | null;
    resolved: boolean;
    /** Почему роль не разрешилась (пустой справочник / зависит от карточки документа). */
    note: string | null;
}

/** Уровень подписи, которым закрывается этап; null — без подписи. */
export const SIGNATURE_LEVEL_TITLE: Record<NonNullable<TemplateStep["requiredSignatureLevel"]>, string> = {
    Simple: "Простая подпись (ПЭП)",
    Qualified: "Квалифицированная (ЭЦП)",
};

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
    /** Инициирующее подразделение шаблона; пусто — правило для всего вида документа. */
    orgUnitId: number | null;
}
