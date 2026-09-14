import type {MouseEvent} from "react";
import {Link} from "react-router-dom";
import {CheckCircle2} from "lucide-react";
import type {VndTaskResponse} from "@/service/tasksVndService/tasksServiceTypes.ts";
import {COORDINATION_STAGE_META, REVISION_NEEDED_META, TASK_SCOPE_META} from "@/constants/vndStatus.ts";
import {getActionTitle, getDeadlineTone, getMetaText} from "@/utils/tasksUtils.ts";
import {timeAgo} from "@/utils/dateUtils.ts";
import {Icon} from "@/components/icons/Icon.tsx";
import {HighlightText} from "@/utils/HighlightText.tsx";


interface VndTaskCardProps {
    task: VndTaskResponse;
    /** Запрос поиска на странице "Мои задачи" — подсвечивает совпадения тем же
     *  компонентом, что и поиск в шапке (см. HeaderSearchResults). */
    searchQuery?: string;
    /** Без скруглённых углов - для плотного списка виджета "Мои задачи" на главной
     * (см. MyTasksCard), где строки идут впритык друг к другу без отступа: скруглённые
     * углы каждой строки там смотрелись неаккуратно (то круглый, то прямой стык между
     * соседними строками). На отдельной странице "Мои задачи" (VndTaskList, карточки с
     * отступом между собой) обычные скруглённые углы остаются как есть. */
    square?: boolean;
    /** Явно убрать верхний бордер (первая строка в списке — под ней уже есть нижний бордер
     * заголовка панели, поэтому свой верхний тут лишний и даёт двойную линию). Задаётся
     * родителем по индексу строки, а не через CSS :first-child — так строка остаётся без
     * верхнего бордера, даже если она не первый DOM-child (например, первая среди
     * нескольких разных типов карточек в одном списке, см. MyTasksCard). */
    noTopBorder?: boolean;
}

const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
        e.preventDefault();
    }
};

// Скоупы, у которых карточка ведёт на таб "Ход согласования" открытого ВНД —
// в остальных случаях (актуализация/консолидация) правильный таб определяет сама страница ВНД.
const APPROVAL_TAB_SCOPES: VndTaskResponse["scope"][] = ["coordination", "myVndApproval"];

// "Заявки на доступ к актуализации" и "Заявка одобрена" ведут прямо на вкладку "Актуализация" —
// без явного tab документ мог бы открыться на вкладке по умолчанию ("Редакции"), где ни решить
// заявку, ни подтвердить начало цикла нельзя (те же действия, что и в уведомлении, см.
// VndActualizationService.NotifyAsync urlOverride: `/base-vnd/{vndId}?tab=actual`).
const ACTUAL_TAB_SCOPES: VndTaskResponse["scope"][] = ["actualizationRequest", "actualizationApproved"];

