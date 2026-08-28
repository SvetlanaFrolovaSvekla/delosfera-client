import {apiClient} from "@/service/apiClient.ts";

/**
 * Книга регистрации входящей и исходящей корреспонденции.
 *
 * Одна книга на все категории: обычная переписка, запросы регулятора, обращения
 * клиентов, запросы по счетам. Различаются они сроками и доступом, а не
 * устройством — искать письмо в трёх реестрах хуже, чем фильтровать в одном.
 */

export type LetterDirection = "Incoming" | "Outgoing";

export const DIRECTION_TITLE: Record<LetterDirection, string> = {
    Incoming: "Входящее",
    Outgoing: "Исходящее",
};

export type LetterCategory =
    | "Ordinary" | "RegulatorRequest" | "ClientAppeal" | "BankSecrecyInquiry" | "Claim";

export const CATEGORY_TITLE: Record<LetterCategory, string> = {
    Ordinary: "Обычная переписка",
    RegulatorRequest: "Запрос или предписание НБКР",
    ClientAppeal: "Обращение клиента",
    BankSecrecyInquiry: "Запрос по счетам",
    Claim: "Претензия или иск",
};

/** Короткие ярлыки для таблицы — полные названия там не помещаются. */
export const CATEGORY_SHORT: Record<LetterCategory, string> = {
    Ordinary: "Переписка",
    RegulatorRequest: "НБКР",
    ClientAppeal: "Обращение",
    BankSecrecyInquiry: "По счетам",
    Claim: "Претензия",
};

/** Порядок в фильтре — от того, где горят сроки, к обычному. */
export const CATEGORY_ORDER: LetterCategory[] = [
    "RegulatorRequest", "ClientAppeal", "BankSecrecyInquiry", "Claim", "Ordinary",
];

export type LetterStatus =
    | "Draft" | "Registered" | "OnResolution" | "OnExecution" | "Answered" | "Closed" | "Sent";

export const LETTER_STATUS_TITLE: Record<LetterStatus, string> = {
    Draft: "Проект",
    Registered: "Зарегистрировано",
    OnResolution: "На резолюции",
    OnExecution: "На исполнении",
    Answered: "Отвечено",
    Closed: "Закрыто",
    Sent: "Отправлено",
};

export type DeliveryMethod =
    | "Post" | "Courier" | "Email" | "Tunduk" | "Handed" | "Fax" | "Other";

export const DELIVERY_TITLE: Record<DeliveryMethod, string> = {
    Post: "Почта",
    Courier: "Нарочным",
    Email: "Электронная почта",
    Tunduk: "Тундук",
    Handed: "Вручено лично",
    Fax: "Факс",
    Other: "Иное",
};

export type CorrespondentKind =
    | "Regulator" | "Government" | "Bank" | "ClientCompany" | "ClientPerson"
    | "Counterparty" | "Other";

export const CORRESPONDENT_KIND_TITLE: Record<CorrespondentKind, string> = {
    Regulator: "Национальный банк",
    Government: "Государственный орган",
    Bank: "Банк",
    ClientCompany: "Клиент — юрлицо",
    ClientPerson: "Клиент — физлицо",
    Counterparty: "Контрагент",
    Other: "Прочее",
};

export interface Correspondent {
    id: number;
    title: string;
    shortTitle: string | null;
    kind: CorrespondentKind;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    contactPerson: string | null;
}

export interface Letter {
    id: number;
    direction: LetterDirection;
    category: LetterCategory;
    regNumber: string | null;
    registeredOn: string | null;

    correspondentId: number;
    correspondentTitle: string | null;
    correspondentKind: CorrespondentKind | null;

    theirNumber: string | null;
    theirDate: string | null;

    subject: string;
    summary: string | null;
    deliveryMethod: DeliveryMethod;
    sheetCount: number | null;
    enclosures: string | null;

    status: LetterStatus;

    resolution: string | null;
    resolutionAt: string | null;
    resolutionBy: string | null;

    responsibleUserId: number | null;
    responsibleName: string | null;
    responsibleUnit: string | null;

    dueDate: string | null;
    isControlled: boolean;
    isOverdue: boolean;
    /** Дней до срока. Отрицательное — просрочено на столько. */
    daysLeft: number | null;

    executionNote: string | null;
    executedAt: string | null;

    inReplyToId: number | null;
    inReplyToNumber: string | null;
    replyCount: number;
    sourceSzId: number | null;

    fileCount: number;
}

export interface LetterSaveRequest {
    direction: LetterDirection;
    category: LetterCategory;
    registeredOn?: string | null;
    correspondentId: number;
    theirNumber?: string | null;
    theirDate?: string | null;
    subject: string;
    summary?: string | null;
    deliveryMethod: DeliveryMethod;
    sheetCount?: number | null;
    enclosures?: string | null;
    responsibleUserId?: number | null;
    responsibleUnitId?: number | null;
    dueDate?: string | null;
    isControlled?: boolean | null;
    inReplyToId?: number | null;
    sourceSzId?: number | null;
    nomenclatureCaseId?: number | null;
    asDraft?: boolean;
}

export interface LetterFilter {
    direction?: LetterDirection;
    categories?: LetterCategory[];
    statuses?: LetterStatus[];
    correspondentId?: number;
    responsibleUserId?: number;
    unitId?: number;
    from?: string;
    to?: string;
    onlyControlled?: boolean;
    onlyOverdue?: boolean;
    text?: string;
    page?: number;
    pageSize?: number;
}

const BASE = "/correspondence";

export const correspondenceService = {
    async search(filter: LetterFilter = {}) {
        const {data} = await apiClient.post<{
            total: number; page: number; pageSize: number; items: Letter[];
        }>(`${BASE}/search`, filter);
        return data;
    },

    async get(id: number) {
        const {data} = await apiClient.get<Letter>(`${BASE}/${id}`);
        return data;
    },

    /** Что просрочено — вопрос, который задают каждое утро. */
    async overdue() {
        const {data} = await apiClient.get<Letter[]>(`${BASE}/overdue`);
        return data;
    },

    async register(request: LetterSaveRequest) {
        const {data} = await apiClient.post<Letter>(BASE, request);
        return data;
    },

    async update(id: number, request: LetterSaveRequest) {
        const {data} = await apiClient.put<Letter>(`${BASE}/${id}`, request);
        return data;
    },

    /** Резолюция руководителя: кому, что и к какому сроку. */
    async resolve(id: number, resolution: string, options: {
        responsibleUserId?: number;
        responsibleUnitId?: number;
        dueDate?: string;
    } = {}) {
        const {data} = await apiClient.post<Letter>(`${BASE}/${id}/resolve`, {resolution, ...options});
        return data;
    },

    async close(id: number, note?: string) {
        const {data} = await apiClient.post<Letter>(`${BASE}/${id}/close`, {note});
        return data;
    },

    async correspondents(text?: string, kind?: CorrespondentKind) {
        const {data} = await apiClient.get<Correspondent[]>(`${BASE}/correspondents`, {
            params: {text, kind},
        });
        return data;
    },

    async createCorrespondent(request: Omit<Correspondent, "id"> & {
        address?: string | null; note?: string | null; isActive?: boolean;
    }) {
        const {data} = await apiClient.post<{id: number}>(`${BASE}/correspondents`, request);
        return data;
    },
};
