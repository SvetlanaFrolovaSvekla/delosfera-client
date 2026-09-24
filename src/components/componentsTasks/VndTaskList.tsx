import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import { Loader } from "@/components/componentsGeneral/Loader.tsx";
import { EmptyState } from "@/components/componentsGeneral/EmptyState.tsx";
import type {LucideIcon} from "lucide-react";

interface VndTaskListProps {
    tasks: VndTaskResponse[];
    isLoading: boolean;
    emptyText: string;
    /** Пояснение под заголовком заглушки — что за задачи попадают в раздел. */
    emptyDescription?: string;
    /** Значок заглушки — подобран под смысл раздела (согласование, актуализация и т.п.);
     * без него EmptyState берёт свою иконку по умолчанию (лупа с крестиком). */
    emptyIcon?: LucideIcon;
    /** Текущий запрос поиска — прокидывается в карточки для подсветки совпадений. */
    searchQuery?: string;
}

export function VndTaskList({ tasks, isLoading, emptyText, emptyDescription, emptyIcon, searchQuery }: VndTaskListProps) {
    if (isLoading) {
        return (
            <div className="py-16 flex justify-center">
                <Loader />
            </div>
        );
    }

    if (tasks.length === 0) {
        return <EmptyState title={emptyText} description={emptyDescription} icon={emptyIcon} />;
    }

    return (
        <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => (
                <VndTaskCard
                    key={`${task.scope}-${task.vndId}-${task.stageId ?? ""}`}
                    task={task}
                    searchQuery={searchQuery}
                />
            ))}
        </div>
    );
}