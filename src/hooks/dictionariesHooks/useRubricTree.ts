// Дерево рубрик
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {rubricService} from "@/service/dictionariesService/rubricService/rubricService.ts";
import {useHierarchicalDictTree} from "@/hooks/dictionariesHooks/useHierarchicalDictTree.ts";
import type {
    RubricResponse,
    CreateRubricRequest,
} from "@/service/dictionariesService/rubricService/rubricServiceType.ts";

export function useRubricTree() {
    const {rubrics: items, loading, error, refetch} = useDictionaries();

    return useHierarchicalDictTree<RubricResponse, CreateRubricRequest>({
        items,
        loading,
        error,
        refetch,
        service: rubricService,
        buildPayload: (values, parentId) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            parentId,
        }),
    });
}