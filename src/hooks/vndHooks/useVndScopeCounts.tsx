import {useVndSearch} from "@/hooks/vndHooks/useVndSearch.ts";

// canCreateVnd — есть ли у пользователя право создавать ВНД (CreateVndWithApproval /
// CreateVndWithoutApproval). Без него вкладка "Черновики" не показывается, и таб "Все"
// не должен учитывать черновики в счётчике (их и так не видно в списке).
//
// Счётчики считаются по тому, что реально вернул сервер (useVndSearch({}, 500) без фильтров по
// scope/статусу) — а сервер для пользователей без ViewVndRegistryExtended уже полностью исключает
// документы со "Статусом ВНД" notYetActive из выдачи (см. VndService.SearchAsync), так что
// notYetActive-счётчик для них естественным образом обнулится сам, без доп. проверки права здесь.
export function useVndScopeCounts(canCreateVnd: boolean = false) {
    const {data: allForCounts} = useVndSearch({}, 500);

    return {
        // "Все" = действующие + ещё не действующие + архивированные, и черновики — только если
        // пользователю вообще доступна вкладка "Черновики". "Действующие" здесь не вычитаем
        // "ещё не действующие" — таб "Все" остаётся буквальным объединением остальных табов.
        all: allForCounts.filter((r) => canCreateVnd || r.status !== "draft").length,
        // "Действующие" = documentStatus точно "active" (не архив, не черновик, и не
        // "ещё не действующий" — для того теперь свой отдельный таб, см. notYetActive ниже).
        // Раньше здесь было `documentStatus !== "arch"` (т.е. включало notYetActive) — из-за
        // нового таба это would дублировало бы документы между "Действующие" и "Ещё не
        // действующие"; см. VndResponse.documentStatus/ComputeDocumentStatus.
        active: allForCounts.filter((r) => r.status !== "draft" && r.documentStatus === "active").length,
        // Новый таб — виден только при ViewVndRegistryExtended (см. BaseVndPage), но счётчик
        // считаем безусловно: для обычных пользователей документов с этим documentStatus в
        // allForCounts не будет вовсе (сервер их не отдаёт), так что здесь всегда получится 0.
        notYetActive: allForCounts.filter((r) => r.status !== "draft" && r.documentStatus === "notYetActive").length,
        arch: allForCounts.filter((r) => r.status === "arch").length,
        draft: allForCounts.filter((r) => r.status === "draft").length,
    };
}