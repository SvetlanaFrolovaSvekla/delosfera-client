import type {TaskScope, VndTaskCountsResponse, VndTaskResponse} from "./tasksServiceTypes";
import { axiosInstance } from "@/service/axiosInstance.ts";

class TasksService {
    async getByScope(scope: TaskScope): Promise<VndTaskResponse[]> {
        const { data } = await axiosInstance.get<VndTaskResponse[]>(`/tasks/${scope}`);
        return data;
    }

    async getCounts(): Promise<VndTaskCountsResponse> {
        const { data } = await axiosInstance.get<VndTaskCountsResponse>("/tasks/counts");
        return data;
    }
}

export const tasksService = new TasksService();