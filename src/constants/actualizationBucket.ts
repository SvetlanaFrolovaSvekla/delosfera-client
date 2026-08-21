import {AlertOctagon, AlertTriangle, CheckCircle2, Clock} from "lucide-react";
import type {ActualizationBucketKey} from "@/service/vndService/vndServiceType.ts";

export const ACTUALIZATION_BUCKET_META: Record<ActualizationBucketKey, {
    label: string;
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
}> = {
    normal: {label: "В норме", color: "#1c7a4d", bg: "#e2f4ea", icon: CheckCircle2},
    approaching: {label: "Приближается срок", color: "#2957c3", bg: "#e7eefc", icon: Clock},
    critical: {label: "Критичный срок", color: "#b3730a", bg: "#fdf3d9", icon: AlertTriangle},
    overdue: {label: "Просрочено", color: "#c0392b", bg: "#fdecea", icon: AlertOctagon},
};


/*
На беке:
    Normal = 0,       // > 30 дней до срока
    Approaching = 1,  // от 6 до 30 дней
    Critical = 2,     // от 0 до 5 дней
    Overdue = 3        // срок уже прошёл
*/
