// Формирование колонок таблицы, возможных колонок для отображения в зависимости
// от выбранного Tab (VndScope -
// действующие, на актуализации, на согласовании, на консолидации, архивирован, черновик)
//
// Локализация: текстовые заголовки колонок вынесены в ключи перевода (labelKey).
// Сами тексты лежат в locales/ru/vndColumns.json и locales/en/vndColumns.json
// (неймспейс "vndColumns"). Перед рендером колонки нужно прогнать через
// translateColumns(), передав функцию t() используемой в проекте i18n-библиотеки:
//
//   const { t } = useTranslation("vndColumns"); // например, react-i18next
//   const columns = translateColumns(
//       getColumnsForScope(scope, canViewExtended, linkedToMeOnly),
//       t
//   );
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
    | "redactionCount" // серый кружок с общим кол-вом редакций (актуальных и нет) - только при праве ViewVndRegistryExtended
    | "actualizationBucket" // статус срока актуализации (normal/approaching/critical/overdue) - для страницы планирования актуализации
    | "linkedToMe"; // виды связи текущего пользователя с документом - только при включённом чекбоксе "Только связанные со мной"

export interface ColDef {
    key: ColKey;
    // Ключ перевода в неймспейсе "vndColumns" (locales/ru|en/vndColumns.json).
    // Пустая строка — колонка без текстового заголовка (например, иконка статуса).
    labelKey: string;
    width: string;
    fixed?: boolean; // нельзя будет скрыть через меню "Колонки" (код, наименование)
}

// Сигнатура намеренно минимальна (key -> string), чтобы подходить под t() из
// react-i18next, vue-i18n, next-intl, i18next и т.п. без привязки к конкретной библиотеке.
export type TranslateFn = (key: string) => string;

// --- Дополнительные колонки, общие для обоих scope
const EXTRA_COLUMNS: ColDef[] = [
    {key: "linkedToMe", labelKey: "columns.linkedToMe", width: "220px"},
    {key: "redactionCount", labelKey: "columns.redactionCount", width: "140px"},
    {key: "responsibleExecutors", labelKey: "columns.responsibleExecutors", width: "220px"},
    {key: "adoptionDate", labelKey: "columns.adoptionDate", width: "140px"},
    {key: "adoptionCode", labelKey: "columns.adoptionCode", width: "140px"},
    {key: "effectiveDate", labelKey: "columns.effectiveDate", width: "160px"},
    {key: "requisitesChangedDate", labelKey: "columns.requisitesChangedDate", width: "160px"},
    {key: "revisionChangedDate", labelKey: "columns.revisionChangedDate", width: "160px"},
    {key: "dueActualizationDate", labelKey: "columns.dueActualizationDate", width: "150px"},
    {key: "lastActualizationDate", labelKey: "columns.lastActualizationDate", width: "170px"},
    {key: "lastActualizationStatus", labelKey: "columns.lastActualizationStatus", width: "180px"},
    {key: "keywords", labelKey: "columns.keywords", width: "200px"},
    {key: "rubric", labelKey: "columns.rubric", width: "170px"},
    {key: "secrecyLevel", labelKey: "columns.secrecyLevel", width: "170px"},
    {key: "userGroups", labelKey: "columns.userGroups", width: "200px"},
];

// Колонки для действующих
export const ACTIVE_COLUMNS: ColDef[] = [
    {key: "statusIcon", labelKey: "", width: "44px", fixed: true},
    {key: "code", labelKey: "columns.code", width: "88px", fixed: true},
    {key: "name", labelKey: "columns.name", width: "minmax(220px,1fr)", fixed: true},
    {key: "type", labelKey: "columns.type", width: "160px"},
    {key: "developer", labelKey: "columns.developer", width: "200px"},
    {key: "organ", labelKey: "columns.organ", width: "180px"},
    {key: "act", labelKey: "columns.act", width: "116px"},
    {key: "status", labelKey: "columns.status", width: "180px"},
    {key: "cancelDate", labelKey: "columns.cancelDate", width: "140px"},
    {key: "cancelCode", labelKey: "columns.cancelCode", width: "140px"},
    {key: "archivedDate", labelKey: "columns.archivedDate", width: "140px"}, // переключаемая на "Все"/"Действующие"
    ...EXTRA_COLUMNS,
];

