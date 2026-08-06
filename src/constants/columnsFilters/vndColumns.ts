// Формирование колонок таблицы, возможных колонок для отображения в зависимости
// от выбранного Tab (VndScope -
// действующие, на актуализации, на согласовании, на консолидации, архивирован, черновик)
import type {VndScope} from "@/constants/vndTabs.ts";

export type ColKey =
    | "statusIcon"
    | "code"
    | "name"
    | "type"
    | "developer"
    | "organ"
    | "rubric"
    | "act"
    | "cancelInfo"
    | "daysInArchive"
    | "status"
    | "archivedDate"
    | "responsibleExecutors"
    | "adoptionDate"
    | "adoptionCode"
    | "effectiveDate"
    | "requisitesChangedDate"
    | "revisionChangedDate"
    | "cancelDate"
    | "cancelCode"
    | "dueActualizationDate"
    | "lastActualizationDate"
    | "lastActualizationStatus"
    | "keywords"
    | "secrecyLevel"
    | "userGroups"
    | "actualizationBucket"; // статус срока актуализации (normal/approaching/critical/overdue) - для страницы планирования актуализации

export interface ColDef {
    key: ColKey;
    label: string;
    width: string;
    fixed?: boolean; // нельзя будет скрыть через меню "Колонки" (код, наименование)
}

// --- Дополнительные колонки, общие для обоих scope
const EXTRA_COLUMNS: ColDef[] = [
    {key: "responsibleExecutors", label: "Ответственные исполнители", width: "220px"},
    {key: "adoptionDate", label: "Дата принятия", width: "140px"},
    {key: "adoptionCode", label: "№ принятия", width: "140px"},
    {key: "effectiveDate", label: "Дата вступления в силу", width: "160px"},
    {key: "requisitesChangedDate", label: "Изменение реквизитов", width: "160px"},
    {key: "revisionChangedDate", label: "Изменение редакции", width: "160px"},
    {key: "dueActualizationDate", label: "Срок актуализации", width: "150px"},
    {key: "lastActualizationDate", label: "Дата посл. актуализации", width: "170px"},
    {key: "lastActualizationStatus", label: "Статус посл. актуализации", width: "180px"},
    {key: "keywords", label: "Ключевые слова", width: "200px"},
    {key: "rubric", label: "Рубрика", width: "170px"},
    {key: "secrecyLevel", label: "Уровень секретности", width: "170px"},
    {key: "userGroups", label: "Группы доступа", width: "200px"},
];

// Колонки для действующих
export const ACTIVE_COLUMNS: ColDef[] = [
    {key: "statusIcon", label: "", width: "44px", fixed: true},
    {key: "code", label: "Код", width: "88px", fixed: true},
    {key: "name", label: "Наименование", width: "minmax(220px,1fr)", fixed: true},
    {key: "type", label: "Вид", width: "160px"},
    {key: "developer", label: "Разработчик", width: "200px"},
    {key: "organ", label: "Орган утв.", width: "180px"},
    {key: "act", label: "Актуализация", width: "156px"},
    {key: "status", label: "Статус", width: "134px"},
    {key: "cancelDate", label: "Дата отмены", width: "140px"},
    {key: "cancelCode", label: "№ отмены", width: "140px"},
    {key: "archivedDate", label: "Дата архивации", width: "140px"}, // переключаемая на "Все"/"Действующие"
    ...EXTRA_COLUMNS,
];

// Колонки для архивированных
export const ARCHIVE_COLUMNS: ColDef[] = [
    {key: "statusIcon", label: "", width: "44px", fixed: true},
    {key: "code", label: "Код", width: "88px", fixed: true},
    {key: "name", label: "Наименование", width: "minmax(220px,1fr)", fixed: true},
    {key: "type", label: "Вид", width: "160px"},
    {key: "developer", label: "Разработчик", width: "200px"},
    {key: "organ", label: "Орган утв.", width: "180px"},
    {key: "cancelDate", label: "Дата отмены", width: "140px", fixed: true},
    {key: "cancelCode", label: "№ отмены", width: "140px", fixed: true},
    {key: "archivedDate", label: "Дата архивации", width: "140px", fixed: true}, // спец. обязательна на "Архивированные"
    {key: "daysInArchive", label: "В архиве", width: "110px", fixed: true}, // спец.
    {key: "status", label: "Статус", width: "134px"},
    ...EXTRA_COLUMNS,
];

// Колонки, которые никогда не должны показываться на табе "Действующие"
const HIDDEN_ON_ACTIVE: ColKey[] = ["cancelDate", "cancelCode", "archivedDate"];

// Колонки, которые никогда не должны показываться на табе "Архивированные"
const HIDDEN_ON_ARCH: ColKey[] = [
    "dueActualizationDate",
    "lastActualizationDate",
    "lastActualizationStatus",
    "cancelInfo",
];

// Возвращает итоговый список возможных колонок для таблицы в зависимости от Tab
export function getColumnsForScope(scope: VndScope): ColDef[] {
    const base = scope === "arch" ? ARCHIVE_COLUMNS : ACTIVE_COLUMNS;

    if (scope === "active") {
        return base.filter((c) => !HIDDEN_ON_ACTIVE.includes(c.key));
    }
    if (scope === "arch") {
        return base.filter((c) => !HIDDEN_ON_ARCH.includes(c.key));
    }
    return base;
}

// Возвращает список колонок, которые пользователь может скрывать/отображать через выпадающий список
export function getToggleableColumns(scope: VndScope): ColDef[] {
    return getColumnsForScope(scope).filter((c) => !c.fixed);
}