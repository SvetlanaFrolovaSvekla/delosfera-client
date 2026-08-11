import {useAuth} from "@/context/AuthContext";
import {useNavigate} from "react-router-dom";
import {Icon} from "@/components/icons/Icon";
import {useEffect, useMemo, useState} from "react";
import {userService} from "@/service/userService/userService.ts";
import type {UserActivityItem} from "@/service/userService/userServiceType.ts";
import {getTimeGreeting} from "@/utils/getTimeGreeting.ts";
import {getFirstLastName} from "@/utils/userNaming.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {getFormattedDate} from "@/utils/dateUtils.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {VndTaskCard} from "@/pages/TasksPages/VndTaskCard.tsx";
import {useActualizationSummary} from "@/hooks/vndHooks/useActualizationSummary.ts";
import {ACTUALIZATION_BUCKET_META, ACTUALIZATION_BUCKET_ORDER} from "@/constants/actualizationBucket.ts";
import {CreateDocumentModal} from "@/components/CreateDocumentModal.tsx";
import {useVndHomeSummary} from "@/hooks/analyticsHooks/useVndHomeSummary.ts";
import {dashboardService, type DashboardSummary} from "@/service/dashboardService/dashboardService.ts";

// Сколько задач показывать в сводке на главной
const HOME_TASKS_LIMIT = 25;

// Иконка/цвет карточки активности по типу действия
const ACTIVITY_STYLE: Record<UserActivityItem["type"], { icon: "check" | "vnd"; col: string; bg: string }> = {
    vnd_created: {icon: "vnd", col: "#7a5ce0", bg: "#efeafe"},
    approval_decided: {icon: "check", col: "#1c7a4d", bg: "#e2f4ea"},
    approval_initiated: {icon: "check", col: "#2f68f5", bg: "#e9f0ff"},
};

// Относительное время ("12 мин назад") для ленты активности
function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "только что";
    if (min < 60) return `${min} мин назад`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
}

