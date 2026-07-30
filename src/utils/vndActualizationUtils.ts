import type {ActualizationPeriod} from "@/service/vndService/vndServiceType.ts";

export type ActualizationMode = "halfYear" | "year" | "twoYears" | "threeYears" | "date";

export const PERIOD_MONTHS: Record<Exclude<ActualizationMode, "date">, number> = {
    halfYear: 6,
    year: 12,
    twoYears: 24,
    threeYears: 36,
};

// Соответствие UI-режима периода бэковому enum ActualizationPeriod
export const PERIOD_TO_BACKEND: Record<ActualizationMode, ActualizationPeriod> = {
    halfYear: "HalfYear",
    year: "Annual",
    twoYears: "Biennial",
    threeYears: "Triennial",
    date: "Custom",
};

export const ACTUALIZATION_MODE_OPTIONS: { key: ActualizationMode; label: string }[] = [
    {key: "halfYear", label: "Раз в полгода"},
    {key: "year", label: "Раз в год"},
    {key: "twoYears", label: "Раз в два года"},
    {key: "threeYears", label: "Раз в три года"},
    {key: "date", label: "Ввод даты"},
];

export function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

// Разница между сегодня и датой в готовую периодичность (с допуском ±8%,
// чтобы "365 дней" и "370 дней" одинаково читались как "раз в год").
export function describeManualPeriod(manualDateISO: string, todayISO: string): string {
    if (!manualDateISO) return "укажите дату";

    const from = new Date(todayISO);
    const to = new Date(manualDateISO);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) return "дата должна быть в будущем";

    const approxMonths = days / 30.44;
    const buckets = [
        {months: 6, label: "раз в полгода"},
        {months: 12, label: "раз в год"},
        {months: 24, label: "раз в два года"},
        {months: 36, label: "раз в три года"},
    ];
    const closest = buckets.find((b) => Math.abs(approxMonths - b.months) <= b.months * 0.08);
    if (closest) return closest.label;

    return approxMonths < 1 ? `${days} дн.` : `≈ ${Math.round(approxMonths)} мес.`;
}