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
import type {ComponentType} from "react";

// Статус последней редакции (детальный, требует право ViewVndRegistryExtended):
// консолидация / актуальная / на актуализации / на согласовании / черновик / в архиве
export const STATUS_META: Record<
    VndStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "Актуальная", color: "#1c7a4d", bg: "#e2f4ea", icon: Check},
    onact: {label: "На актуализации", color: "#b3730a", bg: "#fbeecf", icon: Clock},
    review: {label: "На согласовании", color: "#2f68f5", bg: "#e9f0ff", icon: Clock},
    consol: {label: "Консолидация", color: "#7a5ce0", bg: "#efeafe", icon: Layers},
    arch: {label: "В архиве", color: "#c0392b", bg: "#fdecea", icon: Archive},
    draft: {label: "Черновик", color: "#5b6472", bg: "#eef0f3", icon: FileEdit}
};

// "Ожидание вступления в силу" — вычисляемый статус, НЕ хранится в БД отдельным значением
// VndStatus и не заводится как новый VndStatusKey (см. обсуждение): документ уже прошёл
// консолидацию (status === "active"), но указанная при консолидации "Дата вступления в силу"
// ещё не наступила (см. ConsolidateVndModal/VndActualizationService.PublishAsync). Как только
// дата наступает, следующий же запрос сам перестаёт считать документ "ожидающим" — фоновые
// задачи/миграции статуса не нужны.
export function isVndPendingEffective(status: VndStatusKey, effectiveDate: string | null | undefined): boolean {
    if (status !== "active" || !effectiveDate) return false;
    return effectiveDate.slice(0, 10) > todayIso();
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export const PENDING_EFFECTIVE_META: { label: string; color: string; bg: string; icon: typeof Check } = {
    label: "Ожидание вступления в силу",
    color: "#c2410c",
    bg: "#ffedd5",
    icon: CalendarClock,
};

// Мета для отображения статуса "последней редакции" с учётом "Ожидания вступления в силу" —
// использовать вместо прямого STATUS_META[status] везде, где статус показывается пользователю
// (колонка реестра, статус-баннер и т.п.). Сам STATUS_META/VndStatusKey не трогаем, чтобы не
// задевать фильтры/вкладки/поиск, которые опираются на реальный статус документа в БД.
export function getVndDisplayMeta(status: VndStatusKey, effectiveDate: string | null | undefined) {
    return isVndPendingEffective(status, effectiveDate) ? PENDING_EFFECTIVE_META : STATUS_META[status];
}

// УСТАРЕЛО: SimpleVndStatusKey/getSimplifiedVndStatus/SIMPLE_STATUS_META — старая, неполная
// свёртка статуса для пользователей без права ViewVndRegistryExtended (не различала
// "ещё не действующий" ВНД от полноценно действующего). Заменено на "Статус ВНД"
// (документ-уровня) ниже — DOCUMENT_STATUS_META/DocumentStatusKey, приходящий готовым полем
// с бэка (VndResponse.documentStatus, см. VndService.ComputeDocumentStatus), а не
// пересчитываемый на фронте по эвристике. Оставлено как есть (не удалено) — используется
// только для значка "Черновик" в VndTable, т.к. "Статус ВНД" концептуально не описывает
// черновики (это отдельная ось видимости, завязанная на право создавать ВНД, а не на
// ViewVndRegistryExtended).
export type SimpleVndStatusKey = "active" | "arch" | "draft";

export function getSimplifiedVndStatus(status: VndStatusKey): SimpleVndStatusKey {
    if (status === "arch") return "arch";
    if (status === "draft") return "draft";
    return "active"; // active/onact/review/consol — все действующие
}

export const SIMPLE_STATUS_META: Record<
    SimpleVndStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "Действующий", color: STATUS_META.active.color, bg: STATUS_META.active.bg, icon: Check},
    arch: {label: STATUS_META.arch.label, color: STATUS_META.arch.color, bg: STATUS_META.arch.bg, icon: Archive},
    draft: {label: STATUS_META.draft.label, color: STATUS_META.draft.color, bg: STATUS_META.draft.bg, icon: FileEdit},
};

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
export const DOCUMENT_STATUS_META: Record<
    DocumentStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "Действующий", color: STATUS_META.active.color, bg: STATUS_META.active.bg, icon: Check},
    notYetActive: {label: "Ещё не действующий", color: "#b3730a", bg: "#fbeecf", icon: Clock},
    arch: {label: STATUS_META.arch.label, color: STATUS_META.arch.color, bg: STATUS_META.arch.bg, icon: Archive},
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

export const SCOPE_COUNT_LABELS: Record<VndScope, { total: string; found: string }> = {
    all: {
        total: "Всего ВНД",
        found: "Найдено ВНД",
    },
    active: {
        total: "Всего действующих ВНД",
        found: "Найдено действующих ВНД",
    },
    notYetActive: {
        total: "Всего ещё не действующих ВНД",
        found: "Найдено ещё не действующих ВНД",
    },
    draft: {
        total: "Всего черновиков",
        found: "Найдено черновиков",
    },
    arch: {
        total: "Всего архивированных ВНД",
        found: "Найдено архивированных ВНД",
    },
};


interface TaskStatusMeta {
    label: string;
    color: string;
    bg: string;
    icon: ComponentType<{ size?: number; className?: string }>;
}

// Цвета фаз согласования
export const COORDINATION_STAGE_META: Record<"primary" | "repeat" | "final", TaskStatusMeta> = {
    primary: {
        label: "Первичное согласование",
        color: "#2f68f5",
        bg: "#e9f0ff",
        icon: Clock,
    },
    repeat: {
        label: "Согласование после внесённых изменений",
        color: "#1d4fd1",
        bg: "#cfe0ff",
        icon: Clock,
    },
    final: {
        label: "Финальная выдержка",
        color: "#123a9e",
        bg: "#b3ccff",
        icon: FileCheck,
    },
};

// Цвета разделов задач - совпадают с названиями вложенных вкладок на странице "Мои задачи"
// (см. TasksVndPage), чтобы бейдж на карточке однозначно указывал, в какой раздел вести.
export const TASK_SCOPE_META: Record<"coordination" | "actualization" | "consolidation" | "myVndApproval", TaskStatusMeta> = {
    coordination: {
        label: "Ждущие моего согласования",
        color: "#2f68f5",
        bg: "#e9f0ff",
        icon: Clock,
    },
    actualization: {
        label: "На актуализации",
        color: "#b3730a",
        bg: "#fbeecf",
        icon: Clock,
    },
    consolidation: {
        label: "Консолидация",
        color: "#7a5ce0",
        bg: "#efeafe",
        icon: Layers,
    },
    myVndApproval: {
        label: "Мои ВНД на согласовании",
        color: "#2f68f5",
        bg: "#e9f0ff",
        icon: Clock,
    },
};


// Цвета/иконки срочности дедлайна согласования
export const DEADLINE_URGENCY_META = {
    normal: { label: "В пределах срока", color: "#1c7a4d", bg: "#e2f4ea", icon: CheckCircle2 },
    approaching: { label: "Срок приближается", color: "#2957c3", bg: "#e7eefc", icon: Clock },
    critical: { label: "Критичный срок", color: "#b3730a", bg: "#fdf3d9", icon: AlertTriangle },
    overdue: { label: "Просрочено", color: "#c0392b", bg: "#fdecea", icon: AlertOctagon },
} as const;

export type DeadlineUrgencyKey = keyof typeof DEADLINE_URGENCY_META;
