import {apiClient} from "@/service/apiClient.ts";

/**
 * Журнал изменений настроек и справочников.
 *
 * Отвечает на вопрос, который задают редко и всегда задним числом: кто и когда
 * поменял справочник, из-за которого всё поехало. Отдельно от журнала действий
 * по документам — там ищут след записки, здесь след настройки.
 */

export type SettingsChangeKind = "Added" | "Modified" | "Deleted";

export const CHANGE_KIND_TITLE: Record<SettingsChangeKind, string> = {
    Added: "Заведено",
    Modified: "Изменено",
    Deleted: "Удалено",
};

export const CHANGE_KIND_ORDER: SettingsChangeKind[] = ["Added", "Modified", "Deleted"];

/** Одно изменённое поле: что было и что стало. */
export interface FieldChange {
    field: string | null;
    before: string | null;
    after: string | null;
}

export interface SettingsChange {
    id: number;
    /** Человеческое название области: «Подразделения», «Роли и права». */
    area: string;
    entityType: string;
    entityId: number;
    /** Название записи на момент изменения — снимком, чтобы удалённую можно было назвать. */
    entityTitle: string | null;
    kind: SettingsChangeKind;
    at: string;
    author: string | null;
    changes: FieldChange[];
}

export interface AreaSummary {
    area: string;
    count: number;
    last: string;
}

export interface SettingsChangeFilter {
    area?: string;
    userId?: number;
    kind?: SettingsChangeKind;
    from?: string;
    to?: string;
    text?: string;
    page?: number;
    pageSize?: number;
}

const BASE = "/settings/changes";

export const settingsChangeService = {
    async list(filter: SettingsChangeFilter = {}) {
        const {data} = await apiClient.get<{
            total: number; page: number; pageSize: number; items: SettingsChange[];
        }>(BASE, {params: filter});
        return data;
    },

    /** Области, по которым есть записи — для отбора. */
    async areas() {
        const {data} = await apiClient.get<AreaSummary[]>(`${BASE}/areas`);
        return data;
    },

    /** История одной записи справочника — что с ней делали за всё время. */
    async entity(entityType: string, entityId: number) {
        const {data} = await apiClient.get<{
            id: number; kind: SettingsChangeKind; at: string;
            author: string | null; changes: FieldChange[];
        }[]>(`${BASE}/entity/${entityType}/${entityId}`);
        return data;
    },
};

/**
 * Название поля по-русски. Журнал читает администратор банка, а не разработчик:
 * «TitleRu» ему ничего не говорит.
 *
 * Неизвестное поле возвращается как есть — так новое поле видно и попадёт в этот
 * список при следующей правке, а не растворится в «прочем».
 */
const FIELD_TITLES: Record<string, string> = {
    TitleRu: "Название",
    TitleEn: "Название (англ.)",
    TitleKg: "Название (кырг.)",
    Title: "Название",
    Name: "Название",
    Code: "Код",
    ParentId: "Родитель",
    IsActive: "Действует",
    SortOrder: "Порядок",
    PermissionCodes: "Права",
    Description: "Описание",
    Email: "Почта",
    Phone: "Телефон",
    Address: "Адрес",
    TaxId: "ИНН",
    ShortTitle: "Краткое название",
    ContactPerson: "Контактное лицо",
    RequiresPaperSz: "Требует бумажную записку",
    IsPaperByDefault: "Бумажный по умолчанию",
    ExecutionDays: "Срок исполнения, дней",
    RouteTemplateId: "Шаблон маршрута",
    Periodicity: "Периодичность",
    GraceDays: "Отсрочка, дней",
    Basis: "Основание",
    Kind: "Вид",
    Body: "Орган",
    FormKey: "Форма",
    StartsOn: "Действует с",
    EndsOn: "Действует по",
    ResponsibleUserId: "Ответственный",
    ResponsibleUnitId: "Подразделение",
};

export function fieldTitle(field: string | null): string {
    if (!field) return "—";
    return FIELD_TITLES[field] ?? field;
}
