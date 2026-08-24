import {useState} from "react";
import {MAX_DEADLINE_MINUTES} from "@/constants/coordinationParams.ts";

export function useApprovalNorms() {
    const [primaryMinutes, setPrimaryMinutes] = useState<number | "">(72 * 60);
    const [repeatMinutes, setRepeatMinutes] = useState<number | "">(48 * 60);
    const [finalHoldMinutes, setFinalHoldMinutes] = useState<number | "">(24 * 60);

    // Диапазон дублирует ограничение полей ввода в NormBlock (0 < значение <= MAX_DEADLINE_MINUTES) -
    // на случай, если значение попадёт в стейт в обход инпута.
    const inRange = (value: number | "") => Number(value) > 0 && Number(value) <= MAX_DEADLINE_MINUTES;
    const normsValid = inRange(primaryMinutes) && inRange(repeatMinutes) && inRange(finalHoldMinutes);

    return {
        primaryMinutes,
        setPrimaryMinutes,
        repeatMinutes,
        setRepeatMinutes,
        finalHoldMinutes,
        setFinalHoldMinutes,
        normsValid,
    };
}

export type UseApprovalNormsReturn = ReturnType<typeof useApprovalNorms>;