import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {keywordService} from "@/service/dictionariesService/keywordService/keywordService.ts";
import {useHierarchicalDictTree} from "@/hooks/dictionariesHooks/useHierarchicalDictTree.ts";
import type {
    KeywordResponse,
    CreateKeywordRequest,
} from "@/service/dictionariesService/keywordService/keywordServiceType.ts";

export function useKeywordTree() {
    const {keywords: items, loading, error, refetch} = useDictionaries();

    return useHierarchicalDictTree<KeywordResponse, CreateKeywordRequest>({
        items,
        loading,
        error,
        refetch,
        service: keywordService,
        buildPayload: (values, parentId) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            parentId,
        }),
    });
}