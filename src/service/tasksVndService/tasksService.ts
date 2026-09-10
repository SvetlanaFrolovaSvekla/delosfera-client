import type {PagedResult, TaskScope, VndTaskCountsResponse, VndTaskResponse} from "./tasksServiceTypes";
import { axiosInstance } from "@/service/axiosInstance.ts";

// Бэкенд отдаёт "my-vnd-approval" (kebab-case) для этого раздела, остальные scope
// совпадают со своим именем один в один — см. TasksController.
const SCOPE_TO_PATH: Record<TaskScope, string> = {
    coordination: "coordination",
    actualization: "actualization",
    consolidation: "consolidation",
    myVndApproval: "my-vnd-approval",
    rejected: "rejected",
};

class TasksService {
    async getByScope(scope: TaskScope): Promise<VndTaskResponse[]> {
        const { data } = await axiosInstance.get<VndTaskResponse[]>(`/tasks/${SCOPE_TO_PATH[scope]}`);
        return data;
    }

    // История "Выполнено" для раздела — с пагинацией (см. TasksController/TasksService на
    // бэкенде: критерий "выполнено" свой для каждого раздела).
    async getDoneByScope(scope: TaskScope, page: number, pageSize: number): Promise<PagedResult<VndTaskResponse>> {
        const { data } = await axiosInstance.get<PagedResult<VndTaskResponse>>(
            `/tasks/${SCOPE_TO_PATH[scope]}/done`,
            { params: { page, pageSize } }
        );
        return data;
    }

    async getCounts(): Promise<VndTaskCountsResponse> {
        const { data } = await axiosInstance.get<VndTaskCountsResponse>("/tasks/counts");
        return data;
    }
}

export const tasksService = new TasksService();
