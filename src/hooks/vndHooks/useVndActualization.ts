import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {formatDDMMYYYY, formatISO, parseDDMMYYYY} from "@/utils/dateUtils.ts";
import {
    addMonths,
    type ActualizationMode,
    describeManualPeriod,
    describeNextCycleInterval,
    PERIOD_MONTHS,
    PERIOD_TO_BACKEND,
} from "@/utils/vndProcess/vndActualizationUtils.ts";

export function useVndActualization() {
    const {t} = useTranslation();
    const today = useMemo(() => new Date(), []);
    const todayISO = useMemo(() => formatISO(today), [today]);

    const [actualizationMode, setActualizationMode] = useState<ActualizationMode>("biennial");
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
            // укажите дату / дата должна быть в будущем / 1 раз в год / 1 раз в два года / N дн. / ≈ N мес.
            ? describeManualPeriod(t, manualDueDateISO, todayISO)
            // 1 раз в год / 1 раз в два года / ввод даты - берём напрямую из переводов режимов
            : t(`createVnd.actualizationCard.modes.${actualizationMode}`).toLowerCase();

    const isDateModeValid = actualizationMode !== "date" || manualDueDateISO !== "";

    // Интервал до следующего цикла для подсказки под датой ("... далее через год/два года ...").
    const nextCycleInterval = describeNextCycleInterval(t, actualizationMode, manualDueDateISO, todayISO);

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