export function HomePage() {
    const {user, loading} = useAuth();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const roleDept = user?.orgUnit?.titleRu ?? ""; // СП
    const rolePosition = user?.position?.name // Должность

    // Реальные задачи по всем скоупам (как на странице "Мои задачи"), объединённые в одну сводку
    const coordination = useVndTasks("coordination");
    const actualization = useVndTasks("actualization");
    const consolidation = useVndTasks("consolidation");
    const {summary: actualizationSummary, isLoading: actualizationLoading} = useActualizationSummary();
    const {summary: homeSummary} = useVndHomeSummary();

    // Сводка по остальным контурам (СЗ, закупки) и активные замещения (GEN-14/15)
    const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
    useEffect(() => {
        if (!user) return;
        dashboardService.summary().then(setDashboard).catch(() => undefined);
    }, [user]);

    // Лента последней активности текущего пользователя (реальные данные)
    const [activity, setActivity] = useState<UserActivityItem[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        setActivityLoading(true);
        userService
            .getActivity(user.id)
            .then((data) => { if (!cancelled) setActivity(data.recent.slice(0, 6)); })
            .catch(() => { if (!cancelled) setActivity([]); })
            .finally(() => { if (!cancelled) setActivityLoading(false); });
        return () => { cancelled = true; };
    }, [user]);


    const kpis = [
        {
            label: "На актуализации под моей ответственностью",
            value: homeSummary?.myResponsibleActualizations ?? 0,
            col: "#7a5ce0", tint: "#efeafe", bd: "#ddd0fa"
        },
        {
            label: "Просроченные мной согласования в этом месяце",
            value: homeSummary?.myTimeoutApprovalsThisMonth ?? 0,
            col: "#c0392b", tint: "#fbe7e4", bd: "#f1c9c2"
        },
        {
            label: "Мои ВНД, ожидающие согласования",
            value: homeSummary?.myVndAwaitingApproval ?? 0,
            col: "#b3730a", tint: "#fdf3e0", bd: "#f0dcae"
        },
        {
            label: "ВНД, которые мне необходимо согласовать",
            value: homeSummary?.pendingMyApproval ?? 0,
            col: "var(--app-accent, #2f68f5)",
            tint: "var(--app-soft, #e9f0ff)",
            bd: "var(--app-bd, #cbddff)"
        },
    ];

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
        <div className="w-full max-w-[17000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px]">
            {/* Заголовок */}
            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <div className="text-[12.5px] font-medium text-[#8b97ab]">{formattedDate}</div>
                    <h1 className="mt-[5px] text-[25px] font-bold tracking-[-0.02em]">{greeting}</h1>
                    <div className="mt-[9px] flex items-center gap-2.5">
                        <span
                            className="inline-flex items-center gap-[7px] rounded-lg bg-[var(--app-soft,_#e9f0ff)] px-[11px] py-[5px] text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)]">
                            <Icon name="user" width={14} height={14}/>
                            {rolePosition}
                        </span>
                        <span className="text-[12.5px] text-[#8b97ab]">{roleDept}</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[var(--app-accent,_#2f68f5)] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_var(--app-accent,_#2f68f5)] hover:brightness-[1.06]">
                    <Icon name="plus" width={18} height={18} strokeWidth={2}/>
                    Создать документ
                </button>
            </div>

            {/* Замещение (GEN-14): пока период идёт, задачи отсутствующего приходят сюда */}
            {dashboard && dashboard.actingFor.length > 0 && (
                <div className="mb-5 rounded-[14px] border border-[#f0c98a] bg-[#fffaf0] px-4 py-3">
                    <div className="text-[13px] font-semibold text-[#8a5a00]">Активно замещение</div>
                    {dashboard.actingFor.map(s => (
                        <div key={s.id} className="mt-1 text-[12.5px] leading-[1.6] text-[#8a5a00]">
                            Вы замещаете: <b>{s.userName}</b> — задачи перенаправлены вам автоматически
                            с сохранением сроков. Период: {s.startsOn} — {s.endsOn}
                            {s.reason ? ` · ${s.reason}` : ""}
                        </div>
                    ))}
                </div>
            )}

            {/* На время отсутствия задачи ведёт замещающий — показываем, кто именно */}
            {dashboard && dashboard.replacedBy.length > 0 && (
                <div className="mb-5 rounded-[14px] border border-[#cbddff] bg-[#e9f0ff] px-4 py-3">
                    {dashboard.replacedBy.map(s => (
                        <div key={s.id} className="text-[12.5px] leading-[1.6] text-[#2f68f5]">
                            Вас замещает <b>{s.userName}</b> до {s.endsOn}
                            {s.reason ? ` · ${s.reason}` : ""}
                        </div>
                    ))}
                </div>
            )}

            {/* KPI */}
            <div className="mb-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => (
                    <button
                        key={k.label}
                        className="cursor-pointer relative overflow-hidden rounded-[14px] border p-4 pb-[17px] text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(15,27,45,.34)]"
                        style={{background: k.tint, borderColor: k.bd}}
                    >
                        <span className="absolute inset-y-0 left-0 w-1" style={{background: k.col}}/>
                        <div className="flex items-center justify-between">
                            <span
                                className="min-h-8 text-[12px] font-medium leading-[1.35] text-[#5b6675]">{k.label}</span>
                            <Icon name="chevr" width={15} height={15} className="ml-2 flex-none text-[#c3ccd8]"/>
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2.5">
                            <span
                                className="text-[31px] font-bold tracking-[-0.02em]"
                                style={{color: k.col, fontFamily: "'IBM Plex Mono', monospace"}}
                            >
                                {k.value}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Сводка по остальным контурам: записки и закупки (GEN-15).
                Тон плитки задаётся срочностью — просрочка краснеет независимо от контура. */}
            {dashboard && dashboard.kpis.length > 0 && (
                <div className="mb-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {dashboard.kpis.map(k => {
                        const tone = k.tone === "danger"
                            ? {col: "#c0392b", tint: "#fdeeec", bd: "#f3c9c2"}
                            : k.tone === "warning"
                                ? {col: "#c77700", tint: "#fffaf0", bd: "#f0c98a"}
                                : {col: "#2f68f5", tint: "#f6f8fb", bd: "#e5e9f0"};

                        const target = k.code.startsWith("sz")
                            ? "/sz"
                            : k.code.startsWith("prc")
                                ? "/prc"
                                : "/tasks";

                        return (
                            <button
                                key={k.code}
                                onClick={() => navigate(target)}
                                className="cursor-pointer relative overflow-hidden rounded-[14px] border p-4 pb-[17px] text-left transition-transform hover:-translate-y-0.5"
                                style={{background: tone.tint, borderColor: tone.bd}}
                            >
                                <span className="absolute inset-y-0 left-0 w-1" style={{background: tone.col}}/>
                                <span className="block min-h-8 text-[12px] font-medium leading-[1.35] text-[#5b6675]">
                                    {k.label}
                                </span>
                                <span
                                    className="mt-1.5 block text-[28px] font-bold tracking-[-0.02em]"
                                    style={{color: tone.col, fontFamily: "'IBM Plex Mono', monospace"}}
                                >
                                    {k.value}
                                </span>
                                {k.note && (
                                    <span className="mt-0.5 block text-[11px] text-[#8b97ab]">{k.note}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-[18px]">
                {/* Мои задачи */}
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div
                        className="flex items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-[15px] font-semibold">Мои задачи · нормотворчество</h2>
                            <span
                                className="rounded-full bg-[var(--app-soft,_#e9f0ff)] px-2 py-[2px] text-[11.5px] font-bold text-[var(--app-accent,_#2f68f5)]"
                                style={{fontFamily: "'IBM Plex Mono', monospace"}}
                            >
                                {tasksTotalCount}
                            </span>
                        </div>
                        <button
                            className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                            onClick={() => navigate("/tasks")}
                        >
                            Все задачи
                        </button>
                    </div>
                    <div>
                        {tasksLoading ? (
                            <Loader label="Загрузка задач…" fullHeight={false}/>
                        ) : homeTasks.length === 0 ? (
                            <div className="px-[18px] py-6 text-center text-[13px] text-[#8b97ab]">
                                Нет активных задач
                            </div>
                        ) : (
                            homeTasks.map((task) => (
                                <VndTaskCard key={task.vndId} task={task}/>
                            ))
                        )}
                    </div>
                </div>

                {/* Правая колонка */}
                <div className="flex flex-col gap-[18px]">
                    {/* План актуализации ВНД */}
                    <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                        <div
                            className="flex items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                            <h2 className="text-[15px] font-semibold">План актуализации ВНД</h2>
                            <button
                                onClick={() => navigate("/actualization")}
                                className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                            >
                                Смотреть план
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-[9px] p-8">
                            {ACTUALIZATION_BUCKET_ORDER.map((key) => {
                                const meta = ACTUALIZATION_BUCKET_META[key];
                                const Icon = meta.icon;
                                const count = actualizationSummary ? actualizationSummary[key] : null;

                                return (
                                    <div
                                        key={key}
                                        className="rounded-[11px] border px-1.5 py-[12px] text-center"
                                        style={{borderColor: meta.color + "33", background: meta.bg}}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Icon className="w-[13px] h-[13px]" style={{color: meta.color}}
                                                  strokeWidth={2}/>
                                            <div
                                                className="text-[26px] font-bold leading-none"
                                                style={{color: meta.color, fontFamily: "'IBM Plex Mono', monospace"}}
                                            >
                                                {actualizationLoading ? "—" : count ?? 0}
                                            </div>
                                        </div>
                                        <div className="mt-[5px] text-[10.5px] font-semibold"
                                             style={{color: meta.color}}>
                                            {meta.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>

                    {/* Последняя активность */}
                    <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                        <div className="border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                            <h2 className="text-[15px] font-semibold">Последняя активность</h2>
                        </div>
                        <div className="px-[18px] pb-[14px] pt-1.5">
                            {activityLoading ? (
                                <div className="py-6 text-center text-[12.5px] text-[#8b97ab]">Загрузка…</div>
                            ) : activity.length === 0 ? (
                                <div className="py-6 text-center text-[12.5px] text-[#8b97ab]">Действий пока нет</div>
                            ) : (
                                activity.map((a, i) => {
                                    const style = ACTIVITY_STYLE[a.type];
                                    const text = a.vndCode ? `${a.description} · ${a.vndCode}` : a.description;
                                    return (
                                        <div key={i}
                                             className="flex gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0">
                                            <span
                                                className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px]"
                                                style={{background: style.bg, color: style.col}}
                                            >
                                                <Icon name={style.icon} width={14} height={14}/>
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-[12.5px] leading-[1.4] text-[#26324a]">{text}</div>
                                                {a.vndTitle && (
                                                    <div className="truncate text-[11.5px] text-[#8b97ab]">{a.vndTitle}</div>
                                                )}
                                                <div className="mt-0.5 text-[11px] text-[#8b97ab]">{formatRelative(a.timestamp)}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateDocumentModal onClose={() => setIsCreateModalOpen(false)}/>
            )}
        </div>
    );
}