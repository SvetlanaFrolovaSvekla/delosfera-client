import type {VndStatusKey} from "@/service/mockData/BaseVndData.tsx";
import {Archive, Check, Clock, Layers} from "lucide-react";

export const STATUS_META: Record<
    VndStatusKey,
    { label: string; color: string; bg: string; icon: typeof Check }
> = {
    active: {label: "Действующий", color: "#1c7a4d", bg: "#e2f4ea", icon: Check},
    onact: {label: "На актуализации", color: "#b3730a", bg: "#fbeecf", icon: Clock},
    review: {label: "На согласовании", color: "#2f68f5", bg: "#e9f0ff", icon: Clock},
    consol: {label: "Консолидация", color: "#7a5ce0", bg: "#efeafe", icon: Layers},
    arch: {label: "В архиве", color: "#c0392b", bg: "#fdecea", icon: Archive},
};
