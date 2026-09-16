// Виджет "Мои задачи"
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {ListChecks} from "lucide-react";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import type {InboxTask} from "@/service/workflowService/taskInboxService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {VndTaskCard} from "@/components/componentsTasks/VndTaskCard.tsx";
import {SzTaskCard} from "@/components/componentsTasks/SzTaskCard.tsx";
import {HOME_TOP_ROW_HEIGHT} from "@/constants/homeConst.ts";

interface MyTasksCardProps {
    tasks: VndTaskResponse[];
    // Задачи по служебным запискам из сводного реестра — живут вне контура ВНД,
    // поэтому передаются отдельно и рисуются своей карточкой.
    szTasks?: InboxTask[];
    // Задачи по закупкам — тоже из сводного реестра, вне контура ВНД.
    prcTasks?: InboxTask[];
    // Листы ознакомления — тоже из сводного реестра, своей карточки-контура у них нет
    // (см. TaskInboxService.GetAsync: DocumentType = "Acknowledgement").
    ackTasks?: InboxTask[];
    isLoading: boolean;
    // Настоящее (неусечённое) число задач по контурам — переданный tasks уже обрезан общим
    // лимитом "последних задач" на главной (см. HOME_TASKS_LIMIT в HomePage.tsx), поэтому
    // tasks.length не годится для бейджа с количеством: считает HomePage.tsx по всем скоупам
    // ВНД сразу, без обрезки.
    counts?: {vnd: number; sz: number; prc: number; ack: number};
}

const VISIBLE_TASKS_LIMIT = 15;

// Табы панели (как на "Последняя активность"): все / ВНД / служебные записки / закупки /
// ознакомление. labelKey - ключ i18n (см. tasks.myTasks.tabs.* в translation.json),
// а не готовый текст: иначе табы оставались русскими при переключении языка интерфейса.
const SECTIONS: { id: string; labelKey: string }[] = [
    {id: "all", labelKey: "tasks.myTasks.tabs.all"},
    {id: "vnd", labelKey: "tasks.myTasks.tabs.vnd"},
    {id: "sz", labelKey: "tasks.myTasks.tabs.sz"},
    {id: "prc", labelKey: "tasks.myTasks.tabs.procurement"},
    {id: "ack", labelKey: "tasks.myTasks.tabs.acknowledgement"},
];

