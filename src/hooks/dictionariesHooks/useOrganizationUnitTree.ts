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
        // Форма справочника правит только название и родителя, а сервер при обновлении
        // записывает начальника и куратора из запроса как есть. Без них переименование
        // подразделения стирало начальника — и у филиала пропадал директор, а с ним этап
        // «Директор филиала» в маршруте заявок на замещение. Подставляем текущие значения.
        service: {
            create: (payload) => organizationUnitService.create(payload),
            update: (id, payload) => {
                const current = items.find((u) => u.id === id);
                return organizationUnitService.update(id, {
                    ...payload,
                    headUserId: current?.headUserId ?? null,
                    curatorUserId: current?.curatorUserId ?? null,
                });
            },
            delete: (id) => organizationUnitService.delete(id),
        },
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