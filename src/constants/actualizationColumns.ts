// Колонки таблицы для страницы "Планирование актуализации".
// Обязательные (fixed) колонки идут первыми и не скрываются через меню "Колонки",
// остальные - те же доп. колонки, что и в базе ВНД, переключаемые.
import type {ColDef} from "@/constants/vndColumns.ts";

const EXTRA_TOGGLEABLE_COLUMNS: ColDef[] = [
    {key: "type", label: "Вид", width: "160px"},
    {key: "developer", label: "Разработчик", width: "200px"},
    {key: "organ", label: "Орган утв.", width: "180px"},
    {key: "responsibleExecutors", label: "Ответственные исполнители", width: "220px"},
    {key: "adoptionDate", label: "Дата принятия", width: "140px"},
    {key: "adoptionCode", label: "№ принятия", width: "140px"},
    {key: "effectiveDate", label: "Дата вступления в силу", width: "160px"},
    {key: "requisitesChangedDate", label: "Изменение реквизитов", width: "160px"},
    {key: "revisionChangedDate", label: "Изменение редакции", width: "160px"},
    {key: "keywords", label: "Ключевые слова", width: "200px"},
    {key: "rubric", label: "Рубрика", width: "170px"},
    {key: "secrecyLevel", label: "Уровень секретности", width: "170px"},
    {key: "userGroups", label: "Группы доступа", width: "200px"},
];

export const ACTUALIZATION_COLUMNS: ColDef[] = [
    {key: "code", label: "Код", width: "65px", fixed: true},
    {key: "name", label: "Наименование", width: "minmax(200px,1fr)", fixed: true},
    {key: "status", label: "Статус ВНД", width: "134px", fixed: true},
    {key: "dueActualizationDate", label: "Срок актуализации", width: "170px", fixed: true},
    {key: "lastActualizationDate", label: "Последняя актуализация", width: "180px", fixed: true},
    {key: "lastActualizationStatus", label: "Статус посл. актуализации", width: "180px", fixed: true},
    {key: "actualizationBucket", label: "Статус срока", width: "150px", fixed: true},
    ...EXTRA_TOGGLEABLE_COLUMNS,
];

export function getToggleableActualizationColumns(): ColDef[] {
    return ACTUALIZATION_COLUMNS.filter((c) => !c.fixed);
}