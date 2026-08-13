import {AlertOctagon, AlertTriangle, CheckCircle2, Clock} from "lucide-react";
import {useTranslation} from "react-i18next";
import type {ActualizationBucketKey} from "@/service/vndService/vndServiceType.ts";

type ActualizationBucketMetaItem = {
    label: string;
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
};

export const ACTUALIZATION_BUCKET_STYLE: Record<ActualizationBucketKey, {
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
}> = {
    normal: {color: "#1c7a4d", bg: "#e2f4ea", icon: CheckCircle2},
    approaching: {color: "#2957c3", bg: "#e7eefc", icon: Clock},
    critical: {color: "#b3730a", bg: "#fdf3d9", icon: AlertTriangle},
    overdue: {color: "#c0392b", bg: "#fdecea", icon: AlertOctagon},
};

export const ACTUALIZATION_BUCKET_ORDER: ActualizationBucketKey[] = [
    "normal", "approaching", "critical", "overdue",
];

/**
 * Локализованные лейблы бакетов актуализации.
 * Используется как хук, т.к. текст должен реагировать на смену языка.
 */
export function useActualizationBucketMeta(): Record<ActualizationBucketKey, ActualizationBucketMetaItem> {
    const {t} = useTranslation();

    return {
        normal: {...ACTUALIZATION_BUCKET_STYLE.normal, label: t("vnd.actualizationBuckets.normal")},
        approaching: {...ACTUALIZATION_BUCKET_STYLE.approaching, label: t("vnd.actualizationBuckets.approaching")},
        critical: {...ACTUALIZATION_BUCKET_STYLE.critical, label: t("vnd.actualizationBuckets.critical")},
        overdue: {...ACTUALIZATION_BUCKET_STYLE.overdue, label: t("vnd.actualizationBuckets.overdue")},
    };
}

/*
На беке:
    Normal = 0,       // > 30 дней до срока
    Approaching = 1,  // от 6 до 30 дней
    Critical = 2,     // от 0 до 5 дней
    Overdue = 3        // срок уже прошёл
*/