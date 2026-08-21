import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext";
import {useVndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
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
                <MyTasksCard tasks={homeTasks} totalCount={tasksTotalCount} isLoading={tasksLoading}/>

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