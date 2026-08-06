import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {typeVndService} from "@/service/dictionariesService/typeVndService/typeVndService.ts";
import {useFlatDictList} from "@/hooks/dictionariesHooks/useFlatDictList.ts";
import type {
    TypeVndResponse,
    CreateTypeVndRequest,
} from "@/service/dictionariesService/typeVndService/typeVndServiceType.ts";

export function useTypeVndList() {
    const {types: items, loading, error, refetch} = useDictionaries();

    return useFlatDictList<TypeVndResponse, CreateTypeVndRequest>({
        items, loading, error, refetch,
        service: typeVndService,
        buildPayload: (values) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
        }),
        i18n: {
            deleteErrorKey: "typeVndPage.deleteError",
        },
    });
}