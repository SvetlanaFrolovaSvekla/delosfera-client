import {apiClient} from "@/service/apiClient.ts";

/**
 * Приказы по личному составу.
 *
 * Записка — просьба, приказ — решение по ней. Между «прошу направить в
 * командировку» и фактом командировки стоит подписанный и зарегистрированный
 * приказ, с которым сотрудника знакомят под роспись.
 *
 * Книга ведётся отдельно от приказов по основной деятельности: срок хранения
 * у неё особый, и нумерация своя — «12-лс».
 */

export type HrOrderKind =
    | "Hiring" | "Transfer" | "Dismissal" | "Leave" | "BusinessTrip"
    | "Salary" | "Bonus" | "Discipline" | "Training" | "Combination" | "Other";

export type HrOrderStatus = "Draft" | "OnSigning" | "Signed" | "Cancelled";

export const ORDER_STATUS_TITLE: Record<HrOrderStatus, string> = {
    Draft: "Проект",
    OnSigning: "На подписании",
    Signed: "Подписан",
    Cancelled: "Отменён",
};

export const ORDER_STATUS_ORDER: HrOrderStatus[] = ["Signed", "Draft", "OnSigning", "Cancelled"];

/** Вид приказа со схемой полей. Схему отдаёт сервер вместе со списком. */
export interface HrOrderKindInfo {
    kind: HrOrderKind;
    title: string;
    /** Ключ схемы полей из справочника кадровых записок. Пусто — своих полей нет. */
    formKey: string | null;
}

export interface HrOrderEmployee {
    id?: number;
    userId: number;
    name: string | null;
    positionSnapshot: string | null;
    unitSnapshot: string | null;
    fieldValues?: string | null;
}

export interface HrOrderListItem {
    id: number;
    kind: HrOrderKind;
    status: HrOrderStatus;
    regNumber: string | null;
    orderDate: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    title: string;
    basis: string | null;
    signer: string | null;
    signedAt: string | null;
    acknowledgementSheetId: number | null;
    employees: HrOrderEmployee[];
}

export interface HrOrder extends HrOrderListItem {
    year: number;
    body: string | null;
    sourceSzId: number | null;
    cancelsOrderId: number | null;
    nomenclatureCaseId: number | null;
    signerUserId: number | null;
}

export interface HrOrderSaveRequest {
    kind: HrOrderKind;
    title: string;
    body?: string | null;
    basis?: string | null;
    orderDate?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    signerUserId?: number | null;
    sourceSzId?: number | null;
    cancelsOrderId?: number | null;
    nomenclatureCaseId?: number | null;
    employees: {userId: number; fields?: unknown}[];
}

const BASE = "/hr/orders";

export const hrOrderService = {
    async kinds() {
        const {data} = await apiClient.get<HrOrderKindInfo[]>(`${BASE}/kinds`);
        return data;
    },

    async list(params: {
        kind?: HrOrderKind;
        status?: HrOrderStatus;
        userId?: number;
        year?: number;
        text?: string;
        page?: number;
        pageSize?: number;
    } = {}) {
        const {data} = await apiClient.get<{
            total: number; page: number; pageSize: number; items: HrOrderListItem[];
        }>(BASE, {params});
        return data;
    },

    async get(id: number) {
        const {data} = await apiClient.get<HrOrder>(`${BASE}/${id}`);
        return data;
    },

    async create(request: HrOrderSaveRequest) {
        const {data} = await apiClient.post<{id: number}>(BASE, request);
        return data;
    },

    async update(id: number, request: HrOrderSaveRequest) {
        await apiClient.put(`${BASE}/${id}`, request);
    },

    /** Подписать: присвоить номер по книге и закрыть от правки. */
    async sign(id: number) {
        const {data} = await apiClient.post<{regNumber: string; signedAt: string}>(`${BASE}/${id}/sign`);
        return data;
    },

    /** Кадровая история сотрудника. Свою человек видит без особого права. */
    async byEmployee(userId: number) {
        const {data} = await apiClient.get<{
            id: number; regNumber: string | null; orderDate: string | null;
            effectiveFrom: string | null; effectiveTo: string | null;
            title: string; kind: HrOrderKind;
        }[]>(`${BASE}/by-employee/${userId}`);
        return data;
    },
};
