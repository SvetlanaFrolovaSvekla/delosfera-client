import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {positionService} from "@/service/dictionariesService/positionService/positionService.ts";
import {useFlatDictList} from "@/hooks/dictionariesHooks/useFlatDictList.ts";
import type {
    PositionResponse,
    CreatePositionRequest,
} from "@/service/dictionariesService/positionService/positionServiceType.ts";

export function usePositionList() {
    const {positions: items, loading, error, refetch} = useDictionaries();

    return useFlatDictList<PositionResponse, CreatePositionRequest>({
        items, loading, error, refetch,
        service: positionService,
        buildPayload: (values) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
        }),
    });
}