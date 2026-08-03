import {useState} from "react";

export function useApprovalNorms() {
    const [primaryHours, setPrimaryHours] = useState<number | "">(72);
    const [repeatHours, setRepeatHours] = useState<number | "">(48);
    const [finalHoldHours, setFinalHoldHours] = useState<number | "">(24);

    const normsValid = Number(primaryHours) > 0 && Number(repeatHours) > 0 && Number(finalHoldHours) > 0;

    return {
        primaryHours,
        setPrimaryHours,
        repeatHours,
        setRepeatHours,
        finalHoldHours,
        setFinalHoldHours,
        normsValid,
    };
}

export type UseApprovalNormsReturn = ReturnType<typeof useApprovalNorms>;