export type TasksScope = "coordination" | "actualization" | "consolidation" | "myVndApproval";

export const emptyTextByScope: Record<TasksScope, string> = {
    coordination: "Нет задач на согласование",
    actualization: "Нет документов, ожидающих актуализации",
    consolidation: "Нет документов на консолидации",
    myVndApproval: "Нет ВНД, ожидающих согласования",
};