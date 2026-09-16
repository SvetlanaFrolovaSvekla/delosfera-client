import type {ActualizationPeriod} from "@/service/vndService/vndServiceType.ts";

export type ActualizationMode = "year" | "biennial" | "date";

export const PERIOD_MONTHS: Record<Exclude<ActualizationMode, "date">, number> = {
    year: 12,
    biennial: 24,
};

// Соответствие UI-режима периода бэковому enum ActualizationPeriod
export const PERIOD_TO_BACKEND: Record<ActualizationMode, ActualizationPeriod> = {
    year: "Annual",
    biennial: "Biennial",
    date: "Custom",
};

export const ACTUALIZATION_MODE_OPTIONS: { key: ActualizationMode; label: string }[] = [
    {key: "year", label: "1 раз в год"},
    {key: "biennial", label: "1 раз в два года"},
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
        {months: 12, label: "1 раз в год"},
        {months: 24, label: "1 раз в два года"},
    ];
    const closest = buckets.find((b) => Math.abs(approxMonths - b.months) <= b.months * 0.08);
    if (closest) return closest.label;

    return approxMonths < 1 ? `${days} дн.` : `≈ ${Math.round(approxMonths)} мес.`;
}

// Интервал до следующего цикла словом ("год"/"два года") — для подсказки под датой:
// "Срок первой актуализации будет до ..., далее через <интервал> ...". Для пресетов известен
// заранее, для "Ввод даты" определяется тем же способом, что и periodicityLabel: если введённая
// дата не попадает точно в одну из двух периодичностей — возвращается как есть (точный текст:
// "укажите дату", "≈ N мес." и т.п.), чтобы не соврать про год/два года там, где это не так.
export function describeNextCycleInterval(
    mode: ActualizationMode,
    manualDateISO: string,
    todayISO: string
): string {
    if (mode === "year") return "год";
    if (mode === "biennial") return "два года";

    const label = describeManualPeriod(manualDateISO, todayISO);
    if (label === "1 раз в год") return "год";
    if (label === "1 раз в два года") return "два года";
    return label;
}