// Колонки для архивированных
export const ARCHIVE_COLUMNS: ColDef[] = [
    {key: "statusIcon", labelKey: "", width: "44px", fixed: true},
    {key: "code", labelKey: "columns.code", width: "88px", fixed: true},
    {key: "name", labelKey: "columns.name", width: "minmax(220px,1fr)", fixed: true},
    {key: "type", labelKey: "columns.type", width: "160px"},
    {key: "developer", labelKey: "columns.developer", width: "200px"},
    {key: "organ", labelKey: "columns.organ", width: "180px"},
    {key: "cancelDate", labelKey: "columns.cancelDate", width: "140px", fixed: true},
    {key: "cancelCode", labelKey: "columns.cancelCode", width: "140px", fixed: true},
    {key: "archivedDate", labelKey: "columns.archivedDate", width: "140px", fixed: true}, // спец. обязательна на "Архивированные"
    {key: "daysInArchive", labelKey: "columns.daysInArchive", width: "110px", fixed: true}, // спец.
    // ВАЖНО: тот же ColKey "status", что и в ACTIVE_COLUMNS, но другой labelKey —
    // на табе "Архивированные" заголовок дан полным словом ("последней"), а не
    // сокращением ("посл."), как на "Действующих"; ширина колонки тоже другая.
    {key: "status", labelKey: "columns.statusArchive", width: "134px"},
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

// Колонки, доступные только при праве ViewVndRegistryExtended ("Просмотр реестра ВНД
// в расширенном режиме: статус последней редакции, актуализация")
const EXTENDED_PERMISSION_COLUMNS: ColKey[] = ["status", "act", "redactionCount"];

// Колонки, доступные только при включённом чекбоксе "Только связанные со мной"
const LINKED_TO_ME_ONLY_COLUMNS: ColKey[] = ["linkedToMe"];

// Возвращает итоговый список возможных колонок для таблицы в зависимости от Tab.
// canViewExtended — есть ли у пользователя право ViewVndRegistryExtended; по умолчанию
// true, чтобы места без явной проверки прав (если такие остались) не теряли колонки молча.
// linkedToMeOnly — включён ли чекбокс "Только связанные со мной" (колонка "Связь со мной"
// имеет смысл только тогда, когда он включён — иначе связей просто нет).
export function getColumnsForScope(
    scope: VndScope, canViewExtended: boolean = true, linkedToMeOnly: boolean = false
): ColDef[] {
    let cols = scope === "arch" ? ARCHIVE_COLUMNS : ACTIVE_COLUMNS;
    if (scope === "active") {
        cols = cols.filter((c) => !HIDDEN_ON_ACTIVE.includes(c.key));
    }
    if (scope === "arch") {
        cols = cols.filter((c) => !HIDDEN_ON_ARCH.includes(c.key));
    }
    if (!canViewExtended) {
        cols = cols.filter((c) => !EXTENDED_PERMISSION_COLUMNS.includes(c.key));
    }
    if (!linkedToMeOnly) {
        cols = cols.filter((c) => !LINKED_TO_ME_ONLY_COLUMNS.includes(c.key));
    }
    return cols;
}

// Возвращает список колонок, которые пользователь может скрывать/отображать через выпадающий список
export function getToggleableColumns(
    scope: VndScope, canViewExtended: boolean = true, linkedToMeOnly: boolean = false
): ColDef[] {
    return getColumnsForScope(scope, canViewExtended, linkedToMeOnly).filter((c) => !c.fixed);
}