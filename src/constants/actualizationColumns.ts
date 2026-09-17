// Колонки таблицы для страницы "Планирование актуализации".
// Обязательные (fixed) колонки идут первыми и не скрываются через меню "Колонки",
// остальные - те же доп. колонки, что и в базе ВНД, переключаемые.
import type {ColDef} from "@/constants/columnsFilters/vndColumns.ts";

const EXTRA_TOGGLEABLE_COLUMNS: ColDef[] = [
    {key: "type", labelKey: "actualizationColumns.type", width: "160px"},
    {key: "developer", labelKey: "actualizationColumns.developer", width: "200px"},
    {key: "organ", labelKey: "actualizationColumns.organ", width: "180px"},
    {key: "responsibleExecutors", labelKey: "actualizationColumns.responsibleExecutors", width: "220px"},
    {key: "adoptionDate", labelKey: "actualizationColumns.adoptionDate", width: "140px"},
    {key: "adoptionCode", labelKey: "actualizationColumns.adoptionCode", width: "140px"},
    {key: "effectiveDate", labelKey: "actualizationColumns.effectiveDate", width: "160px"},
    {key: "requisitesChangedDate", labelKey: "actualizationColumns.requisitesChangedDate", width: "160px"},
    {key: "revisionChangedDate", labelKey: "actualizationColumns.revisionChangedDate", width: "160px"},
    {key: "keywords", labelKey: "actualizationColumns.keywords", width: "200px"},
    {key: "rubric", labelKey: "actualizationColumns.rubric", width: "170px"},
    {key: "secrecyLevel", labelKey: "actualizationColumns.secrecyLevel", width: "170px"},
    {key: "userGroups", labelKey: "actualizationColumns.userGroups", width: "200px"},
];

export const ACTUALIZATION_COLUMNS: ColDef[] = [
    {key: "code", labelKey: "actualizationColumns.code", width: "65px", fixed: true},
    {key: "name", labelKey: "actualizationColumns.name", width: "minmax(200px,1fr)", fixed: true},
    {key: "status", labelKey: "actualizationColumns.status", width: "190px", fixed: true},
    {key: "dueActualizationDate", labelKey: "actualizationColumns.dueActualizationDate", width: "170px", fixed: true},
    {key: "lastActualizationDate", labelKey: "actualizationColumns.lastActualizationDate", width: "180px", fixed: true},
    {key: "lastActualizationStatus", labelKey: "actualizationColumns.lastActualizationStatus", width: "180px", fixed: true},
    {key: "actualizationBucket", labelKey: "actualizationColumns.actualizationBucket", width: "150px", fixed: true},
    ...EXTRA_TOGGLEABLE_COLUMNS,
];

export function getToggleableActualizationColumns(): ColDef[] {
    return ACTUALIZATION_COLUMNS.filter((c) => !c.fixed);
}