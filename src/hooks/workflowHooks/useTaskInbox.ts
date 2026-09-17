import {useCallback, useEffect, useRef, useState} from "react";
import {taskInboxService, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {notificationsRefreshBus} from "@/service/notificationsRefreshBus.ts";

/**
 * Задачи одного контура из сводного реестра (см. taskInboxService) - с refetch и
 * автообновлением при приходе нового уведомления (см. notificationsRefreshBus), по
 * тому же принципу, что useVndTasks.ts. Раньше на HomePage это было три одинаковых
 * useEffect подряд (Sz/Procurement/Acknowledgement) без возможности обновить список
 * без полной перезагрузки страницы.
 */
export function useTaskInbox(documentType?: string) {
    const [tasks, setTasks] = useState<InboxTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const requestId = useRef(0);

    const refetch = useCallback(async () => {
        const id = ++requestId.current;
        setIsLoading(true);
        try {
            const inbox = await taskInboxService.get(documentType);
            if (id !== requestId.current) return; // ответ на устаревший запрос - игнор
            setTasks(inbox.tasks);
        } catch {
            if (id === requestId.current) setTasks([]);
        } finally {
            if (id === requestId.current) setIsLoading(false);
        }
    }, [documentType]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    useEffect(() => notificationsRefreshBus.subscribe(() => void refetch()), [refetch]);

    return {tasks, isLoading, refetch};
}
