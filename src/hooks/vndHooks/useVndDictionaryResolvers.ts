import {useMemo} from "react";
import {useDictionaries} from "@/context/DictionariesContext.tsx";

export function useVndDictionaryResolvers() {
    const {orgUnits, keywords, rubrics, secrecyLevels, userGroups} = useDictionaries();

    return useMemo(() => {
        const orgUnitMap = new Map(orgUnits.map((o) => [o.id, o]));
        const keywordMap = new Map(keywords.map((k) => [k.id, k]));
        const rubricMap = new Map(rubrics.map((r) => [r.id, r]));
        const secrecyMap = new Map(secrecyLevels.map((s) => [s.id, s]));
        const userGroupMap = new Map(userGroups.map((g) => [g.id, g]));

        const orgUnitName = (id: number) => orgUnitMap.get(id)?.name ?? "—";

        return {
            keywordNames: (ids: number[]) =>
                ids.map((id) => keywordMap.get(id)?.name).filter(Boolean).join(", ") || "—",

            secrecyLevelName: (id?: number) =>
                id != null ? secrecyMap.get(id)?.name ?? "—" : "—",

            userGroupNames: (ids: number[]) =>
                ids.map((id) => userGroupMap.get(id)?.name).filter(Boolean).join(", ") || "—",

            responsibleExecutorNames: (ids: number[]) =>
                ids.map((id) => orgUnitName(id)).filter((n) => n !== "—").join(", ") || "—",

            rubricNames: (ids: number[]) =>
                ids.map((id) => rubricMap.get(id)?.name).filter(Boolean).join(", ") || "—",

            orgUnitName,
        };
    }, [orgUnits, keywords, rubrics, secrecyLevels, userGroups]);
}