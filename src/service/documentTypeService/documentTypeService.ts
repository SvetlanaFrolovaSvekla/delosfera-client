import {apiClient} from "@/service/apiClient.ts";

/**
 * Типы документов, заводимые без программирования.
 *
 * Банк добавляет свой вид документа — скажем, заявку на командировку, — задаёт
 * поля карточки и шаблон маршрута, по которому документ пойдёт на согласование.
 *
 * Без шаблона маршрута документ такого типа отправить на согласование нельзя:
 * сервер откажет словами «согласовывать нечем». Поэтому шаблон здесь — не
 * украшение карточки, а условие работоспособности типа.
 */

/**
 * Вид поля карточки. Значения — те же числа, что и в перечислении на сервере:
 * они ходят по сети как есть, и разойдясь однажды, дадут поле не того вида
 * без единой ошибки.
 */
export const FieldKind = {
    Text: 1,
    MultilineText: 2,
    Number: 3,
    Money: 4,
    Date: 5,
    Checkbox: 6,
    /** Значение из справочника администратора. */
    Dictionary: 7,
    /** Сотрудник банка. */
    User: 8,
    /** Структурное подразделение. */
    OrgUnit: 9,
} as const;

export type FieldKind = (typeof FieldKind)[keyof typeof FieldKind];

export const FIELD_KIND_TITLE: Record<FieldKind, string> = {
    [FieldKind.Text]: "Строка",
    [FieldKind.MultilineText]: "Текст",
    [FieldKind.Number]: "Число",
    [FieldKind.Money]: "Сумма",
    [FieldKind.Date]: "Дата",
    [FieldKind.Checkbox]: "Да или нет",
    [FieldKind.Dictionary]: "Из справочника",
    [FieldKind.User]: "Сотрудник",
    [FieldKind.OrgUnit]: "Подразделение",
};

/** Порядок для выпадающего списка: сперва простые виды, следом ссылочные. */
export const FIELD_KINDS: FieldKind[] = [
    FieldKind.Text,
    FieldKind.MultilineText,
    FieldKind.Number,
    FieldKind.Money,
    FieldKind.Date,
    FieldKind.Checkbox,
    FieldKind.Dictionary,
    FieldKind.User,
    FieldKind.OrgUnit,
];

export interface DocumentTypeField {
    id: number;
    /** Имя поля в данных карточки. Латиницей, не меняется после заведения. */
    code: string;
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
    kind: FieldKind;
    kindTitle: string;
    /** Для поля из справочника — какой именно справочник. */
    dictionaryId?: number | null;
    dictionaryTitle?: string | null;
    isRequired: boolean;
    /** Показывать колонкой в списке документов этого типа. */
    showInList: boolean;
    order: number;
    hint?: string | null;
}

export interface DocumentType {
    id: number;
    /** Системное имя: латиницей, попадает в номер документа. */
    code: string;
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
    description?: string | null;
    /** Шаблон маршрута согласования. Без него тип нерабочий. */
    routeTemplateId?: number | null;
    routeTemplateName?: string | null;
    /** Маска регистрационного номера, например «ПР-{year}-{seq}». */
    numberPattern?: string | null;
    isActive: boolean;
    fields: DocumentTypeField[];
}

export interface DocumentTypeSaveRequest {
    /** Задаётся при создании; при изменении не меняется. */
    code?: string;
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
    description?: string | null;
    routeTemplateId?: number | null;
    numberPattern?: string | null;
    isActive?: boolean;
}

export interface DocumentTypeFieldRequest {
    code?: string;
    titleRu: string;
    titleEn?: string | null;
    titleKg?: string | null;
    kind: FieldKind;
    dictionaryId?: number | null;
    isRequired: boolean;
    showInList: boolean;
    order?: number | null;
    hint?: string | null;
}

const BASE = "/admin/document-types";

export const documentTypeService = {
    async list() {
        const {data} = await apiClient.get<DocumentType[]>(BASE);
        return data;
    },

    async get(id: number) {
        const {data} = await apiClient.get<DocumentType>(`${BASE}/${id}`);
        return data;
    },

    async create(request: DocumentTypeSaveRequest) {
        const {data} = await apiClient.post<DocumentType>(BASE, request);
        return data;
    },

    async update(id: number, request: DocumentTypeSaveRequest) {
        const {data} = await apiClient.put<DocumentType>(`${BASE}/${id}`, request);
        return data;
    },

    async remove(id: number) {
        await apiClient.delete(`${BASE}/${id}`);
    },

    async addField(typeId: number, request: DocumentTypeFieldRequest) {
        const {data} = await apiClient.post<DocumentTypeField>(`${BASE}/${typeId}/fields`, request);
        return data;
    },

    async updateField(fieldId: number, request: DocumentTypeFieldRequest) {
        const {data} = await apiClient.put<DocumentTypeField>(`${BASE}/fields/${fieldId}`, request);
        return data;
    },

    async removeField(fieldId: number) {
        await apiClient.delete(`${BASE}/fields/${fieldId}`);
    },
};

/** Тип без шаблона маршрута нельзя отправить на согласование — сервер откажет. */
export function готовКРаботе(type: DocumentType): boolean {
    return type.routeTemplateId != null;
}