export function MyTasksCard({tasks, szTasks = [], prcTasks = [], ackTasks = [], isLoading, counts}: MyTasksCardProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [section, setSection] = useState<string>("all");

    // Число в кружке рядом с заголовком — меняется вместе с активным табом: "Все" показывает
    // сумму по всем контурам, остальные табы — только свой контур. Контуры ВНД считаются
    // отдельно от counts (полный, неусечённый список), а не по vndTasks/tasks ниже — тем
    // приходится резать по VISIBLE_TASKS_LIMIT для самого списка карточек.
    const sectionCount = counts
        ? section === "all"
            ? counts.vnd + counts.sz + counts.prc + counts.ack
            : section === "vnd"
                ? counts.vnd
                : section === "sz"
                    ? counts.sz
                    : section === "prc"
                        ? counts.prc
                        : counts.ack
        : null;

    const vndTasks = section === "all" || section === "vnd" ? tasks : [];
    const visibleSzSource = section === "all" || section === "sz" ? szTasks : [];
    const visiblePrcSource = section === "all" || section === "prc" ? prcTasks : [];
    const visibleAckSource = section === "all" || section === "ack" ? ackTasks : [];

    const visibleTasks = vndTasks.slice(0, VISIBLE_TASKS_LIMIT);
    // ВНД занимают первые VISIBLE_TASKS_LIMIT мест; записками добираем остаток, закупками —
    // то, что осталось после записок, ознакомлением — то, что осталось после закупок, чтобы
    // виджет не разрастался сверх лимита.
    const visibleSzTasks = visibleSzSource.slice(0, Math.max(0, VISIBLE_TASKS_LIMIT - visibleTasks.length));
    const visiblePrcTasks = visiblePrcSource.slice(
        0,
        Math.max(0, VISIBLE_TASKS_LIMIT - visibleTasks.length - visibleSzTasks.length),
    );
    const visibleAckTasks = visibleAckSource.slice(
        0,
        Math.max(0, VISIBLE_TASKS_LIMIT - visibleTasks.length - visibleSzTasks.length - visiblePrcTasks.length),
    );
    const hasMoreTasks = vndTasks.length + visibleSzSource.length + visiblePrcSource.length
        + visibleAckSource.length > VISIBLE_TASKS_LIMIT;
    const isEmpty = vndTasks.length === 0 && visibleSzSource.length === 0 && visiblePrcSource.length === 0
        && visibleAckSource.length === 0;

    return (
        // Высота карточки зафиксирована (HOME_TOP_ROW_HEIGHT) и совпадает с "План актуализации
        // ВНД" рядом (см. ActualizationPlanCard.tsx) - обе теперь одной и той же высоты, а не
        // "примерно одинаковой" (см. items-start в HomePage.tsx). Header - flex-none, список
        // ниже сам занимает оставшееся место и скроллится (см. flex-1 min-h-0 overflow-y-auto
        // ниже вместо прежнего фиксированного style={{maxHeight}}).
        <div
            className="flex flex-col overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white"
            style={{height: HOME_TOP_ROW_HEIGHT}}
        >
            <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-[18px] py-4 pb-[13px]">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-[15px] font-semibold">{t("tasks.myTasks.title")}</h2>
                    {/* Кружок с числом задач - значение меняется вместе с активным табом ниже
                        (см. sectionCount): "Все" - сумма по всем контурам, иначе - только свой. */}
                    {sectionCount !== null && (
                        <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-[#eef3ff] px-1.5 text-[11px] font-semibold text-[#2f68f5]">
                            {sectionCount}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex flex-wrap gap-1.5">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSection(s.id)}
                                className="cursor-pointer rounded-full px-2.5 py-[3px] text-[11px] font-semibold transition-colors"
                                style={{
                                    border: `1px solid ${section === s.id ? "#2f68f5" : "#e5e9f0"}`,
                                    background: section === s.id ? "#eef3ff" : "#fff",
                                    color: section === s.id ? "#2f68f5" : "#55617a",
                                }}
                            >
                                {t(s.labelKey)}
                            </button>
                        ))}
                    </div>
                    <button
                        className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                        onClick={() => navigate("/tasks")}
                    >
                        {/* Все задачи */}
                        {t("tasks.myTasks.allTasks")}
                    </button>
                </div>
            </div>
            {/* Список сам занимает оставшееся место в карточке фиксированной высоты
                (HOME_TOP_ROW_HEIGHT) и скроллится, если не помещается — см. комментарий у
                style={{height}} карточки выше. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading ? (
                    // Загрузка задач…
                    <Loader label={t("tasks.myTasks.loading")} fullHeight={false}/>
                ) : isEmpty ? (
                    <EmptyState
                        embedded
                        icon={ListChecks}
                        title={t("tasks.myTasks.empty")}
                        description={t("tasks.myTasks.emptyDescription")}
                    />
                ) : (
                    <>
                        {/* square - без скруглённых углов: строки идут впритык друг к другу без
                            отступа, скруглённые углы каждой смотрелись неаккуратно на стыках.
                            noTopBorder - явно только у самой первой строки списка (по индексу,
                            а не через CSS :first-child - тут первой может оказаться карточка
                            любого из трёх типов ниже, в зависимости от того, что вообще есть):
                            иначе её собственный верхний бордер шёл сразу под нижним бордером
                            заголовка панели и линия казалась двойной. */}
                        {visibleTasks.map((task, i) => (
                            <VndTaskCard key={`vnd-${task.vndId}`} task={task} square noTopBorder={i === 0}/>
                        ))}
                        {visibleSzTasks.map((task, i) => (
                            <SzTaskCard
                                key={`sz-${task.taskId}`}
                                task={task}
                                noTopBorder={visibleTasks.length === 0 && i === 0}
                            />
                        ))}
                        {visiblePrcTasks.map((task, i) => (
                            <SzTaskCard
                                key={`prc-${task.taskId}`}
                                task={task}
                                noTopBorder={visibleTasks.length === 0 && visibleSzTasks.length === 0 && i === 0}
                            />
                        ))}
                        {visibleAckTasks.map((task, i) => (
                            <SzTaskCard
                                key={`ack-${task.taskId}`}
                                task={task}
                                noTopBorder={
                                    visibleTasks.length === 0 && visibleSzTasks.length === 0
                                    && visiblePrcTasks.length === 0 && i === 0
                                }
                            />
                        ))}
                        {hasMoreTasks && (
                            <div className="border-t border-[#eef2f7] px-[18px] py-3 text-center">
                                <button
                                    className="cursor-pointer text-[12.5px] font-semibold text-[var(--app-accent,_#2f68f5)] hover:underline"
                                    onClick={() => navigate("/tasks")}
                                >
                                    {/* Смотреть больше задач */}
                                    {t("tasks.myTasks.showMore")}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}