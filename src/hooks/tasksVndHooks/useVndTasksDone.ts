import { useEffect, useState, useCallback } from "react";
import type {PagedResult, TaskScope, VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";

/**
 * История "Выполнено" для одного раздела задач — с пагинацией (см. TasksController/
 * TasksService на бэкенде: у каждого раздела свой критерий "выполнено").
 *
 * scope === null пропускает запрос — используется на странице "Мои задачи", когда выбран
 * переключатель "Активные" (историю в этот момент не показываем, незачем её грузить) или
 * когда открыта вкладка "Все" (для неё истории выполненных нет вовсе).
 */
export function useVndTasksDone(scope: TaskScope | null, page: number, pageSize: number) {
    const [data, setData] = useState<PagedResult<VndTaskResponse> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const refetch = useCallback(async () => {
        if (!scope) {
            setData(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const result = await tasksService.getDoneByScope(scope, page, pageSize);
            setData(result);
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [scope, page, pageSize]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    return { data, isLoading, error, refetch };
}
