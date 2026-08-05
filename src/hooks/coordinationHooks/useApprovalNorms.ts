import {useState} from "react";

export function useApprovalNorms() {
    const [primaryMinutes, setPrimaryMinutes] = useState<number | "">(72 * 60);
    const [repeatMinutes, setRepeatMinutes] = useState<number | "">(48 * 60);
    const [finalHoldMinutes, setFinalHoldMinutes] = useState<number | "">(24 * 60);

    const normsValid = Number(primaryMinutes) > 0 && Number(repeatMinutes) > 0 && Number(finalHoldMinutes) > 0;

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