import {apiClient} from "@/service/apiClient.ts";

/**
 * Состав коллегиальных органов.
 *
 * Отдельная настройка, а не права роли: банк меняет состав решением — протоколом
 * или приказом, — и перенастройка доступа тут ни при чём. Пока состав задавался
 * правами, членами Правления числились администраторы системы.
 */

export type MeetingBodyCode = "Board" | "Kpa" | "CreditCommittee";

export type BodyRoleCode = "Member" | "Chairman" | "Secretary";

export interface BodyMember {
    id: number;
    body: MeetingBodyCode;
    bodyTitle: string;

    userId: number;
    userName: string;
    position: string | null;
    orgUnit: string | null;

    role: BodyRoleCode;
    roleTitle: string;

    from: string | null;
    to: string | null;
    basis: string | null;

    /** Состоит ли сейчас — по датам «с» и «по». */
    isCurrent: boolean;
}

export interface BodyMemberSaveRequest {
    body: MeetingBodyCode;
    userId: number;
    role: BodyRoleCode;
    from?: string | null;
    to?: string | null;
    basis?: string | null;
}

/** Строка явки на заседании: член органа и была ли отметка об отсутствии. */
export interface MeetingAttendee {
    userId: number;
    userName: string;
    position: string | null;
    role: BodyRoleCode;
    roleTitle: string;
    /** Присутствовал. По умолчанию да — отмечают только отсутствие. */
    present: boolean;
    note: string | null;
}

export const BODY_TITLE: Record<MeetingBodyCode, string> = {
    Board: "Правление",
    Kpa: "Комитет по проблемным активам",
    CreditCommittee: "Кредитный комитет",
};

export const BODY_ROLE_TITLE: Record<BodyRoleCode, string> = {
    Chairman: "Председатель",
    Member: "Член органа",
    Secretary: "Секретарь",
};

export const bodyMemberService = {
    list: (body?: MeetingBodyCode) =>
        apiClient.get<BodyMember[]>("/meetings/body-members", {params: body ? {body} : undefined})
            .then(r => r.data),

    add: (request: BodyMemberSaveRequest) =>
        apiClient.post<BodyMember>("/meetings/body-members", request).then(r => r.data),

    update: (id: number, request: Partial<BodyMemberSaveRequest>) =>
        apiClient.put<BodyMember>(`/meetings/body-members/${id}`, request).then(r => r.data),

    remove: (id: number) => apiClient.delete(`/meetings/body-members/${id}`).then(() => undefined),

    attendance: (meetingId: number) =>
        apiClient.get<MeetingAttendee[]>(`/meetings/${meetingId}/attendance`).then(r => r.data),

    markAttendance: (meetingId: number, userId: number, present: boolean, note?: string | null) =>
        apiClient.post<MeetingAttendee[]>(`/meetings/${meetingId}/attendance`, {userId, present, note})
            .then(r => r.data),
};