export function VndTaskCard({task, searchQuery = "", square = false, noTopBorder = false}: VndTaskCardProps) {
    // Основной бейдж = раздел/вкладка "Мои задачи", в которую ведёт карточка
    // ("Ждущие моего согласования" / "Мои ВНД на согласовании" / "Актуализация" / "Консолидация")
    const scopeMeta = TASK_SCOPE_META[task.scope];
    const ScopeIcon = scopeMeta.icon;

    // Отдельный бейдж = текущий этап согласования (первичное/повторное/финальная выдержка) —
    // заполняется и для coordination, и для myVndApproval. На доработке (isRevisionNeeded)
    // этапа нет (см. MapProcessPhase на бэке) - вместо него отдельный бейдж "ВНД на доработке".
    const stageMeta = task.isRevisionNeeded
        ? REVISION_NEEDED_META
        : task.stagePhase
            ? COORDINATION_STAGE_META[task.stagePhase as keyof typeof COORDINATION_STAGE_META]
            : null;

    const hasStagePhase = task.scope === "coordination" || task.scope === "myVndApproval";
    const due = hasStagePhase
        ? getDeadlineTone(task.deadlineAt, task.deadlineMinutes)
        : getDeadlineTone(task.dueActualizationDate, null);

    return (
        <Link
            to={`/base-vnd/${task.vndId}`}
            state={
                APPROVAL_TAB_SCOPES.includes(task.scope)
                    ? {tab: "approval"}
                    : ACTUAL_TAB_SCOPES.includes(task.scope)
                        ? {tab: "actual"}
                        : undefined
            }
            draggable={false}
            onClick={handleClick}
            className={
                // square - тонкий разделитель сверху (как в "Последняя активность"/"Последние
                // уведомления"), а не полная рамка по всем 4 сторонам: раньше между соседними
                // строками выходила двойная (удвоенной толщины) линия на стыке - нижняя рамка
                // одной строки плюс верхняя рамка следующей.
                `cursor-pointer flex w-full items-center gap-[13px] bg-white px-[18px] py-[13px] text-left
                 transition-colors hover:bg-[#f8fafc] select-text [-webkit-user-drag:none] ${
                    square
                        ? `border-t border-[#f3f6f9] ${noTopBorder ? "border-t-0" : ""}`
                        : "rounded-[14px] border border-[#e9edf3]"
                }`
            }
        >
            <span
                className="grid h-9 w-9 flex-none place-items-center rounded-[10px]"
                style={{background: scopeMeta.bg, color: scopeMeta.color}}
            >
                <ScopeIcon size={18}/>
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span
                        className="text-[11.5px] font-semibold text-[var(--app-accent,_#2f68f5)]"
                        style={{fontFamily: "'IBM Plex Mono', monospace"}}
                    >
                        ВНД-<HighlightText text={task.vndCode} query={searchQuery}/>
                    </span>
                    <span
                        className="rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                        style={{background: scopeMeta.bg, color: scopeMeta.color}}
                    >
                        {scopeMeta.label}
                    </span>
                    {/* Текущий этап согласования — отдельно от раздела выше. На доработке
                        (isRevisionNeeded) - отдельная иконка (FileEdit), чтобы бейдж не
                        сливался по виду с обычными фазами согласования (там иконки в бейдже
                        нет намеренно - это самостоятельное состояние, а не очередная фаза). */}
                    {stageMeta && (
                        <span
                            className="flex items-center gap-1 rounded-full px-[9px] py-[2px] text-[11px] font-semibold"
                            style={{background: stageMeta.bg, color: stageMeta.color}}
                        >
                            {task.isRevisionNeeded && <stageMeta.icon size={11}/>}
                            {stageMeta.label}
                        </span>
                    )}
                    {task.actualizationPlannedNoChanges && (
                        <span className="rounded-full bg-[#fdf6e8] px-[9px] py-[2px] text-[11px] font-semibold text-[#9a6408]">
                            Без изменений
                        </span>
                    )}
                    {/* Пока шаг "Выполнить актуализацию" не пройден - ни "без изменений", ни сдвиг
                        срока ещё не решены, карточка ведёт на этот шаг, а не на загрузку/согласование */}
                    {task.scope === "actualization" && !task.actualizationPerformed && (
                        <span className="rounded-full bg-[#ececfc] px-[9px] py-[2px] text-[11px] font-semibold text-[#4e57d6]">
                            Требуется выполнить актуализацию
                        </span>
                    )}
                </span>

                {/* Название ВНД — отдельной строкой, чтобы быть видимым независимо от скоупа */}
                <span className="mt-[3px] block truncate text-[13.5px] font-semibold text-[#1c2740]">
                    «<HighlightText text={task.vndTitle} query={searchQuery}/>»
                </span>

                {/* Суть задачи */}
                <span className="mt-0.5 block truncate text-[12.5px] font-medium text-[#3a4560]">
                    {getActionTitle(task)}
                </span>

                {/* Здесь же встречается редакция/инициатор/отклонивший — тоже участвуют
                    в поиске (см. matchesTaskSearch), поэтому подсвечиваем строку целиком. */}
                <span className="mt-0.5 block truncate text-[11.5px] text-[#8b97ab]">
                    <HighlightText text={getMetaText(task)} query={searchQuery}/>
                </span>

                {/* Комментарий инициатора по предыдущему кругу — контекст, зачем документ снова здесь.
                    Для "rejected" в этом же месте — причина отклонения от согласующего. */}
                {(task.initiatorComment || task.rejectionComment) && (
                    <span className="mt-0.5 block truncate text-[11.5px] italic text-[#a3adbd]">
                        «{task.initiatorComment ?? task.rejectionComment}»
                    </span>
                )}
            </span>

            {/* Выполненные карточки (вкладка "Выполненные") показывают, когда задача была
                закрыта, а не обратный отсчёт до дедлайна — его для них уже нет смысла считать.
                Если дедлайна вообще нет (due.label === "—" из getDeadlineTone), значок часов
                с тире не показываем совсем - пустое место лучше, чем "часы + прочерк" без
                какой-либо полезной информации. */}
            {task.isCompleted ? (
                <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold text-[#1c7a4d]">
                    <CheckCircle2 size={14}/>
                    {task.completedAt ? timeAgo(task.completedAt) : "Выполнено"}
                </span>
            ) : due.label !== "—" ? (
                <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-semibold"
                      style={{color: due.color}}>
                    <Icon name="clock" width={14} height={14}/>
                    {due.label}
                </span>
            ) : null}

            <Icon name="chevr" width={17} height={17} className="flex-none text-[#c3ccd8]"/>
        </Link>
    );
}
