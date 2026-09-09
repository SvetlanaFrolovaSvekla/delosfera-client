import type {ApprovalStageKindResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndStatusKey} from "@/constants/vndTabs.ts";

export type TaskScope = "coordination" | "actualization" | "consolidation" | "myVndApproval" | "rejected";
export type TaskStagePhase = "primary" | "repeat" | "final";

export interface VndTaskCountsResponse {
    /// "Ждущие моего согласования" — первичное + повторное согласование + финальная выдержка
    coordination: number;
    actualization: number;
    consolidation: number;
    myVndApproval: number;
    /// Редакции, отклонённые при согласовании и ожидающие правок инициатора
    rejected: number;
}

export interface VndTaskResponse {
    vndId: number;
    vndCode: string;
    vndTitle: string;
    scope: TaskScope;

    /// Человекочитаемый статус процесса — заполняется для myVndApproval и consolidation
    statusLabel?: string | null;

    /// Текущий статус самого ВНД (действующий/на согласовании/черновик и т.д.)
    vndStatus?: VndStatusKey | null;

    redactionId: number | null;
    redactionCode: string | null;
    stageId: number | null;
    /// Текущий этап согласования — заполняется для coordination (какой этап ждёт решения)
    /// и для myVndApproval (на каком круге сейчас редакция инициатора). Используется для
    /// фильтра "Этап согласования" и бейджа на карточке.
    stagePhase: TaskStagePhase | null;
    /// Профиль этапа согласования (юр. управление, риск-менеджмент и т.д.) — только для
    /// coordination
    stageKind?: ApprovalStageKindResponse | null;
    /// Название этапа согласования для отображения — только для coordination
    stageTitle?: string | null;
    deadlineAt: string | null;

    initiatorName: string | null;
    deadlineMinutes: number | null;
    /// Комментарий инициатора к повторному кругу/финальной выдержке
    initiatorComment?: string | null;

    dueActualizationDate: string | null;
    /// Заявлено ли для текущего цикла актуализации "без изменений"
    actualizationPlannedNoChanges: boolean;
    /// Пройден ли шаг "Выполнить актуализацию" (только для actualization/consolidation) — пока
    /// false, карточка actualization должна вести на экран "Выполнить актуализацию"
    actualizationPerformed: boolean;

    // --- Только для rejected ---
    /// ФИО согласующего, который отклонил редакцию
    rejectedByName?: string | null;
    /// Комментарий (причина), с которым редакция была отклонена
    rejectionComment?: string | null;

    createdAt: string;

    // --- Только для карточек из истории "Выполнено" (см. tasksService.getDoneByScope) ---
    /// true для задач из вкладки "Выполнено" — на карточке вместо обратного отсчёта до
    /// дедлайна показывается дата завершения (completedAt).
    isCompleted?: boolean;
    /// Когда задача перешла в разряд выполненных — заполнено только при isCompleted === true.
    completedAt?: string | null;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
