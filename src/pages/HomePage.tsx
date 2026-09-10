import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext";
import {useVndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {taskInboxService, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {useActualizationSummary} from "@/hooks/vndHooks/useActualizationSummary.ts";
import {useTimeGreeting} from "@/hooks/generalHooks/useTimeGreeting.ts";
import {useFormattedDate} from "@/hooks/generalHooks/useFormattedDate.ts";
import {getFirstLastName} from "@/utils/userNaming.ts";
import {transliterate} from "@/utils/transliterate.ts";
import {HOME_TASKS_LIMIT} from "@/constants/validation/HomeTasksLimit.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {CreateDocumentModal} from "@/components/componentsModal/CreateDocumentModal.tsx";
import {HomePageHeader} from "@/components/componentsHome/HomePageHeader.tsx";
import {HomeContoursCard} from "@/components/componentsHome/HomeContoursCard.tsx";
import {HomeKpiGrid} from "@/components/componentsHome/HomeKpiGrid.tsx";
import {MyTasksCard} from "@/components/componentsHome/MyTasksCard.tsx";
import {ActualizationPlanCard} from "@/components/componentsHome/ActualizationPlanCard.tsx";
import {RecentActivityCard} from "@/components/componentsHome/RecentActivityCard.tsx";

export function HomePage() {
    const {t, i18n} = useTranslation();
    const {user, loading} = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // ФИО/должность/подразделение
    const isLatin = i18n.language === "en";
    const roleDept = useMemo(() => {
        const dept = user?.orgUnit?.titleRu ?? "";
        return isLatin ? transliterate(dept) : dept;
    }, [user?.orgUnit?.titleRu, isLatin]);
    const rolePosition = useMemo(() => {
        const position = user?.position?.name ?? "";
        return isLatin ? transliterate(position) : position;
    }, [user?.position?.name, isLatin]);

    // Реальные задачи по всем скоупам (как на странице "Мои задачи"), объединённые в одну сводку.
    // "coordination" уже включает финальную выдержку (см. TasksService.GetCoordinationTasksAsync) —
    // отдельного скоупа для неё больше нет. Раньше здесь не хватало myVndApproval (свои ВНД
    // на согласовании) — добавлен. "rejected" (отклонённые редакции, ждущие правок инициатора) —
    // добавлен туда же.
    const coordination = useVndTasks("coordination");
    const myVndApproval = useVndTasks("myVndApproval");
    const actualization = useVndTasks("actualization");
    const consolidation = useVndTasks("consolidation");
    const rejected = useVndTasks("rejected");
    const {summary: actualizationSummary, isLoading: actualizationLoading} = useActualizationSummary();
    const {summary: homeSummary} = useVndHomeSummary();

    // Задачи по служебным запискам живут в сводном реестре (а не в контуре ВНД),
    // поэтому тянутся отдельно — иначе на главной их не видно (#12).
    const [szTasks, setSzTasks] = useState<InboxTask[]>([]);
    const [szTasksLoading, setSzTasksLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        setSzTasksLoading(true);
        taskInboxService.get("Sz")
            .then((inbox) => {
                if (!cancelled) setSzTasks(inbox.tasks);
            })
            .catch(() => {
                if (!cancelled) setSzTasks([]);
            })
            .finally(() => {
                if (!cancelled) setSzTasksLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // "Последние задачи" = отсортированные по дате появления (createdAt), самые новые сверху —
    // раньше список просто склеивался по скоупам и обрезался по лимиту, из-за чего порядок
    // не отражал реальную свежесть задач.
    const homeTasks = useMemo(() => {
        const allTasks = [
            ...coordination.tasks,
            ...myVndApproval.tasks,
            ...actualization.tasks,
            ...consolidation.tasks,
            ...rejected.tasks,
        ];
        return [...allTasks]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, HOME_TASKS_LIMIT);
    }, [coordination.tasks, myVndApproval.tasks, actualization.tasks, consolidation.tasks, rejected.tasks]);

    const tasksTotalCount = coordination.tasks.length + myVndApproval.tasks.length
        + actualization.tasks.length + consolidation.tasks.length + rejected.tasks.length
        + szTasks.length;
    const tasksLoading = coordination.isLoading || myVndApproval.isLoading
        || actualization.isLoading || consolidation.isLoading || rejected.isLoading
        || szTasksLoading;

    // Текущая дата - локализуется под текущий язык
    const formattedDate = useFormattedDate();

    // Приветствие
    const timeGreeting = useTimeGreeting();
    const greeting = useMemo(() => {
        const firstLastNameRaw = getFirstLastName(user?.fullName);
        const firstLastName = isLatin ? transliterate(firstLastNameRaw) : firstLastNameRaw;
        return firstLastName ? `${timeGreeting}, ${firstLastName}!` : timeGreeting;
    }, [user?.fullName, timeGreeting, isLatin]);

    if (loading) {
        /* Загрузка главной страницы */
        return <Loader label={t("home.loadingPage")} fullHeight={false}/>;
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

            {/* Сетка с карточками с информацией об активности деятельности */}
            <HomeKpiGrid summary={homeSummary}/>
            <HomeContoursCard/>

            <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-[18px]">
                {/* Виджет последних задач */}
                <MyTasksCard tasks={homeTasks} szTasks={szTasks} totalCount={tasksTotalCount} isLoading={tasksLoading}/>

                {/* Виджет плана актуализации и журнал действий */}
                <div className="flex flex-col gap-[18px]">
                    <ActualizationPlanCard summary={actualizationSummary} isLoading={actualizationLoading}/>
                    <RecentActivityCard limit={8}/>
                </div>
            </div>
            {/* Создание документа */}
            {isCreateModalOpen && (
                <CreateDocumentModal onClose={() => setIsCreateModalOpen(false)}/>
            )}
        </div>
    );
}