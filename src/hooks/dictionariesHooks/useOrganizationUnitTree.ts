// Дерево структурных подразделений
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {useHierarchicalDictTree} from "@/hooks/dictionariesHooks/useHierarchicalDictTree";

export function useOrganizationUnitTree() {
    const {orgUnits: items, loading, error, refetch} = useDictionaries();

    return useHierarchicalDictTree<OrganizationUnitResponse, Parameters<typeof organizationUnitService.create>[0]>({
        items,
        loading,
        error,
        refetch,
        service: organizationUnitService,
        buildPayload: (values, parentId) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            parentId,
        }),
        i18n: {
            maxDepthReasonKey: "dictionaries.maxDepthReason",
            saveErrorKey: "dictionaries.saveError",
            deleteErrorKey: "dictionaries.deleteError",
        },
    });
}