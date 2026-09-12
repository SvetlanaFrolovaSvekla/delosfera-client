import {FileX, Layers, ListChecks, RefreshCw, Send, UserCheck} from "lucide-react";
import type {LucideIcon} from "lucide-react";
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

// Пояснение под заголовком заглушки — что за задачи попадают в раздел и когда он перестанет
// быть пустым (см. EmptyState.tsx на VndTaskList.tsx).
export const emptyDescriptionByScope: Record<TasksScope, string> = {
    all: "Здесь появятся задачи по всем разделам нормотворчества — согласование, актуализация, консолидация.",
    coordination: "Здесь появляются редакции ВНД, которые ждут вашего решения как согласующего.",
    actualization: "Здесь появляются документы, для которых наступил или приближается срок актуализации.",
    consolidation: "Здесь появляются документы, для которых редакции на разных языках нужно свести в одну.",
    myVndApproval: "Здесь отображаются ваши документы, отправленные на согласование и ещё не получившие решения.",
    rejected: "Здесь появляются редакции, которые вернули на доработку — с момента отклонения до повторной отправки.",
};

export const emptyIconByScope: Record<TasksScope, LucideIcon> = {
    all: ListChecks,
    coordination: UserCheck,
    actualization: RefreshCw,
    consolidation: Layers,
    myVndApproval: Send,
    rejected: FileX,
};
