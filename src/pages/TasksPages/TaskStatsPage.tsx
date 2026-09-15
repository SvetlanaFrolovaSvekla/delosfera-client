import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowLeft} from "lucide-react";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {taskInboxService, type TaskStats, type TaskStatGroup} from "@/service/workflowService/taskInboxService.ts";

/**
 * Статистика по моим задачам (ЗД-1): сводка открытых задач под тремя углами —
 * сроки, контуры, типы. Данные те же, что в сводном реестре, но собранные так,
 * чтобы увидеть перекос до того, как он станет просрочкой.
 */
export function TaskStatsPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<TaskStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        taskInboxService.stats()
            .then(setStats)
            .catch(() => setError("Не удалось загрузить статистику"));
    }, []);

    return (
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title="Статистика по моим задачам"
                description="Открытые задачи по всем контурам: сроки, распределение по контурам и типам"
                actions={(
                    <button
                        type="button"
                        onClick={() => navigate("/tasks")}
                        className="flex items-center gap-2 rounded-[10px] border border-[#d5dbe6] bg-white px-4 py-2
                                   text-[14px] font-medium text-[#374253] transition hover:bg-[#f4f6fa]"
                    >
                        <ArrowLeft size={17}/>
                        К задачам
                    </button>
                )}
            />

            {error && <div className="mt-4 text-[13px] text-[#c0392b]">{error}</div>}
            {!stats && !error && <div className="mt-4 text-[13px] text-[#8b97ab]">Загрузка…</div>}

            {stats && (
                <div className="mt-5 flex flex-col gap-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Kpi label="Всего" value={stats.total}/>
                        <Kpi label="Просрочено" value={stats.overdue} tone="bad"/>
                        <Kpi label="Срок сегодня" value={stats.dueToday} tone="warn"/>
                        <Kpi label="На неделе" value={stats.dueThisWeek}/>
                        <Kpi label="Без срока" value={stats.noDue}/>
                        <Kpi label="По замещению" value={stats.delegated}/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <GroupCard title="По контурам" groups={stats.byContour}/>
                        <GroupCard title="По типам задач" groups={stats.byType}/>
                    </div>
                </div>
            )}
        </div>
    );
}

function Kpi({label, value, tone}: {label: string; value: number; tone?: "bad" | "warn"}) {
    const color = tone === "bad" ? "#c0392b" : tone === "warn" ? "#b3730a" : "#0f1b2d";
    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white px-4 py-3.5">
            <div className="text-[22px] font-bold leading-none" style={{color}}>{value}</div>
            <div className="mt-1.5 text-[12px] text-[#8b97ab]">{label}</div>
        </div>
    );
}

function GroupCard({title, groups}: {title: string; groups: TaskStatGroup[]}) {
    const max = Math.max(1, ...groups.map(g => g.count));
    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white p-5">
            <div className="text-[14px] font-semibold text-[#0f1b2d]">{title}</div>
            {groups.length === 0 ? (
                <div className="mt-3 text-[13px] text-[#8b97ab]">Открытых задач нет.</div>
            ) : (
                <div className="mt-4 flex flex-col gap-3">
                    {groups.map(g => (
                        <div key={g.key}>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[13px] text-[#374253]">{g.title}</span>
                                <span className="text-[13px] tabular-nums text-[#6b7688]">
                                    {g.count}
                                    {g.overdue > 0 && (
                                        <span className="ml-1.5 text-[#c0392b]">· {g.overdue} просроч.</span>
                                    )}
                                </span>
                            </div>
                            <div className="mt-1.5 h-[7px] rounded-full bg-[#eef2f7] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[#4e57d6]"
                                    style={{width: `${Math.round((g.count / max) * 100)}%`}}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
