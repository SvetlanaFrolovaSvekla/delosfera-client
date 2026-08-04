import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    KeywordResponse,
    CreateKeywordRequest,
    UpdateKeywordRequest,
    KeywordFilter,
} from "./keywordServiceType.ts";

class KeywordService {
    private readonly basePath = "/dictionaries/keyword";

    /** Список всех ключевых слов */
    async getAll(filter?: KeywordFilter): Promise<KeywordResponse[]> {
        const response = await axiosInstance.get<KeywordResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новое ключевое слово */
    async create(request: CreateKeywordRequest): Promise<KeywordResponse> {
        const response = await axiosInstance.post<KeywordResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующее ключевое слово */
    async update(id: number, request: UpdateKeywordRequest): Promise<KeywordResponse> {
        const response = await axiosInstance.put<KeywordResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить ключевое слово */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const keywordService = new KeywordService();