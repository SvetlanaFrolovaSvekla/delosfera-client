import type {TaskScope, VndTaskCountsResponse, VndTaskResponse} from "./tasksServiceTypes";
import { axiosInstance } from "@/service/axiosInstance.ts";

// Бэкенд отдаёт "my-vnd-approval" (kebab-case) для этого раздела, остальные scope
// совпадают со своим именем один в один — см. TasksController.
const SCOPE_TO_PATH: Record<TaskScope, string> = {
    coordination: "coordination",
    actualization: "actualization",
    consolidation: "consolidation",
    myVndApproval: "my-vnd-approval",
};

class TasksService {
    async getByScope(scope: TaskScope): Promise<VndTaskResponse[]> {
        const { data } = await axiosInstance.get<VndTaskResponse[]>(`/tasks/${SCOPE_TO_PATH[scope]}`);
        return data;
    }

    async getCounts(): Promise<VndTaskCountsResponse> {
        const { data } = await axiosInstance.get<VndTaskCountsResponse>("/tasks/counts");
        return data;
    }
}

export const tasksService = new TasksService();