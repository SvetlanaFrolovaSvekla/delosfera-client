import {apiClient} from "@/service/apiClient.ts";
import type {MeetingBody} from "@/service/meetingsService/meetingsService.ts";

/**
 * Отбор служебных записок в повестку.
 *
 * Сотрудник ставит на записке отметку «вынести на Правление» — и она встаёт в
 * очередь к секретарю этого органа. Секретарь решает, включать ли её, на какое
 * заседание и под какой формулировкой: повестку определяет он, а не тот, кто
 * поставил галочку.
 */

export interface AgendaCandidate {
    szId: number;
    documentId: number;
    number: string | null;
    registeredOn: string | null;
    subject: string | null;
    /** Формулировка, предложенная автором. Пусто — секретарь возьмёт тему записки. */
    proposedQuestion: string | null;
    authorName: string | null;
    authorUnit: string | null;
    signerName: string | null;
    status: string;
    requestedAt: string | null;
    requestedBy: string | null;
    fileCount: number;
}

export const agendaCandidateService = {
    /** Очередь записок, ожидающих отбора в повестку органа. */
    async list(body: MeetingBody) {
        const {data} = await apiClient.get<AgendaCandidate[]>("/meetings/candidates", {
            params: {body},
        });
        return data;
    },

    /** Включить записку в повестку заседания отдельным вопросом. */
    async take(meetingId: number, szId: number, question?: string, order?: number) {
        const {data} = await apiClient.post<{id: number; order: number; topic: string}>(
            `/meetings/${meetingId}/agenda/from-sz`,
            {szId, question, order},
        );
        return data;
    },

    /** Отклонить заявку: снять с записки отметку о вынесении на орган. */
    async decline(szId: number, body: MeetingBody) {
        await apiClient.post(`/meetings/candidates/${szId}/decline`, null, {params: {body}});
    },
};

/** Поставить или снять отметку «вынести на коллегиальный орган» на записке. */
export async function submitSzToBody(szId: number, body: MeetingBody | null, question?: string) {
    const {data} = await apiClient.post<{
        body: string | null; question: string | null; requestedAt: string | null;
    }>(`/sz/${szId}/submit-to-body`, {body, question});
    return data;
}
