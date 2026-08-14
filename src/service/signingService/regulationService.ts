import {apiClient} from "@/service/apiClient.ts";

/**
 * Регламент применения простой электронной подписи.
 *
 * Простая подпись имеет силу, когда стороны договорились о правилах её
 * применения. Согласие сотрудника — и есть эта договорённость, поэтому без него
 * сервер отказывается подписывать.
 */
export interface RegulationState {
    /** Регламент заведён и действует; иначе согласие не спрашивается. */
    required: boolean;

    accepted: boolean;

    version: string | null;
    title: string | null;
    body: string | null;

    acceptedAt: string | null;
}

export const regulationService = {
    async get(): Promise<RegulationState> {
        const {data} = await apiClient.get<RegulationState>("/signing/regulation");
        return data;
    },

    async accept(version: string): Promise<RegulationState> {
        const {data} = await apiClient.post<RegulationState>("/signing/regulation/accept", {version});
        return data;
    },
};
