// Страница "Статистика по моим задачам"
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {taskInboxService, type TaskStats} from "@/service/workflowService/taskInboxService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Kpi, GroupCard} from "@/components/componentsTasks/TaskStatsWidgets.tsx";
import {ArrowLeft} from "lucide-react";

export function TaskStatsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [stats, setStats] = useState<TaskStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        taskInboxService.stats()
            .then(setStats)
            .catch(() => setError(t("tasks.stats.loadError")));
    }, [t]);

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("tasks.common.statsTitle")}
                description={t("tasks.stats.description")}
                actions={(
                    <button
                        type="button"
                        onClick={() => navigate("/tasks")}
                        className="cursor-pointer flex items-center gap-2 rounded-[10px] border border-[#d5dbe6] bg-white px-4 py-2
                                   text-[14px] font-medium text-[#374253] transition hover:bg-[#f4f6fa]"
                    >
                        <ArrowLeft size={17}/>
                        {t("tasks.stats.back")}
                    </button>
                )}
            />

            {error && <div className="mt-4 text-[13px] text-[#c0392b]">{error}</div>}
            {!stats && !error && <div className="mt-4 text-[13px] text-[#8b97ab]">{t("general.loading")}</div>}

            {stats && (
                <div className="mt-5 flex flex-col gap-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Kpi label={t("tasks.stats.kpis.total")} value={stats.total}/>
                        <Kpi label={t("tasks.stats.kpis.overdue")} value={stats.overdue} tone="bad"/>
                        <Kpi label={t("tasks.stats.kpis.dueToday")} value={stats.dueToday} tone="warn"/>
                        <Kpi label={t("tasks.stats.kpis.dueThisWeek")} value={stats.dueThisWeek}/>
                        <Kpi label={t("tasks.stats.kpis.noDue")} value={stats.noDue}/>
                        <Kpi label={t("tasks.stats.kpis.delegated")} value={stats.delegated}/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <GroupCard title={t("tasks.stats.byContour")} groups={stats.byContour}/>
                        <GroupCard title={t("tasks.stats.byType")} groups={stats.byType}/>
                    </div>
                </div>
            )}
        </div>
    );
}
