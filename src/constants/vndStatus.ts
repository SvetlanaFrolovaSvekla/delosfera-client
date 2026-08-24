import type {VndScope, VndStatusKey} from "@/constants/vndTabs.ts";
import {
    AlertOctagon,
    AlertTriangle,
    Archive,
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

// Упрощённый статус ВНД (для значка первой колонки у пользователей без права
// ViewVndRegistryExtended): действующие/архивированные/черновики — без деталей о том,
// на каком этапе жизненного цикла находится действующий документ.
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

export const SCOPE_COUNT_LABELS: Record<VndScope, { total: string; found: string }> = {
    all: {
        total: "Всего ВНД",
        found: "Найдено ВНД",
    },
    active: {
        total: "Всего действующих ВНД",
        found: "Найдено действующих ВНД",
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
