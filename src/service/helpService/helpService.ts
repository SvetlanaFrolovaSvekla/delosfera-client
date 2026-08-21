import {apiClient} from "@/service/apiClient.ts";

/**
 * Инструкции по работе с системой (KB-01..03).
 *
 * Статья состоит из блоков, а не из сплошного текста: шаги нумеруются, ссылки
 * ведут прямо в нужный раздел системы, а замечания видны отдельно от объяснения.
 * Тексты правит администратор в самой системе — инструкция устаревает быстрее,
 * чем выходит очередная сборка.
 */

export type HelpSection =
    | "Start" | "Sz" | "Vnd" | "Procurement" | "Signing" | "Meetings" | "Administration";

export const SECTION_TITLE: Record<HelpSection, string> = {
    Start: "С чего начать",
    Sz: "Служебные записки",
    Vnd: "Нормативные документы",
    Procurement: "Закупки",
    Signing: "Согласование и подпись",
    Meetings: "Заседания",
    Administration: "Администрирование",
};

/** Порядок разделов в оглавлении — от того, что нужно всем, к тому, что нужным немногим. */
export const SECTION_ORDER: HelpSection[] = [
    "Start", "Sz", "Vnd", "Procurement", "Signing", "Meetings", "Administration",
];

export type HelpBlock =
    | {kind: "text"; text: string}
    | {kind: "steps"; items: string[]}
    | {kind: "note"; tone?: "info" | "warning"; text: string}
    | {kind: "link"; label: string; path: string}
    | {kind: "vnd"; label: string; documentId: number}
    | {
          kind: "image";
          fileId: number;
          caption?: string;
          /**
           * Выноски: номер и точка на снимке в процентах от его размера.
           * Проценты, а не пиксели, — снимок показывается в разной ширине,
           * и метка в пикселях уехала бы с нужной кнопки.
           */
          markers?: {x: number; y: number; text?: string}[];
      };

export interface HelpArticleBrief {
    id: number;
    section: HelpSection;
    titleRu: string;
    titleKg: string | null;
    summaryRu: string | null;
    summaryKg: string | null;

    /** Экран, к которому относится статья: по нему страница показывает кнопку справки. */
    routePath: string | null;

    isPublished: boolean;
    updatedAt: string;
}

export interface HelpArticle extends HelpArticleBrief {
    sortOrder: number;
    updatedByName: string | null;
    body: HelpBlock[];
}

export interface HelpIndex {
    articles: HelpArticleBrief[];

    /** Можно ли править статьи — от этого зависит, показывать ли редактор. */
    mayEdit: boolean;
}

export interface HelpArticleInput {
    section: HelpSection;
    titleRu: string;
    titleKg?: string | null;
    summaryRu?: string | null;
    summaryKg?: string | null;
    body: HelpBlock[];
    routePath?: string | null;
    sortOrder: number;
    isPublished: boolean;
}

const BASE = "/help";

export const helpService = {
    async index(includeDrafts = false): Promise<HelpIndex> {
        const {data} = await apiClient.get<HelpIndex>(BASE, {params: {includeDrafts}});
        return data;
    },

    async article(id: number): Promise<HelpArticle> {
        const {data} = await apiClient.get<HelpArticle>(`${BASE}/${id}`);
        return data;
    },

    /** Статья для текущего экрана. Возвращает null, если для него инструкции нет. */
    async forRoute(path: string): Promise<HelpArticle | null> {
        const {data} = await apiClient.get<{found: boolean; article?: HelpArticle}>(
            `${BASE}/for-route`, {params: {path}});
        return data.found && data.article ? data.article : null;
    },

    async create(input: HelpArticleInput): Promise<number> {
        const {data} = await apiClient.post<{id: number}>(BASE, input);
        return data.id;
    },

    async update(id: number, input: HelpArticleInput): Promise<void> {
        await apiClient.put(`${BASE}/${id}`, input);
    },

    /** Загрузить снимок экрана. Возвращает идентификатор файла для блока. */
    async uploadImage(file: File): Promise<{fileId: number; fileName: string; size: number}> {
        const form = new FormData();
        form.append("file", file);
        const {data} = await apiClient.post<{fileId: number; fileName: string; size: number}>(
            `${BASE}/images`, form);
        return data;
    },

    /**
     * Забирает снимок и отдаёт локальную ссылку на него.
     *
     * Не адресом в src: токен живёт в памяти вкладки, а тег img запрос заголовком
     * не снабдит — картинка вернулась бы отказом. Поэтому качаем сами и отдаём
     * ссылку на полученные данные; освобождать её должен тот, кто получил.
     */
    async fetchImage(fileId: number): Promise<string> {
        const {data} = await apiClient.get<Blob>(`${BASE}/images/${fileId}`, {
            responseType: "blob",
        });
        return URL.createObjectURL(data);
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },
};
