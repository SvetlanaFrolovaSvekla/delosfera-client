import { axiosInstance } from "@/service/axiosInstance.ts";
import type {
    StatementRubricResponse,
    CreateStatementRubricRequest,
    UpdateStatementRubricRequest,
    StatementRubricFilter,
} from "./statementRubricServiceType.ts";

// Рубрикатор заявлений — отдельный справочник от Рубрикатора ВНД и Рубрикатора СЗ,
// своя ручка на бэке (/dictionaries/statement-rubric), но по форме и поведению 1:1 такой же.
class StatementRubricService {
    private readonly basePath = "/dictionaries/statement-rubric";

    /** Список всех рубрик заявлений */
    async getAll(filter?: StatementRubricFilter): Promise<StatementRubricResponse[]> {
        const response = await axiosInstance.get<StatementRubricResponse[]>(this.basePath, {
            params: filter,
        });
        return response.data;
    }

    /** Создать новую рубрику заявлений */
    async create(request: CreateStatementRubricRequest): Promise<StatementRubricResponse> {
        const response = await axiosInstance.post<StatementRubricResponse>(this.basePath, request);
        return response.data;
    }

    /** Обновить существующую рубрику заявлений */
    async update(id: number, request: UpdateStatementRubricRequest): Promise<StatementRubricResponse> {
        const response = await axiosInstance.put<StatementRubricResponse>(`${this.basePath}/${id}`, request);
        return response.data;
    }

    /** Удалить рубрику заявлений */
    async delete(id: number): Promise<void> {
        await axiosInstance.delete(`${this.basePath}/${id}`);
    }
}

export const statementRubricService = new StatementRubricService();
