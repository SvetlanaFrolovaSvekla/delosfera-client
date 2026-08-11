import {apiClient} from "@/service/apiClient.ts";

/** Карточка архивного хранения записки (SZ-07, GEN-09). */
export interface SzArchive {
    szId: number;
    regNumber: string | null;
    title: string | null;
    statusCode: string;

    isArchived: boolean;
    archivedOn: string | null;

    nomenclatureCaseId: number | null;
    caseIndex: string | null;
    caseTitle: string | null;
    caseClosedOn: string | null;

    storageTermId: number | null;
    storageTerm: string | null;
    /** Пусто — хранение постоянное. */
    storageYears: number | null;

    destroyAfterYear: number | null;
    /** Срок задан, но год не посчитан: дело ещё не закрыто. */
    destroyYearPending: boolean;
}

export interface StorageTerm {
    id: number;
    code: string;
    titleRu: string;
    years: number | null;
    isActive: boolean;
}

export interface NomenclatureCase {
    id: number;
    index: string;
    titleRu: string;
    year: number;
    orgUnitId: number | null;
    storageTermId: number | null;
    closedOn: string | null;
    isActive: boolean;
}

const BASE = "/api/sz";

export const szArchiveService = {
    async get(szId: number): Promise<SzArchive> {
        const {data} = await apiClient.get<SzArchive>(`${BASE}/${szId}/archive`);
        return data;
    },

    /** Подшить записку в дело номенклатуры. */
    async archive(szId: number, nomenclatureCaseId: number, storageTermId?: number | null): Promise<SzArchive> {
        const {data} = await apiClient.post<SzArchive>(`${BASE}/${szId}/archive`, {
            nomenclatureCaseId,
            storageTermId: storageTermId ?? null,
        });
        return data;
    },

    async restore(szId: number): Promise<SzArchive> {
        const {data} = await apiClient.post<SzArchive>(`${BASE}/${szId}/archive/restore`);
        return data;
    },

    /** Опись дела: что подшито и до какого года хранится. */
    async inventory(caseId: number): Promise<SzArchive[]> {
        const {data} = await apiClient.get<SzArchive[]>(`${BASE}/archive/cases/${caseId}/inventory`);
        return data;
    },

    async cases(): Promise<NomenclatureCase[]> {
        const {data} = await apiClient.get<NomenclatureCase[]>("/api/dictionaries/nomenclature-case");
        return data;
    },

    async storageTerms(): Promise<StorageTerm[]> {
        const {data} = await apiClient.get<StorageTerm[]>("/api/dictionaries/storage-term");
        return data;
    },
};
