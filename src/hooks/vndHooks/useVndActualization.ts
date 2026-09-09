// src/hooks/vndHooks/useVndActualization.ts
import {useMemo, useState} from "react";
import {formatDDMMYYYY, formatISO, parseDDMMYYYY} from "@/utils/dateUtils.ts";
import {
    ACTUALIZATION_MODE_OPTIONS,
    addMonths,
    type ActualizationMode,
    describeManualPeriod,
    describeNextCycleInterval,
    PERIOD_MONTHS,
    PERIOD_TO_BACKEND,
} from "@/utils/vndActualizationUtils.ts";

export function useVndActualization() {
    const today = useMemo(() => new Date(), []);
    const todayISO = useMemo(() => formatISO(today), [today]);

    const [actualizationMode, setActualizationMode] = useState<ActualizationMode>("year");
    const [manualDueDate, setManualDueDate] = useState(""); // дд.мм.гггг - только в режиме "Ввод даты"

    // ISO-версия введённой вручную даты (или "" если ещё не введена / некорректна) - то, что уйдёт на бэк
    const manualDueDateISO = useMemo(() => {
        const parsed = parseDDMMYYYY(manualDueDate);
        return parsed ? formatISO(parsed) : "";
    }, [manualDueDate]);

    // Если выбран пресет - дата считается от сегодня и не редактируется вручную.
    // Если выбран "Ввод даты" - используется то, что ввёл пользователь.
    const computedDueDate =
        actualizationMode === "date"
            ? manualDueDateISO
            : formatISO(addMonths(today, PERIOD_MONTHS[actualizationMode]));

    // То же самое, но в формате дд.мм.гггг - для отображения в DatePickerInput
    const computedDueDateDisplay =
        actualizationMode === "date"
            ? manualDueDate
            : formatDDMMYYYY(addMonths(today, PERIOD_MONTHS[actualizationMode]));

    const periodicityLabel =
        actualizationMode === "date"
            ? describeManualPeriod(manualDueDateISO, todayISO)
            : ACTUALIZATION_MODE_OPTIONS.find((o) => o.key === actualizationMode)?.label.toLowerCase() ?? "";

    const isDateModeValid = actualizationMode !== "date" || manualDueDateISO !== "";

    // Интервал до следующего цикла для подсказки под датой ("... далее через год/полгода ...").
    const nextCycleInterval = describeNextCycleInterval(actualizationMode, manualDueDateISO, todayISO);

    return {
        actualizationMode, setActualizationMode,
        manualDueDate, setManualDueDate,
        computedDueDate,
        computedDueDateDisplay,
        periodicityLabel,
        nextCycleInterval,
        isDateModeValid,
        backendPeriod: PERIOD_TO_BACKEND[actualizationMode],
        dueActualizationDateForBackend: actualizationMode === "date" ? computedDueDate : null,
    };
}