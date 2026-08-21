import {apiClient} from "@/service/apiClient.ts";

/**
 * Ознакомление с документами (Б-19).
 *
 * Приказ вступает в силу не когда подписан, а когда о нём узнали те, кого он
 * касается. Роспись сотрудника — единственное, чем это доказывается.
 */

export type AckState = "Pending" | "Acknowledged" | "Refused" | "Cancelled";

export const ACK_STATE_LABEL: Record<AckState, string> = {
    Pending: "Ждёт ознакомления",
    Acknowledged: "Ознакомлен",
    Refused: "Отказался",
    Cancelled: "Снят",
};

/** Строка «моих ознакомлений» — то, что сотрудник обязан прочитать. */
export interface MyAck {
    id: number;
    sheetId: number;
    documentId: number;
    documentTitle: string;
    documentNumber: string | null;
    documentType: string;

    /** Идентификатор карточки в своём разделе: у СЗ и закупки он не равен documentId. */
    entityId: number | null;

    /** Что именно требуется от сотрудника. */
    instruction: string | null;

    dueDate: string | null;
    requireSignature: boolean;

    state: AckState;
    respondedAt: string | null;
    comment: string | null;
    createdAt: string;

    /** Просрочку считает сервер: у клиента может быть другой часовой пояс. */
    overdue: boolean;
}

/** Лист целиком — взгляд кадровой службы. */
export interface SheetSummary {
    id: number;
    instruction: string | null;
    dueDate: string | null;
    requireSignature: boolean;
    createdAt: string;
    closedAt: string | null;
    authorName: string | null;
    всего: number;
    ознакомились: number;
    отказались: number;
    ждём: number;
}

export interface SheetEntry {
    id: number;
    userId: number;
    userName: string;
    orgUnit: string | null;
    state: AckState;
    respondedAt: string | null;
    comment: string | null;
    signatureId: number | null;
}

export interface SheetDetails {
    sheet: {
        id: number;
        documentId: number;
        documentTitle: string;
        documentNumber: string | null;
        instruction: string | null;
        dueDate: string | null;
        requireSignature: boolean;
        createdAt: string;
        closedAt: string | null;
    };
    entries: SheetEntry[];
}

/** Кого включить в лист. Способы складываются, а не исключают друг друга. */
export interface AckTargets {
    userIds: number[];
    orgUnitIds: number[];
    userGroupIds: number[];
}

/**
 * Куда вести по документу. У каждого типа свой раздел и свой идентификатор —
 * documentId в адресе не годится. Пусто — карточки в системе нет: так бывает у
 * документов, заведённых вложением.
 */
export function ackDocumentPath(item: MyAck): string | null {
    if (item.entityId === null) return null;

    if (item.documentType === "Sz") return `/sz/${item.entityId}`;
    if (item.documentType === "Procurement") return `/prc/${item.entityId}`;

    return null;
}

const BASE = "/acknowledgements";

export const acknowledgementService = {
    async mine(includeAnswered = false): Promise<MyAck[]> {
        const {data} = await apiClient.get<MyAck[]>(`${BASE}/mine`, {params: {includeAnswered}});
        return data;
    },

    async byDocument(documentId: number): Promise<SheetSummary[]> {
        const {data} = await apiClient.get<SheetSummary[]>(`${BASE}/document/${documentId}`);
        return data;
    },

    async sheet(sheetId: number): Promise<SheetDetails> {
        const {data} = await apiClient.get<SheetDetails>(`${BASE}/${sheetId}`);
        return data;
    },

    async create(payload: {
        documentId: number;
        instruction?: string;
        dueDate?: string;
        requireSignature: boolean;
        targets: AckTargets;
    }): Promise<{id: number}> {
        const {data} = await apiClient.post<{id: number}>(BASE, payload);
        return data;
    },

    async addParticipants(sheetId: number, targets: AckTargets): Promise<number> {
        const {data} = await apiClient.post<{добавлено: number}>(`${BASE}/${sheetId}/participants`, targets);
        return data.добавлено;
    },

    async acknowledge(entryId: number): Promise<void> {
        await apiClient.post(`${BASE}/entries/${entryId}/acknowledge`, null);
    },

    async refuse(entryId: number, reason: string): Promise<void> {
        await apiClient.post(`${BASE}/entries/${entryId}/refuse`, {reason});
    },

    async cancel(entryId: number, reason?: string): Promise<void> {
        await apiClient.post(`${BASE}/entries/${entryId}/cancel`, {reason});
    },

    async close(sheetId: number): Promise<void> {
        await apiClient.post(`${BASE}/${sheetId}/close`, null);
    },
};
