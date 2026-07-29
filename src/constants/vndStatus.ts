import type {VndScope, VndStatusKey} from "@/service/mockData/BaseVndData.tsx";
import {Archive, Check, Clock, FileEdit, Layers} from "lucide-react";

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