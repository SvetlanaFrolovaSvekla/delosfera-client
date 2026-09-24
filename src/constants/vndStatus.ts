import type {ComponentType} from "react";
import type {VndScope, VndStatusKey} from "@/constants/vndTabs.ts";
import type {DocumentStatusKey} from "@/service/vndService/vndServiceType.ts";
import {
    AlertOctagon,
    AlertTriangle,
    Archive,
    CalendarClock,
    Check,
    CheckCircle2,
    Clock,
    FileCheck,
    FileEdit,
    Layers
} from "lucide-react";

// Статус последней редакции (детальный, требует право ViewVndRegistryExtended):
// консолидация / актуальная / на актуализации / на согласовании / черновик / в архиве.
// label — ключ i18n (namespace vnd.redactionStatusMeta), а не готовый текст: переводится на
// месте использования (BaseVndPage, VndTable, OpenVndPage, ActualizationTable), где уже есть
// доступ к useTranslation.
export const STATUS_META: Record<
    VndStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "vnd.redactionStatusMeta.active", color: "#1c7a4d", bg: "#e2f4ea", icon: Check},
    onact: {label: "vnd.redactionStatusMeta.onact", color: "#b3730a", bg: "#fbeecf", icon: Clock},
    review: {label: "vnd.redactionStatusMeta.review", color: "#2f68f5", bg: "#e9f0ff", icon: Clock},
    consol: {label: "vnd.redactionStatusMeta.consol", color: "#7a5ce0", bg: "#efeafe", icon: Layers},
    arch: {label: "vnd.redactionStatusMeta.arch", color: "#c0392b", bg: "#fdecea", icon: Archive},
    draft: {label: "vnd.redactionStatusMeta.draft", color: "#5b6472", bg: "#eef0f3", icon: FileEdit}
};

// "Ожидание вступления в силу" — вычисляемый статус, НЕ хранится в БД отдельным значением
export function isVndPendingEffective(status: VndStatusKey, effectiveDate: string | null | undefined): boolean {
    if (status !== "active" || !effectiveDate) return false;
    return effectiveDate.slice(0, 10) > todayIso();
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

// label — ключ i18n, см. комментарий у STATUS_META выше.
export const PENDING_EFFECTIVE_META: { label: string; color: string; bg: string; icon: typeof Check } = {
    label: "vnd.redactionStatusMeta.pendingEffective",
    color: "#c2410c",
    bg: "#ffedd5",
    icon: CalendarClock,
};

// Мета для отображения статуса "последней редакции" с учётом "Ожидания вступления в силу"
export function getVndDisplayMeta(status: VndStatusKey, effectiveDate: string | null | undefined) {
    return isVndPendingEffective(status, effectiveDate) ? PENDING_EFFECTIVE_META : STATUS_META[status];
}

// "Статус ВНД" (документ-уровня) — НЕ путать со STATUS_META выше ("Статус последней редакции
// ВНД"). Ровно 3 значения, приходят с бэка готовыми (VndResponse.documentStatus):
//   - active — действующий (сам Active, а также OnActualization/Review/Consolidation, если
//     документ уже когда-то был Active — например, повторный цикл актуализации);
//   - notYetActive — ещё не действующий: у документа была создана не более одной редакции за
//     всю историю, и он ни разу не был Active (Draft/Review/Consolidation/OnActualization на
//     самой первой редакции, ни разу не публиковавшейся);
//   - arch — архивированный.
// Пользователям без права ViewVndRegistryExtended сервер вообще не отдаёт документы со
// "Статусом ВНД" notYetActive в реестре (см. VndService.SearchAsync — безусловный фильтр
// видимости, а не сворачивание в "active", как было раньше): такие документы полностью
// исключены из всех вкладок/scope обычного пользователя, включая "Все"/"Действующие".
// CollapseDocumentStatus на бэке всё ещё используется, но только для прямого открытия
// документа по ссылке (GetById) — не для реестра. collapseDocumentStatus ниже — тот же
// защитный дубль для этого случая (идемпотентен, если данные уже свёрнуты/отфильтрованы).
//
// "Черновик" в реестре (VndTable) — отдельная, не связанная с ViewVndRegistryExtended ось
// видимости (завязана на право создавать ВНД, а не на ViewVndRegistryExtended), поэтому не
// входит в этот Record и проверяется в VndTable отдельно, до него, через STATUS_META.draft.
//
// label — ключ i18n (namespace vnd.documentStatusMeta), см. комментарий у STATUS_META выше.
export const DOCUMENT_STATUS_META: Record<
    DocumentStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "vnd.documentStatusMeta.active", color: STATUS_META.active.color, bg: STATUS_META.active.bg, icon: Check},
    notYetActive: {label: "vnd.documentStatusMeta.notYetActive", color: "#b3730a", bg: "#fbeecf", icon: Clock},
    arch: {label: "vnd.documentStatusMeta.arch", color: STATUS_META.arch.color, bg: STATUS_META.arch.bg, icon: Archive},
};

