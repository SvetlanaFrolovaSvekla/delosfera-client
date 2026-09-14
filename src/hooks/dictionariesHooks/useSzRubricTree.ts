// Дерево рубрик СЗ (аналог useRubricTree.ts для Рубрикатора ВНД)
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {szRubricService} from "@/service/dictionariesService/szRubricService/szRubricService.ts";
import {useHierarchicalDictTree} from "@/hooks/dictionariesHooks/useHierarchicalDictTree.ts";
import type {
    SzRubricResponse,
    CreateSzRubricRequest,
} from "@/service/dictionariesService/szRubricService/szRubricServiceType.ts";

export function useSzRubricTree() {
    const {szRubrics: items, loading, error, refetch} = useDictionaries();

    return useHierarchicalDictTree<SzRubricResponse, CreateSzRubricRequest>({
        items,
        loading,
        error,
        refetch,
        service: szRubricService,
        buildPayload: (values, parentId) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            parentId,
        }),
    });
}
