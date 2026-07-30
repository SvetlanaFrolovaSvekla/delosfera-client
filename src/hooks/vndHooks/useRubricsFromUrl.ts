import {useState} from "react";
import {useSearchParams} from "react-router-dom";

export function useRubricsFromUrl(setRubricFilters: (v: string[]) => void, setAdvOpen: (v: boolean) => void) {
    const [searchParams] = useSearchParams();
    const [lastRubricsParam, setLastRubricsParam] = useState<string | null>(null);
    const rubricsParam = searchParams.get("rubrics");

    if (rubricsParam !== lastRubricsParam) {
        setLastRubricsParam(rubricsParam);
        if (rubricsParam) {
            setRubricFilters(rubricsParam.split(",").filter(Boolean));
            setAdvOpen(true);
        }
    }
}