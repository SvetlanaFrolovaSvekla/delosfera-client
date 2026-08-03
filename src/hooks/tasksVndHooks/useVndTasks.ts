import { useEffect, useState, useCallback } from "react";
import type {TaskScope, VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";

export function useVndTasks(scope: TaskScope) {
    const [tasks, setTasks] = useState<VndTaskResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await tasksService.getByScope(scope);
            setTasks(data);
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    return { tasks, isLoading, error, refetch };
}