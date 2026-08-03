import type {VndScope, VndStatusKey} from "@/service/mockData/BaseVndData.tsx";
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

export const STATUS_META: Record<
    VndStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "Действующий", color: "#1c7a4d", bg: "#e2f4ea", icon: Check},
    onact: {label: "На актуализации", color: "#b3730a", bg: "#fbeecf", icon: Clock},
    review: {label: "На согласовании", color: "#2f68f5", bg: "#e9f0ff", icon: Clock},
    consol: {label: "Консолидация", color: "#7a5ce0", bg: "#efeafe", icon: Layers},
    arch: {label: "В архиве", color: "#c0392b", bg: "#fdecea", icon: Archive},
    draft: {label: "Черновик", color: "#5b6472", bg: "#eef0f3", icon: FileEdit}
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

// Цвета разделов задач - те же, что и статусы ВНД (review/onact/consol)
export const TASK_SCOPE_META: Record<"coordination" | "actualization" | "consolidation", TaskStatusMeta> = {
    coordination: {
        label: "На согласовании",
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
};


// Цвета/иконки срочности дедлайна согласования
export const DEADLINE_URGENCY_META = {
    normal: { label: "В пределах срока", color: "#1c7a4d", bg: "#e2f4ea", icon: CheckCircle2 },
    approaching: { label: "Срок приближается", color: "#2957c3", bg: "#e7eefc", icon: Clock },
    critical: { label: "Критичный срок", color: "#b3730a", bg: "#fdf3d9", icon: AlertTriangle },
    overdue: { label: "Просрочено", color: "#c0392b", bg: "#fdecea", icon: AlertOctagon },
} as const;

export type DeadlineUrgencyKey = keyof typeof DEADLINE_URGENCY_META;
