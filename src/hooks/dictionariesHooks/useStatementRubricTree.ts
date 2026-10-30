// Дерево рубрик заявлений (аналог useSzRubricTree.ts для Рубрикатора СЗ)
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {statementRubricService} from "@/service/dictionariesService/statementRubricService/statementRubricService.ts";
import {useHierarchicalDictTree} from "@/hooks/dictionariesHooks/useHierarchicalDictTree.ts";
import type {
    StatementRubricResponse,
    CreateStatementRubricRequest,
} from "@/service/dictionariesService/statementRubricService/statementRubricServiceType.ts";

export function useStatementRubricTree() {
    const {statementRubrics: items, loading, error, refetch} = useDictionaries();

    return useHierarchicalDictTree<StatementRubricResponse, CreateStatementRubricRequest>({
        items,
        loading,
        error,
        refetch,
        service: statementRubricService,
        buildPayload: (values, parentId) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            parentId,
        }),
    });
}
