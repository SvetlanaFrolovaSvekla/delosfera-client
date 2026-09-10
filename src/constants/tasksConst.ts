import type {TaskScope} from "@/service/tasksVndService/tasksServiceTypes.ts";

// "all" — вкладка "Все" на странице задач: не отдельный бэкенд-скоуп, а объединение
// всех пяти на фронте (см. useVndTasks).
export type TasksScope = TaskScope | "all";

export const emptyTextByScope: Record<TasksScope, string> = {
    all: "Нет активных задач",
    coordination: "Нет задач на согласование",
    actualization: "Нет документов, ожидающих актуализации",
    consolidation: "Нет документов на консолидации",
    myVndApproval: "Нет ВНД, ожидающих согласования",
    rejected: "Нет отклонённых редакций",
};
