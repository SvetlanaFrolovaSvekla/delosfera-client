import {apiClient} from "@/service/apiClient.ts";

/**
 * Представления журналов: сохранённые наборы колонок в списках документов.
 *
 * Делопроизводителю в реестре нужны номер, дата регистрации и бумажный оригинал;
 * руководителю — автор, срок и состояние. Один набор на всех означает, что
 * половина столбцов лишняя, а нужного нет.
 *
 * Представление принадлежит человеку либо всем. Общие заводит только тот, кто
 * настраивает систему: их видят все, и разрешив каждому, мы получили бы свалку
 * из полусотни недоделанных наборов.
 */

export interface JournalView {
    id: number;
    journal: string;
    name: string;
    /** Ключи колонок по порядку показа. Порядок значим — он и есть порядок столбцов. */
    columns: string[];
    /** Общее — заведено для всех, а не для себя. */
    isShared: boolean;
    orgUnitId: number | null;
    orgUnitTitle: string | null;
    /** Предлагать при открытии журнала. */
    isDefault: boolean;
    /** Своё можно править всегда, чужое общее — только с правом на настройки. */
    canEdit: boolean;
}

export interface JournalViewSaveRequest {
    name: string;
    columns: string[];
    isShared: boolean;
    orgUnitId?: number | null;
    isDefault: boolean;
}

const BASE = "/journal-views";

export const journalViewService = {
    /** Свои представления этого журнала плюс доступные общие. */
    async list(journal: string) {
        const {data} = await apiClient.get<JournalView[]>(`${BASE}/${journal}`);
        return data;
    },

    async create(journal: string, request: JournalViewSaveRequest) {
        const {data} = await apiClient.post<JournalView>(`${BASE}/${journal}`, request);
        return data;
    },

    async update(id: number, request: JournalViewSaveRequest) {
        const {data} = await apiClient.put<JournalView>(`${BASE}/${id}`, request);
        return data;
    },

    async remove(id: number) {
        await apiClient.delete(`${BASE}/${id}`);
    },
};

/** Ключи журналов. Строкой, а не перечислением: новый реестр подключается без правки базы. */
export const JOURNAL = {
    Vnd: "vnd",
    Sz: "sz",
    Users: "users",
} as const;
