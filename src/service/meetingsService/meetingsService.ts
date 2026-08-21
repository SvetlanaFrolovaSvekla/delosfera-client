import {apiClient} from "@/service/apiClient.ts";

/** Коллегиальный орган: нумерация, права секретаря и адресаты уведомлений — свои у каждого. */
export type MeetingBody = "Board" | "Kpa" | "CreditCommittee";
export type MeetingForm = "InPerson" | "Absentee";

/** Статус исполнения поручения по протоколу. */
export type ExecutionStatus =
    | "New" | "InProgress" | "DoneOnTime" | "DoneLate" | "NotDone" | "Cancelled" | "Excluded";

export type MeetingFileKind = "Sz" | "Protocol" | "Execution";

export interface AgendaGuest {
    id: number;
    userId: number;
    userName: string;
    orgUnitId: number | null;
    orgUnitTitle: string | null;
}

export interface AgendaAssignment {
    id: number;
    agendaItemId: number;
    userId: number;
    userName: string;
    orgUnitId: number | null;
    orgUnitTitle: string | null;

    /** Что поручено; пусто — поручение по решению целиком. */
    text: string | null;

    dueDate: string | null;
    status: ExecutionStatus;
    statusTitle: string;
    report: string | null;
    reportedAt: string | null;
    reportedByName: string | null;
    /** Срок истёк, а поручение не закрыто. */
    isOverdue: boolean;
    daysLeft: number | null;
}

export interface AgendaFile {
    id: number;
    kind: MeetingFileKind;
    kindTitle: string;
    fileId: number;
    fileName: string;
    sizeBytes: number;
    createdAt: string;
    canDelete: boolean;
}

export interface AgendaItem {
    id: number;
    meetingId: number;
    order: number;
    topic: string;
    protocolNumber: string | null;
    protocolDate: string | null;
    decision: string | null;

    speakerUserId: number | null;
    speakerName: string | null;
    speakerHeadUserId: number | null;
    speakerHeadName: string | null;
    speakerUnitId: number | null;
    speakerUnitTitle: string | null;
    deputySecretaryUserId: number | null;
    deputySecretaryName: string | null;
    controllerUserId: number | null;
    controllerName: string | null;

    documentsUrl: string | null;

    guests: AgendaGuest[];
    assignments: AgendaAssignment[];
    files: AgendaFile[];
}

export interface MeetingListItem {
    id: number;
    body: MeetingBody;
    bodyTitle: string;
    number: number;
    year: number;
    form: MeetingForm;
    formTitle: string;
    date: string;
    time: string;
    secretaryName: string | null;
    itemCount: number;
    assignmentCount: number;
    /** Поручения с истёкшим сроком — то, ради чего открывают журнал. */
    overdueCount: number;
    notifiedAt: string | null;
}

export interface Meeting extends MeetingListItem {
    secretaryUserId: number;
    secretaryUnitId: number | null;
    secretaryUnitTitle: string | null;
    materialsUrl: string | null;
    items: AgendaItem[];
    canEdit: boolean;
    canReport: boolean;
}

export interface MeetingNotifyResult {
    meetingId: number;
    recipientCount: number;
    subject: string;
    body: string;
    recipients: string[];
}

export const bodyOptions: {value: MeetingBody; title: string}[] = [
    {value: "Board", title: "Правление"},
    {value: "Kpa", title: "КПА"},
    {value: "CreditCommittee", title: "Кредитный комитет"},
];

export const statusOptions: {value: ExecutionStatus; title: string}[] = [
    {value: "New", title: "Новое"},
    {value: "InProgress", title: "На исполнении"},
    {value: "DoneOnTime", title: "Исполнено в срок"},
    {value: "DoneLate", title: "Исполнено с нарушением срока"},
    {value: "NotDone", title: "Не исполнено"},
    {value: "Cancelled", title: "Отменено"},
    {value: "Excluded", title: "Исключено/снято из повестки дня заседания"},
];

const BASE = "/meetings";

