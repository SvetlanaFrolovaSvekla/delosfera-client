import type {LucideIcon} from "lucide-react";
import type {TaskScope} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {FileX, Layers, ListChecks, RefreshCw, Send, UserCheck} from "lucide-react";

export type TasksScope = TaskScope | "all";

export const emptyTextByScope: Record<TasksScope, string> = {
    all: "tasks.vnd.empty.all.title",
    coordination: "tasks.vnd.empty.coordination.title",
    actualization: "tasks.vnd.empty.actualization.title",
    consolidation: "tasks.vnd.empty.consolidation.title",
    myVndApproval: "tasks.vnd.empty.myVndApproval.title",
    rejected: "tasks.vnd.empty.rejected.title",
    actualizationRequest: "tasks.vnd.empty.actualizationRequest.title",
    actualizationApproved: "tasks.vnd.empty.actualizationApproved.title",
};

export const emptyDescriptionByScope: Record<TasksScope, string> = {
    all: "tasks.vnd.empty.all.description",
    coordination: "tasks.vnd.empty.coordination.description",
    actualization: "tasks.vnd.empty.actualization.description",
    consolidation: "tasks.vnd.empty.consolidation.description",
    myVndApproval: "tasks.vnd.empty.myVndApproval.description",
    rejected: "tasks.vnd.empty.rejected.description",
    actualizationRequest: "tasks.vnd.empty.actualizationRequest.description",
    actualizationApproved: "tasks.vnd.empty.actualizationApproved.description",
};

export const emptyIconByScope: Record<TasksScope, LucideIcon> = {
    all: ListChecks,
    coordination: UserCheck,
    actualization: RefreshCw,
    consolidation: Layers,
    myVndApproval: Send,
    rejected: FileX,
    actualizationRequest: UserCheck,
    actualizationApproved: RefreshCw,
};
