import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {securityLevelService} from "@/service/dictionariesService/securityLevelService/securityLevelService.ts";
import {useFlatDictList} from "@/hooks/dictionariesHooks/useFlatDictList.ts";
import type {
    SecurityLevelResponse,
    CreateSecurityLevelRequest,
} from "@/service/dictionariesService/securityLevelService/securityLevelServiceType.ts";

export function useSecurityLevelList() {
    const {secrecyLevels: items, loading, error, refetch} = useDictionaries();

    return useFlatDictList<SecurityLevelResponse, CreateSecurityLevelRequest>({
        items,
        loading,
        error,
        refetch,
        service: securityLevelService,
        buildPayload: (values) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
        }),
    });
}