export function collapseDocumentStatus(status: DocumentStatusKey, canViewExtended: boolean): DocumentStatusKey {
    return !canViewExtended && status === "notYetActive" ? "active" : status;
}

// Набор значений фильтра "Статус последней редакции" по вкладкам: на "Действующих"/"Ещё не
// действующих" документ не может быть в архиве или черновиком, поэтому эти пункты там не
// показываем — иначе выбор был бы заведомо пустым. Вкладки, которых нет в этой карте ("Все"
// показывает все STATUS_META, "Архивированные"/"Черновики" фильтр вовсе не показывают — см.
// VndFilters), берут полный список.
export const STATUS_OPTIONS_BY_SCOPE: Partial<Record<VndScope, VndStatusKey[]>> = {
    active: ["active", "onact", "review", "consol"],
    notYetActive: ["onact", "review", "consol"],
    all: ["active", "onact", "review", "consol", "arch", "draft"],
};

// label — ключи i18n (namespace vnd.scopeCountLabels), см. комментарий у STATUS_META выше.
export const SCOPE_COUNT_LABELS: Record<VndScope, { total: string; found: string }> = {
    all: {
        total: "vnd.scopeCountLabels.all.total",
        found: "vnd.scopeCountLabels.all.found",
    },
    active: {
        total: "vnd.scopeCountLabels.active.total",
        found: "vnd.scopeCountLabels.active.found",
    },
    notYetActive: {
        total: "vnd.scopeCountLabels.notYetActive.total",
        found: "vnd.scopeCountLabels.notYetActive.found",
    },
    draft: {
        total: "vnd.scopeCountLabels.draft.total",
        found: "vnd.scopeCountLabels.draft.found",
    },
    arch: {
        total: "vnd.scopeCountLabels.arch.total",
        found: "vnd.scopeCountLabels.arch.found",
    },
    favorites: {
        total: "vnd.scopeCountLabels.favorites.total",
        found: "vnd.scopeCountLabels.favorites.found",
    },
};


interface TaskStatusMeta {
    label: string;
    color: string;
    bg: string;
    icon: ComponentType<{ size?: number; className?: string }>;
}

// Цвета фаз согласования.
// label — ключ i18n, а не готовый текст: переводится на месте использования (VndTaskCard,
// VndTasksPanel), где уже есть доступ к useTranslation. Те же ключи используют
// STAGE_PHASE_FILTER_OPTIONS в VndTasksPanel — оба места обязаны показывать один и тот же
// текст на всех трёх языках, дублировать литералы означало бы однажды поправить один и
// забыть другой.
export const COORDINATION_STAGE_META: Record<"primary" | "repeat" | "final", TaskStatusMeta> = {
    primary: {
        label: "tasks.vnd.stagePhase.primary",
        color: "#2f68f5",
        bg: "#e9f0ff",
        icon: Clock,
    },
    repeat: {
        label: "tasks.vnd.stagePhase.repeat",
        color: "#1d4fd1",
        bg: "#cfe0ff",
        icon: Clock,
    },
    final: {
        label: "tasks.vnd.stagePhase.final",
        color: "#123a9e",
        bg: "#b3ccff",
        icon: FileCheck,
    },
};

