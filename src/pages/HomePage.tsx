import { useAuth } from "@/context/AuthContext";
import { Icon } from "@/components/icons/Icon";
import {useMemo} from "react";
import {getTimeGreeting} from "@/utils/getTimeGreeting.ts";
import {getFirstLastName} from "@/utils/userNaming.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {getFormattedDate} from "@/utils/dateUtils.ts";
import {useVndTasks} from "@/hooks/tasksVndHooks/useVndTasks.ts";
import {VndTaskCard} from "@/pages/TasksPages/VndTaskCard.tsx";

// TODO: заменить моковые данные реальными из API (сейчас - дашборд роли "Отдел методологии")
const kpis = [
    { label: "На финальном контроле", value: 4, col: "#7a5ce0", tint: "#efeafe", bd: "#ddd0fa" },
    { label: "Просроченные позиции плана", value: 3, col: "#c0392b", tint: "#fbe7e4", bd: "#f1c9c2" },
    { label: "Актуализации < 30 дней", value: 6, col: "#b3730a", tint: "#fdf3e0", bd: "#f0dcae" },
    { label: "ТИД в работе", value: 12, col: "var(--app-accent, #2f68f5)", tint: "var(--app-soft, #e9f0ff)", bd: "var(--app-bd, #cbddff)" },
];

const ryg = [
    { n: 14, label: "> 30 дней", col: "#1c7a4d", bg: "#e9f6ee", bd: "#c3e6d1" },
    { n: 6, label: "< 30 дней", col: "#b3730a", bg: "#fdf3e0", bd: "#f0dcae" },
    { n: 3, label: "просрочено", col: "#c0392b", bg: "#fbeae7", bd: "#f1c9c2" },
];

const planRows = [
    { name: "Политика управления рисками", col: "#c0392b", days: "−4 дн" },
    { name: "Регламент кассовых операций", col: "#b3730a", days: "12 дн" },
    { name: "Порядок работы с залогами", col: "#1c7a4d", days: "58 дн" },
];

const activity = [
    { icon: "check" as const, col: "#1c7a4d", bg: "#e2f4ea", text: "Б. Токтосунова подписала протокол утверждения ВНД-084", time: "12 мин назад" },
    { icon: "x" as const, col: "#c0392b", bg: "#fbe7e4", text: "ТИД-2026-011 прерван: нарушен срок доработки Инициатором", time: "52 мин назад" },
    { icon: "check" as const, col: "#2f68f5", bg: "#e9f0ff", text: "Согласование заявки на закупку PRC-2026-047 завершено", time: "1 ч назад" },
    { icon: "vnd" as const, col: "#7a5ce0", bg: "#efeafe", text: "ВНД-062 переведён в статус «Консолидация»", time: "2 ч назад" },
];

// Сколько задач показывать в сводке на главной
const HOME_TASKS_LIMIT = 4;

