// Предложения по ВНД: отправка с открытого ВНД ("+ Предложения по ВНД") и страница
// "Нормотворчество (ВНД)" → "Предложения по ВНД" для главного редактора (право ManageVndProposals).
import {axiosInstance} from "@/service/axiosInstance.ts";

/** Язык вкладки редакции, из которой взята цитата. */
export type VndProposalQuoteTarget = "ru" | "kg" | "en";

export interface VndProposalQuote {
    documentTarget: VndProposalQuoteTarget;
    text: string;
    note?: string | null;
}

export interface VndProposalAttachment {
    fileId: number;
    fileName: string;
    sizeBytes: number;
}

export interface VndProposal {
    id: number;
    vndId: number;
    vndCode: string;
    vndTitle: string;
    redactionId: number | null;
    redactionCode: string | null;
    text: string;
    quotes: VndProposalQuote[];
    attachments: VndProposalAttachment[];
    authorUserId: number;
    authorName: string;
    authorPosition: string | null;
    authorOrgUnit: string | null;
    createdAt: string;
    isRead: boolean;
    readAt: string | null;
    readByName: string | null;
}

export type VndProposalStatusFilter = "all" | "unread" | "read";

export interface VndProposalFilter {
    status?: VndProposalStatusFilter;
    search?: string;
    vndId?: number;
    page?: number;
    pageSize?: number;
}

export interface VndProposalPage {
    items: VndProposal[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface VndProposalCounts {
    total: number;
    unread: number;
}

export interface CreateVndProposalRequest {
    text: string;
    redactionId?: number | null;
    quotes: VndProposalQuote[];
    files: File[];
}

/** Ограничения - те же, что и на сервере (VndProposalLimits). */
export const VND_PROPOSAL_LIMITS = {
    maxTextLength: 5000,
    maxQuotes: 30,
    maxQuoteNoteLength: 2000,
    maxAttachments: 10,
    maxAttachmentSizeBytes: 50 * 1024 * 1024,
} as const;

/** Событие для сайдбара: счётчик непрочитанных предложений нужно перечитать. */
export const VND_PROPOSALS_CHANGED_EVENT = "vnd-proposals-changed";

export function notifyVndProposalsChanged() {
    window.dispatchEvent(new Event(VND_PROPOSALS_CHANGED_EVENT));
}

export const vndProposalService = {
    async create(vndId: number, request: CreateVndProposalRequest): Promise<{id: number; createdAt: string}> {
        const formData = new FormData();
        formData.append("Text", request.text);
        if (request.redactionId) formData.append("RedactionId", String(request.redactionId));
        if (request.quotes.length > 0) formData.append("QuotesJson", JSON.stringify(request.quotes));
        for (const file of request.files) formData.append("Files", file);
        // Content-Type не задаём вручную - браузер сам проставит boundary (см. coordinationService.decide).
        const {data} = await axiosInstance.post<{id: number; createdAt: string}>(
            `/vnd/${vndId}/proposals`, formData,
        );
        return data;
    },

    async list(filter: VndProposalFilter): Promise<VndProposalPage> {
        const {data} = await axiosInstance.get<VndProposalPage>("/vnd-proposals", {params: filter});
        return data;
    },

    async getById(id: number): Promise<VndProposal> {
        const {data} = await axiosInstance.get<VndProposal>(`/vnd-proposals/${id}`);
        return data;
    },

    async counts(): Promise<VndProposalCounts> {
        const {data} = await axiosInstance.get<VndProposalCounts>("/vnd-proposals/counts");
        return data;
    },

    async markAsRead(id: number): Promise<VndProposal> {
        const {data} = await axiosInstance.post<VndProposal>(`/vnd-proposals/${id}/read`);
        return data;
    },

    async markAsUnread(id: number): Promise<VndProposal> {
        const {data} = await axiosInstance.post<VndProposal>(`/vnd-proposals/${id}/unread`);
        return data;
    },

    async markAllAsRead(): Promise<number> {
        const {data} = await axiosInstance.post<{updated: number}>("/vnd-proposals/read-all");
        return data.updated;
    },
};