export const meetingsService = {
    async list(params: {
        body?: MeetingBody;
        year?: number;
        from?: string;
        to?: string;
        overdueOnly?: boolean;
    }): Promise<MeetingListItem[]> {
        const {data} = await apiClient.get<MeetingListItem[]>(BASE, {params});
        return data;
    },

    async get(id: number): Promise<Meeting> {
        const {data} = await apiClient.get<Meeting>(`${BASE}/${id}`);
        return data;
    },

    async create(body: {
        body: MeetingBody;
        number?: number;
        form: MeetingForm;
        secretaryUserId?: number;
        secretaryUnitId?: number;
        date: string;
        time: string;
        materialsUrl?: string;
    }): Promise<Meeting> {
        const {data} = await apiClient.post<Meeting>(BASE, body);
        return data;
    },

    async update(id: number, body: Record<string, unknown>): Promise<Meeting> {
        const {data} = await apiClient.put<Meeting>(`${BASE}/${id}`, body);
        return data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },

    async notify(id: number): Promise<MeetingNotifyResult> {
        const {data} = await apiClient.post<MeetingNotifyResult>(`${BASE}/${id}/notify`);
        return data;
    },

    /** Реестр решений за период: файл скачивается браузером. */
    async downloadRegistry(from: string, to: string, body?: MeetingBody): Promise<Blob> {
        const {data} = await apiClient.get(`${BASE}/registry`, {
            params: {from, to, body},
            responseType: "blob",
        });
        return data as Blob;
    },
};

export const agendaService = {
    async addItem(meetingId: number, body: Partial<AgendaItem> & {topic: string}): Promise<AgendaItem> {
        const {data} = await apiClient.post<AgendaItem>(`${BASE}/${meetingId}/items`, body);
        return data;
    },

    async updateItem(itemId: number, body: Record<string, unknown>): Promise<AgendaItem> {
        const {data} = await apiClient.put<AgendaItem>(`${BASE}/items/${itemId}`, body);
        return data;
    },

    async removeItem(itemId: number): Promise<void> {
        await apiClient.delete(`${BASE}/items/${itemId}`);
    },

    async addGuest(itemId: number, userId: number, orgUnitId?: number): Promise<AgendaItem> {
        const {data} = await apiClient.post<AgendaItem>(`${BASE}/items/${itemId}/guests`, {userId, orgUnitId});
        return data;
    },

    async removeGuest(guestId: number): Promise<AgendaItem> {
        const {data} = await apiClient.delete<AgendaItem>(`${BASE}/guests/${guestId}`);
        return data;
    },

    async addAssignment(
        itemId: number,
        body: {userId: number; orgUnitId?: number; text?: string; dueDate?: string},
    ): Promise<AgendaItem> {
        const {data} = await apiClient.post<AgendaItem>(`${BASE}/items/${itemId}/assignments`, body);
        return data;
    },

    async removeAssignment(assignmentId: number): Promise<AgendaItem> {
        const {data} = await apiClient.delete<AgendaItem>(`${BASE}/assignments/${assignmentId}`);
        return data;
    },

    async report(assignmentId: number, status: ExecutionStatus, report?: string): Promise<AgendaAssignment> {
        const {data} = await apiClient.post<AgendaAssignment>(
            `${BASE}/assignments/${assignmentId}/report`, {status, report});
        return data;
    },

    async attach(itemId: number, kind: MeetingFileKind, file: File): Promise<AgendaFile> {
        const form = new FormData();
        form.append("file", file);

        const {data} = await apiClient.post<AgendaFile>(
            `${BASE}/items/${itemId}/files?kind=${kind}`, form,
            {headers: {"Content-Type": "multipart/form-data"}});
        return data;
    },

    async detach(agendaFileId: number): Promise<void> {
        await apiClient.delete(`${BASE}/files/${agendaFileId}`);
    },

    fileUrl(agendaFileId: number): string {
        return `${BASE}/files/${agendaFileId}`;
    },
};
