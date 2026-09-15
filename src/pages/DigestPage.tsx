import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AlertTriangle, CalendarClock, Inbox, Share2} from "lucide-react";
import {digestService, type Digest} from "@/service/analyticsService/digestService.ts";
import {taskLink, taskKey, type InboxTask} from "@/service/workflowService/taskInboxService.ts";

/**
 * Персональный дайджест (УВ-14): одна сводка «что требует моего внимания» по всем
 * контурам — свёрнутый единый реестр задач. Счётчики, разбивка по контурам и два
 * коротких списка: что горит и что на подходе.
 */

function formatDue(iso: string | null): string {
    if (!iso) return "без срока";
    return new Date(iso).toLocaleString("ru-RU", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
}

function Kpi({icon: Icon, label, value, color, bg, hint}: {
    icon: typeof Inbox; label: string; value: number; color: string; bg: string; hint?: string;
}) {
    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl p-4 flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[12px] grid place-items-center shrink-0" style={{background: bg, color}}>
                <Icon className="w-5 h-5" strokeWidth={2}/>
            </div>
            <div className="min-w-0">
                <div className="text-[20px] font-bold text-[#0f1b2d] leading-tight">{value}</div>
                <div className="text-[12px] text-[#8b97ab] font-medium truncate">{label}</div>
                {hint && <div className="text-[11px] text-[#a3adbd] truncate">{hint}</div>}
            </div>
        </div>
    );
}

function TaskRow({task}: {task: InboxTask}) {
    return (
        <Link
            key={taskKey(task)}
            to={taskLink(task)}
            className="flex items-center gap-3 px-4 py-2.5 border-t border-[#eef2f7] no-underline text-inherit hover:bg-[#fafbfd]"
            style={{background: task.isOverdue ? "#fdf6f5" : undefined}}
        >
            <span className="text-[11px] font-bold text-[#55617a] bg-[#f2f5f9] rounded-md px-2 py-0.5 whitespace-nowrap">
                {task.documentTypeTitle}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-[#0f1b2d] truncate">{task.documentTitle}</span>
                <span className="block text-[11.5px] text-[#8b97ab] truncate">
                    {task.regNumber ?? "без номера"} · {task.taskType}
                    {task.onBehalfOf && ` · за ${task.onBehalfOf}`}
                </span>
            </span>
            <span className="text-[12px] font-semibold whitespace-nowrap" style={{color: task.isOverdue ? "#c0392b" : "#55617a"}}>
                {task.isOverdue ? "просрочено · " : "до "}{formatDue(task.dueAt)}
            </span>
        </Link>
    );
}

export function DigestPage() {
    const [digest, setDigest] = useState<Digest | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        digestService.get().then(setDigest).catch(() => setError(true));
    }, []);

    const today = new Date().toLocaleDateString("ru-RU", {weekday: "long", day: "numeric", month: "long"});

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <div className="mb-4">
                <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Мой дайджест</h1>
                <div className="mt-1 text-[12.5px] text-[#8b97ab] first-letter:uppercase">{today}</div>
            </div>

            {error && <div className="text-[13px] text-[#c0392b]">Не удалось загрузить дайджест</div>}
            {!digest && !error && <div className="text-[13px] text-[#8b97ab]">Загрузка…</div>}

            {digest && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Kpi icon={Inbox} label="Задач всего" value={digest.total} color="#4e57d6" bg="#eef0ff"/>
                        <Kpi icon={AlertTriangle} label="Просрочено" value={digest.overdue} color="#dc2626" bg="#fdecec"/>
                        <Kpi icon={CalendarClock} label="В ближайшие 48 ч" value={digest.dueSoon} color="#d97706" bg="#fef3e2"/>
                        <Kpi icon={Share2} label="По замещению" value={digest.delegated} color="#137a43" bg="#e6f4ec"/>
                    </div>

                    {digest.contours.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {digest.contours.map(c => (
                                <span key={c.contour} className="inline-flex items-center gap-1.5 bg-white border border-[#e5e9f0] rounded-full px-3 py-1.5 text-[12.5px]">
                                    <span className="font-semibold text-[#0f1b2d]">{c.title}</span>
                                    <span className="text-[#8b97ab]">{c.count}</span>
                                    {c.overdue > 0 && <span className="text-[#c0392b] font-semibold">· {c.overdue} просроч.</span>}
                                </span>
                            ))}
                        </div>
                    )}

                    {digest.overdueItems.length > 0 && (
                        <section className="bg-white border border-[#e5e9f0] rounded-[13px] overflow-hidden">
                            <div className="px-4 py-2.5 text-[13px] font-bold text-[#c0392b] flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> Что горит
                            </div>
                            {digest.overdueItems.map(t => <TaskRow key={taskKey(t)} task={t}/>)}
                        </section>
                    )}

                    <section className="bg-white border border-[#e5e9f0] rounded-[13px] overflow-hidden">
                        <div className="px-4 py-2.5 text-[13px] font-bold text-[#0f1b2d] flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-[#8b97ab]"/> На подходе
                        </div>
                        {digest.upcoming.length === 0
                            ? <div className="px-4 py-6 text-center text-[13px] text-[#8b97ab]">Ближайших сроков нет</div>
                            : digest.upcoming.map(t => <TaskRow key={taskKey(t)} task={t}/>)}
                    </section>

                    <Link to="/tasks" className="text-[13px] font-semibold text-[#2f68f5] no-underline hover:underline self-start">
                        Открыть все задачи →
                    </Link>
                </div>
            )}
        </div>
    );
}