export function HomePage() {
    const { user, loading } = useAuth();
    const roleDept = user?.orgUnit?.titleRu ?? ""; // СП
    const rolePosition = user?.position?.name // Должность

    // Реальные задачи по всем скоупам (как на странице "Мои задачи"), объединённые в одну сводку
    const coordination = useVndTasks("coordination");
    const actualization = useVndTasks("actualization");
    const consolidation = useVndTasks("consolidation");

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
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            {/* Заголовок */}
            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <div className="text-[12.5px] font-medium text-[#8b97ab]">{formattedDate}</div>
                    <h1 className="mt-[5px] text-[25px] font-bold tracking-[-0.02em]">{greeting}</h1>
                    <div className="mt-[9px] flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-[7px] rounded-lg bg-[var(--app-soft,_#e9f0ff)] px-[11px] py-[5px] text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)]">
                            <Icon name="user" width={14} height={14} />
                            {rolePosition}
                        </span>
                        <span className="text-[12.5px] text-[#8b97ab]">{roleDept}</span>
                    </div>
                </div>
                <button className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[var(--app-accent,_#2f68f5)] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_var(--app-accent,_#2f68f5)] hover:brightness-[1.06]">
                    <Icon name="plus" width={18} height={18} strokeWidth={2} />
                    Создать документ
                </button>
            </div>

            {/* KPI */}
            <div className="mb-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => (
                    <button
                        key={k.label}
                        className="relative overflow-hidden rounded-[14px] border p-4 pb-[17px] text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(15,27,45,.34)]"
                        style={{ background: k.tint, borderColor: k.bd }}
                    >
                        <span className="absolute inset-y-0 left-0 w-1" style={{ background: k.col }} />
                        <div className="flex items-center justify-between">
                            <span className="min-h-8 text-[12px] font-medium leading-[1.35] text-[#5b6675]">{k.label}</span>
                            <Icon name="chevr" width={15} height={15} className="ml-2 flex-none text-[#c3ccd8]" />
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2.5">
                            <span
                                className="text-[31px] font-bold tracking-[-0.02em]"
                                style={{ color: k.col, fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                                {k.value}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-[18px]">
                {/* Мои задачи */}
                <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                    <div className="flex items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-[15px] font-semibold">Мои задачи</h2>
                            <span
                                className="rounded-full bg-[var(--app-soft,_#e9f0ff)] px-2 py-[2px] text-[11.5px] font-bold text-[var(--app-accent,_#2f68f5)]"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                                {tasksTotalCount}
                            </span>
                        </div>
                        <button className="text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline">
                            Все задачи
                        </button>
                    </div>
                    <div>
                        {tasksLoading ? (
                            <Loader label="Загрузка задач…" fullHeight={false} />
                        ) : homeTasks.length === 0 ? (
                            <div className="px-[18px] py-6 text-center text-[13px] text-[#8b97ab]">
                                Нет активных задач
                            </div>
                        ) : (
                            homeTasks.map((task) => (
                                <VndTaskCard key={task.vndId} task={task} />
                            ))
                        )}
                    </div>
                </div>

                {/* Правая колонка */}
                <div className="flex flex-col gap-[18px]">
                    {/* План актуализации ВНД */}
                    <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                        <div className="flex items-center justify-between border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                            <h2 className="text-[15px] font-semibold">План актуализации ВНД</h2>
                            <button className="text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)]">→</button>
                        </div>
                        <div className="flex gap-[9px] px-[18px] pb-1.5 pt-[15px]">
                            {ryg.map((r) => (
                                <div
                                    key={r.label}
                                    className="flex-1 rounded-[11px] border px-1.5 py-[11px] text-center"
                                    style={{ borderColor: r.bd, background: r.bg }}
                                >
                                    <div
                                        className="text-[24px] font-bold leading-none"
                                        style={{ color: r.col, fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {r.n}
                                    </div>
                                    <div className="mt-[5px] text-[10.5px] font-semibold" style={{ color: r.col }}>
                                        {r.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-[18px] pb-[15px] pt-1.5">
                            {planRows.map((p) => (
                                <div key={p.name} className="flex items-center gap-2.5 border-t border-[#f3f6f9] py-2">
                                    <span className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: p.col }} />
                                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#26324a]">{p.name}</span>
                                    <span className="flex-none text-[11.5px] font-semibold" style={{ color: p.col }}>{p.days}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Последняя активность */}
                    <div className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white">
                        <div className="border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                            <h2 className="text-[15px] font-semibold">Последняя активность</h2>
                        </div>
                        <div className="px-[18px] pb-[14px] pt-1.5">
                            {activity.map((a, i) => (
                                <div key={i} className="flex gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0">
                                    <span
                                        className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px]"
                                        style={{ background: a.bg, color: a.col }}
                                    >
                                        <Icon name={a.icon} width={14} height={14} />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[12.5px] leading-[1.4] text-[#26324a]">{a.text}</div>
                                        <div className="mt-0.5 text-[11px] text-[#8b97ab]">{a.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}