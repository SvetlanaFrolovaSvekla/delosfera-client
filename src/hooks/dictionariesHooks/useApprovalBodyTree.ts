// TODO: Использую контекст для обновления всех справочников. Можно добавить
//  отдельный refetchOrgans() вместо общего refetch() ПОДУМАТЬ КАК ЛУЧШЕ
// Дерево органов утверждения
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {approvalBodyService} from "@/service/dictionariesService/approvalBodyService/approvalBodyService.ts";
import type {
    ApprovalBodyResponse,
    CreateApprovalBodyRequest
} from "@/service/dictionariesService/approvalBodyService/approvalBodyServiceType.ts";
import {useHierarchicalDictTree} from "@/hooks/dictionariesHooks/useHierarchicalDictTree";

export function useApprovalBodyTree() {
    const {organs: items, loading, error, refetch} = useDictionaries();

    return useHierarchicalDictTree<ApprovalBodyResponse, CreateApprovalBodyRequest>({
        items, loading, error, refetch,
        service: approvalBodyService,
        buildPayload: (values, parentId) => ({
            titleRu: values.titleRu,
            titleEn: values.titleEn || undefined,
            titleKg: values.titleKg || undefined,
            parentId,
        }),
    });
}