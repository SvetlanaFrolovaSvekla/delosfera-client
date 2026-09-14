import {useEffect, useState} from "react";
import {tasksService} from "@/service/tasksVndService/tasksService.ts";
import type {VndMyTimeoutApprovalsResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";

/** Сводка по просрочкам согласования текущего пользователя (месяц/год/всего + конкретные
 * ВНД) — для блока "Мои показатели" вкладки "Актуализация" страницы Аналитика → ВНД. */
export function useMyTimeoutApprovals() {
    const [summary, setSummary] = useState<VndMyTimeoutApprovalsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);

        tasksService
            .getMyTimeoutApprovals()
            .then((data) => {
                if (!cancelled) setSummary(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Не удалось загрузить сводку по просрочкам согласования");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {summary, loading, error};
}
