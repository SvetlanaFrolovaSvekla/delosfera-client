import {useVndSearch} from "@/hooks/vndHooks/useVndSearch.ts";

// canCreateVnd — есть ли у пользователя право создавать ВНД (CreateVndWithApproval /
// CreateVndWithoutApproval). Без него вкладка "Черновики" не показывается, и таб "Все"
// не должен учитывать черновики в счётчике (их и так не видно в списке).
export function useVndScopeCounts(canCreateVnd: boolean = false) {
    const {data: allForCounts} = useVndSearch({}, 500);

    return {
        // "Все" = действующие + на актуализации/согласовании/консолидации + архивированные,
        // и черновики — только если пользователю вообще доступна вкладка "Черновики"
        all: allForCounts.filter((r) => canCreateVnd || r.status !== "draft").length,
        // "Действующие" = у документа есть хотя бы одна актуальная редакция — это и сама
        // "active", и документы, где сейчас идёт актуализация/согласование/консолидация
        active: allForCounts.filter((r) =>
            r.status === "active" || r.status === "onact" || r.status === "review" || r.status === "consol"
        ).length,
        arch: allForCounts.filter((r) => r.status === "arch").length,
        draft: allForCounts.filter((r) => r.status === "draft").length,
    };
}