/**
 * Персональный дайджест (УВ-14): одна сводка «что требует моего внимания» по всем
 * контурам — свёрнутый единый реестр задач. Счётчики, разбивка по контурам и два
 * коротких списка: что горит и что на подходе.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {digestService, type Digest} from "@/service/analyticsService/digestService.ts";
import {taskLink, taskKey, type InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {useAnyModalOpen} from "@/hooks/generalHooks/useAnyModalOpen.ts";
import {useFormattedDate} from "@/hooks/generalHooks/useFormattedDate.ts";
import {AlertTriangle, ArrowRight, CalendarClock, Inbox, Share2} from "lucide-react";

// Совпадает с шагом блика в HomeKpiSection (18с анимация / 9 слотов = 2с на карточку) —
// здесь карточек всего 4, так что слоты просто 0..3.
const SHINE_SLOT_SECONDS = 2;

function formatDue(iso: string | null, t: (key: string) => string): string {
    if (!iso) return t("digest.noDueDate"); // без срока
    return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function Kpi({icon: Icon, label, value, color, bg, hint, shineDelay, anyModalOpen}: {
    icon: typeof Inbox; label: string; value: number; color: string; bg: string; hint?: string;
    shineDelay: number; anyModalOpen: boolean;
}) {
    return (
        <div
            className="relative overflow-hidden bg-white border border-[#e9edf3] rounded-2xl p-4 flex items-center gap-3 min-w-0 transition-transform hover:-translate-y-0.5"
        >
            {/* Блик — как на главной */}
            {!anyModalOpen && (
                <span
                    className="kpi-shine-sweep"
                    style={{animationDelay: `${shineDelay * -SHINE_SLOT_SECONDS}s`}}
                    aria-hidden="true"
                />
            )}
            <span className="absolute inset-y-0 left-0 w-1" style={{background: color}}/>
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

function TaskRow({task}: { task: InboxTask }) {
    const {t} = useTranslation();
    return (
        <Link
            key={taskKey(task)}
            to={taskLink(task)}
            className="flex items-center gap-3 px-4 py-2.5 border-t border-[#eef2f7] no-underline text-inherit hover:bg-[#fafbfd]"
            style={{background: task.isOverdue ? "#fdf6f5" : undefined}}
        >
            <span
                className="text-[11px] font-bold text-[#55617a] bg-[#f2f5f9] rounded-md px-2 py-0.5 whitespace-nowrap">
                {task.documentTypeTitle}
            </span>
            <span className="block text-[11.5px] text-[#8b97ab] truncate">
                {task.regNumber ?? t("digest.noRegNumber")} · {task.taskType}
                {/* без номера */}
                {task.onBehalfOf && ` ${t("digest.onBehalfOf", {name: task.onBehalfOf})}`}
                {/* · за {{name}} */}
            </span>
            <span className="text-[12px] font-semibold whitespace-nowrap"
                  style={{color: task.isOverdue ? "#c0392b" : "#55617a"}}>
                {/* просрочено · / до */}
                {task.isOverdue ? t("digest.overduePrefix") : t("digest.duePrefix")} {formatDue(task.dueAt, t)}
            </span>
        </Link>
    );
}

export function DigestPage() {
    const {t} = useTranslation();
    const [digest, setDigest] = useState<Digest | null>(null);
    const [error, setError] = useState(false);
    const anyModalOpen = useAnyModalOpen();

    useEffect(() => {
        digestService.get().then(setDigest).catch(() => setError(true));
    }, []);

    const today = useFormattedDate();

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 pb-12">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("digest.title")}</h1> {/* Мой дайджест */}
                    <div className="mt-1 text-[12.5px] text-[#8b97ab] first-letter:uppercase">{today}</div>
                </div>

                <Link
                    to="/tasks"
                    className="inline-flex items-center gap-[7px] !text-[#8b97ab] text-[13px] font-medium
                    no-underline hover:!text-[#4e57d6]"
                >
                    {t("digest.openAllTasks")} {/* Открыть все задачи */}
                    <ArrowRight className="w-4 h-4" strokeWidth={2}/>
                </Link>
            </div>

            {error && <div
                className="text-[13px] text-[#c0392b]">{t("digest.loadError")}</div>} {/* Не удалось загрузить дайджест */}
            {!digest && !error &&
                <div className="text-[13px] text-[#8b97ab]">{t("digest.loading")}</div>} {/* Загрузка… */}

            {digest && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Kpi icon={Inbox} label={t("digest.totalTasks")} value={digest.total} color="#4e57d6"
                             bg="#eef0ff"
                             shineDelay={0} anyModalOpen={anyModalOpen}/> {/* Задач всего */}
                        <Kpi icon={AlertTriangle} label={t("digest.overdue")} value={digest.overdue} color="#dc2626"
                             bg="#fdecec"
                             shineDelay={1} anyModalOpen={anyModalOpen}/> {/* Просрочено */}
                        <Kpi icon={CalendarClock} label={t("digest.dueSoon")} value={digest.dueSoon} color="#d97706"
                             bg="#fef3e2"
                             shineDelay={2} anyModalOpen={anyModalOpen}/> {/* В ближайшие 48 ч */}
                        <Kpi icon={Share2} label={t("digest.delegated")} value={digest.delegated} color="#137a43"
                             bg="#e6f4ec"
                             shineDelay={3} anyModalOpen={anyModalOpen}/> {/* По замещению */}
                    </div>

                    {digest.contours.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {digest.contours.map(c => (
                                <span key={c.contour}
                                      className="inline-flex items-center gap-1.5 bg-white border border-[#e5e9f0] rounded-full px-3 py-1.5 text-[12.5px]">
                                    <span className="font-semibold text-[#0f1b2d]">{c.title}</span>
                                    <span className="text-[#8b97ab]">{c.count}</span>
                                    {/* просроч. */}
                                    {c.overdue > 0 &&
                                        <span
                                            className="text-[#c0392b] font-semibold">· {c.overdue} {t("digest.overdueShort")}</span>}
                                </span>
                            ))}
                        </div>
                    )}

                    {digest.overdueItems.length > 0 && (
                        <section className="bg-white border border-[#e5e9f0] rounded-[13px] overflow-hidden">
                            <div className="px-4 py-2.5 text-[13px] font-bold text-[#c0392b] flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/> {t("digest.burningNow")} {/* Что горит */}
                            </div>
                            {digest.overdueItems.map(item => <TaskRow key={taskKey(item)} task={item}/>)}
                        </section>
                    )}

                    <section className="bg-white border border-[#e5e9f0] rounded-[13px] overflow-hidden">
                        <div className="px-4 py-2.5 text-[13px] font-bold text-[#0f1b2d] flex items-center gap-2">
                            <CalendarClock
                                className="w-4 h-4 text-[#8b97ab]"/> {t("digest.upcoming")} {/* На подходе */}
                        </div>
                        {/* Ближайших сроков нет */}
                        {digest.upcoming.length === 0
                            ? <div
                                className="px-4 py-6 text-center text-[13px] text-[#8b97ab]">{t("digest.noUpcoming")}</div>
                            : digest.upcoming.map(item => <TaskRow key={taskKey(item)} task={item}/>)}
                    </section>
                </div>
            )}
        </div>
    );
}
