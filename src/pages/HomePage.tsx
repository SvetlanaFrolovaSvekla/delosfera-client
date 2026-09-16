import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext";

import {taskInboxService, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {useActualizationSummary} from "@/hooks/vndHooks/useActualizationSummary.ts";
import {useTimeGreeting} from "@/hooks/generalHooks/useTimeGreeting.ts";
import {useFormattedDate} from "@/hooks/generalHooks/useFormattedDate.ts";
import {useVndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {getFirstLastName} from "@/utils/userNaming.ts";
import {transliterate} from "@/utils/transliterate.ts";
import {HOME_TASKS_LIMIT} from "@/constants/validation/HomeTasksLimit.ts";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {CreateDocumentModal} from "@/components/componentsModal/CreateDocumentModal.tsx";
import {HomePageHeader} from "@/components/componentsHome/HomePageHeader.tsx";
import {HomeKpiSection} from "@/components/componentsHome/HomeKpiSection.tsx";
import {MyTasksCard} from "@/components/componentsHome/MyTasksCard.tsx";
import {ActualizationPlanCard} from "@/components/componentsHome/ActualizationPlanCard.tsx";
import {RecentActivityCard} from "@/components/componentsHome/RecentActivityCard.tsx";
import {RecentNotificationsCard} from "@/components/componentsHome/RecentNotificationsCard.tsx";

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

    // Реальные задачи по всем скоупам
    const coordination = useVndTasks("coordination");
    const myVndApproval = useVndTasks("myVndApproval");
    const actualization = useVndTasks("actualization");
    const consolidation = useVndTasks("consolidation");
    const rejected = useVndTasks("rejected");
    // Заявки на доступ к актуализации, ждущие решения главного редактора, и уже одобренные
    // заявки, по которым заявитель ещё не начал цикл
    const actualizationRequest = useVndTasks("actualizationRequest");
    const actualizationApproved = useVndTasks("actualizationApproved");
    const {summary: actualizationSummary, isLoading: actualizationLoading} = useActualizationSummary();
    const {summary: homeSummary} = useVndHomeSummary();

    // Задачи по служебным запискам живут в сводном реестре
    const [szTasks, setSzTasks] = useState<InboxTask[]>([]);
    const [szTasksLoading, setSzTasksLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // Задачи по закупкам
    const [prcTasks, setPrcTasks] = useState<InboxTask[]>([]);
    const [prcTasksLoading, setPrcTasksLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrcTasksLoading(true);
        taskInboxService.get("Procurement")
            .then((inbox) => {
                if (!cancelled) setPrcTasks(inbox.tasks);
            })
            .catch(() => {
                if (!cancelled) setPrcTasks([]);
            })
            .finally(() => {
                if (!cancelled) setPrcTasksLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // "Последние задачи"
    const homeTasks = useMemo(() => {
        const allTasks = [
            ...coordination.tasks,
            ...myVndApproval.tasks,
            ...actualization.tasks,
            ...consolidation.tasks,
            ...rejected.tasks,
            ...actualizationRequest.tasks,
            ...actualizationApproved.tasks,
        ];
        return [...allTasks]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, HOME_TASKS_LIMIT);
    }, [
        coordination.tasks, myVndApproval.tasks, actualization.tasks, consolidation.tasks, rejected.tasks,
        actualizationRequest.tasks, actualizationApproved.tasks,
    ]);

    // Настоящее число задач по контуру ВНД
    const vndTasksCount = coordination.tasks.length + myVndApproval.tasks.length
        + actualization.tasks.length + consolidation.tasks.length + rejected.tasks.length
        + actualizationRequest.tasks.length + actualizationApproved.tasks.length;
    const tasksTotalCount = vndTasksCount + szTasks.length + prcTasks.length;
    const tasksLoading = coordination.isLoading || myVndApproval.isLoading
        || actualization.isLoading || consolidation.isLoading || rejected.isLoading
        || actualizationRequest.isLoading || actualizationApproved.isLoading
        || szTasksLoading || prcTasksLoading;

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
        <div className="w-full max-w-[17000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-[22px]">
            <HomePageHeader
                formattedDate={formattedDate}
                greeting={greeting}
                rolePosition={rolePosition}
                roleDept={roleDept}
                onCreateClick={() => setIsCreateModalOpen(true)}
            />

            {/* Сетка с карточками с информацией об активности деятельности */}
            <HomeKpiSection summary={homeSummary} totalTasksCount={tasksTotalCount}/>

            {/* Верхняя пара - "Мои задачи" и "План актуализации" */}
            <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[1.65fr_1fr]">
                <MyTasksCard
                    tasks={homeTasks}
                    szTasks={szTasks}
                    prcTasks={prcTasks}
                    isLoading={tasksLoading}
                    counts={{vnd: vndTasksCount, sz: szTasks.length, prc: prcTasks.length}}
                />
                <ActualizationPlanCard summary={actualizationSummary} isLoading={actualizationLoading}/>
            </div>

            {/* Нижняя пара — "Последние уведомления" и "Последняя активность" */}
            <div className="mt-[18px] grid grid-cols-1 items-start xl:grid-cols-[1.65fr_1fr] gap-[18px]">
                <RecentNotificationsCard limit={15}/>
                <RecentActivityCard limit={15}/>
            </div>
            {/* Создание документа */}
            {isCreateModalOpen && (
                <CreateDocumentModal onClose={() => setIsCreateModalOpen(false)}/>
            )}
        </div>
    );
}