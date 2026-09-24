import {useEffect, useRef, useState} from "react";
import {
    DEFAULT_FINAL_HOLD_MINUTES,
    DEFAULT_PRIMARY_MINUTES,
    DEFAULT_REPEAT_MINUTES,
    MAX_DEADLINE_MINUTES,
} from "@/constants/coordinationParams.ts";
import {vndApprovalNormSettingsService} from "@/service/vndApprovalNormSettingsService/vndApprovalNormSettingsService.ts";

export function useApprovalNorms() {
    // Стартовые значения - из справочника "Нормативы согласования по умолчанию" (раздел ВНД).
    // Пока справочник грузится (или если запрос упал) - встроенные значения по умолчанию.
    const [primaryMinutes, setPrimaryMinutes] = useState<number | "">(DEFAULT_PRIMARY_MINUTES);
    const [repeatMinutes, setRepeatMinutes] = useState<number | "">(DEFAULT_REPEAT_MINUTES);
    const [finalHoldMinutes, setFinalHoldMinutes] = useState<number | "">(DEFAULT_FINAL_HOLD_MINUTES);

    // Если инициатор успел поправить норматив до ответа справочника - не затираем его ввод.
    const touchedRef = useRef(false);
    const touch = <T,>(setter: (v: T) => void) => (v: T) => {
        touchedRef.current = true;
        setter(v);
    };

    useEffect(() => {
        let cancelled = false;
        vndApprovalNormSettingsService.get()
            .then((s) => {
                if (cancelled || touchedRef.current) return;
                setPrimaryMinutes(s.primaryDeadlineMinutes);
                setRepeatMinutes(s.repeatDeadlineMinutes);
                setFinalHoldMinutes(s.finalHoldDeadlineMinutes);
            })
            .catch(() => {
                // Не критично: остаёмся на встроенных значениях, инициатор может их поправить
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Диапазон дублирует ограничение полей ввода в NormBlock (0 < значение <= MAX_DEADLINE_MINUTES) -
    // на случай, если значение попадёт в стейт в обход инпута.
    const inRange = (value: number | "") => Number(value) > 0 && Number(value) <= MAX_DEADLINE_MINUTES;
    const normsValid = inRange(primaryMinutes) && inRange(repeatMinutes) && inRange(finalHoldMinutes);

    return {
        primaryMinutes,
        setPrimaryMinutes: touch(setPrimaryMinutes),
        repeatMinutes,
        setRepeatMinutes: touch(setRepeatMinutes),
        finalHoldMinutes,
        setFinalHoldMinutes: touch(setFinalHoldMinutes),
        normsValid,
    };
}

export type UseApprovalNormsReturn = ReturnType<typeof useApprovalNorms>;
