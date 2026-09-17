import type {TFunction} from "i18next";
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

// label больше не хранится здесь — переводы лежат в createVnd.actualizationCard.modes.*
export const ACTUALIZATION_MODE_OPTIONS: { key: ActualizationMode }[] = [
    {key: "biennial"},
    {key: "year"},
    {key: "date"},
];

export function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

// Внутренний "тип" периода без привязки к языку — чтобы дальше по коду
// (и label, и слово "год"/"два года") не сравнивать переведённые строки,
// а сравнивать этот ключ.
type ManualPeriodKind =
    | {type: "empty"}
    | {type: "pastDate"}
    | {type: "year"}
    | {type: "biennial"}
    | {type: "days"; days: number}
    | {type: "months"; months: number};

// Разница между сегодня и датой в готовую периодичность (с допуском ±8%,
// чтобы "365 дней" и "370 дней" одинаково читались как "раз в год").
function getManualPeriodKind(manualDateISO: string, todayISO: string): ManualPeriodKind {
    if (!manualDateISO) return {type: "empty"};

    const from = new Date(todayISO);
    const to = new Date(manualDateISO);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) return {type: "pastDate"};

    const approxMonths = days / 30.44;
    const buckets: {type: "year" | "biennial"; months: number}[] = [
        {type: "year", months: 12},
        {type: "biennial", months: 24},
    ];
    const closest = buckets.find((b) => Math.abs(approxMonths - b.months) <= b.months * 0.08);
    if (closest) return {type: closest.type};

    return approxMonths < 1 ? {type: "days", days} : {type: "months", months: Math.round(approxMonths)};
}

export function describeManualPeriod(t: TFunction, manualDateISO: string, todayISO: string): string {
    const kind = getManualPeriodKind(manualDateISO, todayISO);
    switch (kind.type) {
        // укажите дату
        case "empty":
            return t("createVnd.actualizationCard.periodicityLabels.specifyDate");
        // дата должна быть в будущем
        case "pastDate":
            return t("createVnd.actualizationCard.periodicityLabels.dateMustBeFuture");
        // 1 раз в год
        case "year":
            return t("createVnd.actualizationCard.modes.year");
        // 1 раз в два года
        case "biennial":
            return t("createVnd.actualizationCard.modes.biennial");
        // "{{days}} дн."
        case "days":
            return t("createVnd.actualizationCard.periodicityLabels.daysCount", {days: kind.days});
        // "≈ {{months}} мес."
        case "months":
            return t("createVnd.actualizationCard.periodicityLabels.approxMonths", {months: kind.months});
    }
}

// Интервал до следующего цикла словом ("год"/"два года") — для подсказки под датой:
// "Срок первой актуализации будет до ..., далее через <интервал> ...". Для пресетов известен
// заранее, для "Ввод даты" определяется тем же способом, что и periodicityLabel: если введённая
// дата не попадает точно в одну из двух периодичностей — возвращается как есть (точный текст:
// "укажите дату", "≈ N мес." и т.п.), чтобы не соврать про год/два года там, где это не так.
export function describeNextCycleInterval(
    t: TFunction,
    mode: ActualizationMode,
    manualDateISO: string,
    todayISO: string
): string {
    // год
    if (mode === "year") return t("createVnd.actualizationCard.cycleWords.year");
    // два года
    if (mode === "biennial") return t("createVnd.actualizationCard.cycleWords.twoYears");

    const kind = getManualPeriodKind(manualDateISO, todayISO);
    if (kind.type === "year") return t("createVnd.actualizationCard.cycleWords.year");
    if (kind.type === "biennial") return t("createVnd.actualizationCard.cycleWords.twoYears");

    return describeManualPeriod(t, manualDateISO, todayISO);
}