import {useMemo, useState} from "react";
import {useAuth} from "@/context/AuthContext";
import {useVndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {useActualizationSummary} from "@/hooks/vndHooks/useActualizationSummary.ts";
import {getTimeGreeting} from "@/utils/getTimeGreeting.ts";
import {getFirstLastName} from "@/utils/userNaming.ts";
import {getFormattedDate} from "@/utils/dateUtils.ts";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {CreateDocumentModal} from "@/components/CreateDocumentModal.tsx";
import {HomePageHeader} from "@/components/componentsHome/HomePageHeader.tsx";
import {HomeContoursCard} from "@/components/componentsHome/HomeContoursCard.tsx";
import {HomeKpiGrid} from "@/components/componentsHome/HomeKpiGrid.tsx";
import {MyTasksCard} from "@/components/componentsHome/MyTasksCard.tsx";
import {ActualizationPlanCard} from "@/components/componentsHome/ActualizationPlanCard.tsx";
import {RecentActivityCard} from "@/components/componentsHome/RecentActivityCard.tsx";

// Сколько задач показывать в сводке на главной
const HOME_TASKS_LIMIT = 25;

export function HomePage() {
    const {user, loading} = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const roleDept = user?.orgUnit?.titleRu ?? ""; // СП
    const rolePosition = user?.position?.name; // Должность

    // Реальные задачи по всем скоупам (как на странице "Мои задачи"), объединённые в одну сводку
    const coordination = useVndTasks("coordination");
    const actualization = useVndTasks("actualization");
    const consolidation = useVndTasks("consolidation");
    const {summary: actualizationSummary, isLoading: actualizationLoading} = useActualizationSummary();
    const {summary: homeSummary} = useVndHomeSummary();

    const homeTasks = useMemo(
        () => [...coordination.tasks, ...actualization.tasks, ...consolidation.tasks].slice(0, HOME_TASKS_LIMIT),
        [coordination.tasks, actualization.tasks, consolidation.tasks]
    );

    const tasksTotalCount = coordination.tasks.length + actualization.tasks.length + consolidation.tasks.length;
    const tasksLoading = coordination.isLoading || actualization.isLoading || consolidation.isLoading;

    // Текущая дата
    const formattedDate = useMemo(() => getFormattedDate(), []);

    // Приветствие
    const greeting = useMemo(() => {
        const firstLastName = getFirstLastName(user?.fullName);
        const timeGreeting = getTimeGreeting();
        return firstLastName ? `${timeGreeting}, ${firstLastName}!` : timeGreeting;
    }, [user?.fullName]);

    if (loading) {
        return <Loader label="Загрузка главной страницы…" fullHeight={false}/>;
    }

    return (
        <div className="w-full max-w-[17000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 sm:pt-[22px]">
            <HomePageHeader
                formattedDate={formattedDate}
                greeting={greeting}
                rolePosition={rolePosition}
                roleDept={roleDept}
                onCreateClick={() => setIsCreateModalOpen(true)}
            />

            <HomeKpiGrid summary={homeSummary}/>
            <HomeContoursCard/>

            <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-[18px]">
                <MyTasksCard tasks={homeTasks} totalCount={tasksTotalCount} isLoading={tasksLoading}/>

                <div className="flex flex-col gap-[18px]">
                    <ActualizationPlanCard summary={actualizationSummary} isLoading={actualizationLoading}/>
                    <RecentActivityCard limit={8}/>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateDocumentModal onClose={() => setIsCreateModalOpen(false)}/>
            )}
        </div>
    );
}