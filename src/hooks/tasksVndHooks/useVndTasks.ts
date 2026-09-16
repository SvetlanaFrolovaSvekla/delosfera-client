import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type {TaskScope, VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";
import type {TasksScope} from "@/constants/tasksConst.ts";
import {TASK_SCOPE_META} from "@/constants/vndStatus.ts";

// Порядок слияния для вкладки "Все": сначала то, что реально ждёт решения
// (согласование, мои ВНД на согласовании, отклонено, заявки на актуализацию — свои и
// требующие решения главного редактора), затем актуализация и консолидация.
// Отдельного бэкенд-эндпоинта под "Все" нет — семь уже существующих списков (у пользователя
// это обычно десятки задач, не тысячи) просто запрашиваются параллельно и сливаются здесь.
const ALL_TASK_SCOPES: TaskScope[] = [
    "coordination", "myVndApproval", "rejected",
    "actualizationRequest", "actualizationApproved",
    "actualization", "consolidation",
];

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
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<VndTaskResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);

    const refetch = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);
        try {
            if (scope === "all") {
                // Promise.all здесь раньше ронял ВЕСЬ список "Все" при отказе одного из пяти
                // источников — пользователь видел пустую вкладку вместо остальных четырёх
                // разделов, которые на самом деле загрузились. Promise.allSettled показывает то,
                // что удалось получить, и отдельно сообщает об ошибке — см. использование error
                // в VndTasksPanel.
                const results = await Promise.allSettled(ALL_TASK_SCOPES.map((s) => tasksService.getByScope(s)));

                const loaded = results
                    .filter((r): r is PromiseFulfilledResult<VndTaskResponse[]> => r.status === "fulfilled")
                    .flatMap((r) => r.value);
                setTasks(sortMerged(loaded));

                const failedScopes = results
                    .map((r, i) => ({r, scope: ALL_TASK_SCOPES[i]}))
                    .filter(({r}) => r.status === "rejected");

                if (failedScopes.length > 0) {
                    const scopeLabels = failedScopes
                        .map((f) => t(TASK_SCOPE_META[f.scope as keyof typeof TASK_SCOPE_META]?.label ?? f.scope))
                        .join(", ");
                    setError(new Error(t("tasks.vnd.loadErrorPartial", {scopes: scopeLabels})));
                }
            } else {
                const data = await tasksService.getByScope(scope);
                setTasks(data);
            }
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [scope, enabled, t]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    return { tasks, isLoading, error, refetch };
}
