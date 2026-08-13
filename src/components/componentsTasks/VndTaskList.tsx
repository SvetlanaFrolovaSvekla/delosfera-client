import { Loader } from "@/components/componentsGeneral/Loader.tsx";
import { EmptyState } from "@/components/componentsGeneral/EmptyState.tsx";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";

interface VndTaskListProps {
    tasks: VndTaskResponse[];
    isLoading: boolean;
    emptyText: string;
}

export function VndTaskList({ tasks, isLoading, emptyText }: VndTaskListProps) {
    if (isLoading) {
        return (
            <div className="py-16 flex justify-center">
                <Loader />
            </div>
        );
    }

    if (tasks.length === 0) {
        return <EmptyState title={emptyText} />;
    }

    return (
        <div className="grid grid-cols-1 gap-3 mt-5">
            {tasks.map((task) => (
                <VndTaskCard key={`${task.scope}-${task.vndId}-${task.stageId ?? ""}`} task={task} />
            ))}
        </div>
    );
}