// Цвета разделов задач - совпадают с названиями вложенных вкладок на странице "Мои задачи"
// (см. VndTasksPanel), чтобы бейдж на карточке однозначно указывал, в какой раздел вести.
// label — ключ i18n (см. комментарий у COORDINATION_STAGE_META выше); те же ключи использует
// VndTasksPanel для подписей верхних/вложенных вкладок.
export const TASK_SCOPE_META: Record<
    "coordination" | "actualization" | "consolidation" | "myVndApproval" | "rejected"
    | "actualizationRequest" | "actualizationApproved",
    TaskStatusMeta
> = {
    coordination: {
        label: "tasks.vnd.scopes.coordination",
        color: "#2f68f5",
        bg: "#e9f0ff",
        icon: Clock,
    },
    actualization: {
        label: "tasks.vnd.scopes.actualization",
        color: "#b3730a",
        bg: "#fbeecf",
        icon: Clock,
    },
    consolidation: {
        label: "tasks.vnd.scopes.consolidation",
        color: "#7a5ce0",
        bg: "#efeafe",
        icon: Layers,
    },
    myVndApproval: {
        label: "tasks.vnd.scopes.myVndApproval",
        color: "#2f68f5",
        bg: "#e9f0ff",
        icon: Clock,
    },
    rejected: {
        label: "tasks.vnd.scopes.rejected",
        color: "#c0392b",
        bg: "#fdecea",
        icon: AlertOctagon,
    },
    actualizationRequest: {
        label: "tasks.vnd.scopes.actualizationRequest",
        color: "#4e57d6",
        bg: "#ececfc",
        icon: FileCheck,
    },
    actualizationApproved: {
        label: "tasks.vnd.scopes.actualizationApproved",
        color: "#1c7a4d",
        bg: "#e2f4ea",
        icon: CheckCircle2,
    },
};

// Бейдж "ВНД на доработке" (myVndApproval, процесс в статусе RevisionNeeded) - отдельный от
// COORDINATION_STAGE_META, т.к. у доработки нет фазы согласования (см. MapProcessPhase на
// бэке - для RevisionNeeded возвращает null). Цвет/иконка сознательно другие, чем у обычных
// фаз согласования (синие) - это состояние принципиально другое: мяч на стороне инициатора,
// а не согласующих, и раньше карточка выглядела так же, как обычное "в процессе согласования".
// label — ключ i18n, см. комментарий у COORDINATION_STAGE_META выше.
export const REVISION_NEEDED_META: TaskStatusMeta = {
    label: "tasks.vnd.revisionNeeded",
    color: "#b3730a",
    bg: "#fbeecf",
    icon: FileEdit,
};

// Срочность дедлайна согласования по проценту оставшегося времени от норматива (см.
// getDeadlineUrgency в dateUtils.ts). label — ключ i18n (namespace vnd.deadlineUrgencyMeta),
// а не готовый текст: переводится на месте использования (VndTaskCard через tasksUtils.ts),
// где уже есть доступ к useTranslation.
export const DEADLINE_URGENCY_META = {
    normal: {label: "vnd.deadlineUrgencyMeta.normal", color: "#1c7a4d", bg: "#e2f4ea", icon: CheckCircle2},
    approaching: {label: "vnd.deadlineUrgencyMeta.approaching", color: "#2957c3", bg: "#e7eefc", icon: Clock},
    critical: {label: "vnd.deadlineUrgencyMeta.critical", color: "#b3730a", bg: "#fdf3d9", icon: AlertTriangle},
    overdue: {label: "vnd.deadlineUrgencyMeta.overdue", color: "#c0392b", bg: "#fdecea", icon: AlertOctagon},
} as const;

export type DeadlineUrgencyKey = keyof typeof DEADLINE_URGENCY_META;
