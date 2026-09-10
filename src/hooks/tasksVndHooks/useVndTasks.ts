import { useEffect, useState, useCallback } from "react";
import type {TaskScope, VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";
import type {TasksScope} from "@/constants/tasksConst.ts";

// Порядок слияния для вкладки "Все": сначала то, что реально ждёт решения
// (согласование, мои ВНД на согласовании, отклонено), затем актуализация и консолидация.
// Отдельного бэкенд-эндпоинта под "Все" нет — пять уже существующих списков (у пользователя
// это обычно десятки задач, не тысячи) просто запрашиваются параллельно и сливаются здесь.
const ALL_TASK_SCOPES: TaskScope[] = ["coordination", "myVndApproval", "rejected", "actualization", "consolidation"];

// Общий "срок" для сортировки смешанного списка: у coordination/myVndApproval это
// deadlineAt, у actualization/consolidation — dueActualizationDate, у rejected срока нет
// вовсе — такие задачи уходят в конец, среди них — сначала более свежие (по createdAt).
function getSortKey(task: VndTaskResponse): string | null {
    return task.deadlineAt ?? task.dueActualizationDate ?? null;
}

function sortMerged(tasks: VndTaskResponse[]): VndTaskResponse[] {
    return [...tasks].sort((a, b) => {
        const dateA = getSortKey(a);
        const dateB = getSortKey(b);
        if (dateA && dateB) return dateA.localeCompare(dateB);
        if (dateA) return -1;
        if (dateB) return 1;
        return b.createdAt.localeCompare(a.createdAt);
    });
}

// enabled=false пропускает запрос, не трогая уже загруженные tasks/isLoading — используется на
// странице "Мои задачи", когда выбран переключатель "Выполненные": активный список в этот
// момент не показывается, и незачем гонять его запрос вхолостую при каждом переключении.
export function useVndTasks(scope: TasksScope, enabled: boolean = true) {
    const [tasks, setTasks] = useState<VndTaskResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    const refetch = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);
        try {
            const data = scope === "all"
                ? sortMerged((await Promise.all(ALL_TASK_SCOPES.map((s) => tasksService.getByScope(s)))).flat())
                : await tasksService.getByScope(scope);
            setTasks(data);
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [scope, enabled]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    return { tasks, isLoading, error, refetch };
}
