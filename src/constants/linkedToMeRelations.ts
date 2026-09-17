// Виды связи текущего пользователя с ВНД - используются фильтром "Только связанные со мной"
// (чекбокс + выпадающий список "Тип связи" + колонка "Связь со мной" в реестре).
// title/label — ключи i18n (namespace vnd.linkedToMeRelation, кроме групп с общими
// понятиями, использующих уже существующие ключи других разделов), а не готовый текст:
// переводятся на месте использования (LinkedToMeRelationDropdown, VndTable), где уже есть
// доступ к useTranslation. См. аналогичный комментарий у STATUS_META в vndStatus.ts.
import {STATUS_META} from "@/constants/vndStatus.ts";

export type LinkedToMeRelationKey =
    | "currentApprover"
    | "pastApprover"
    | "initiator"
    | "currentActualizer"
    | "pastActualizer"
    | "currentConsolidator"
    | "pastConsolidator";

export interface LinkedToMeRelationOption {
    key: LinkedToMeRelationKey;
    label: string;
    color: string;
}

// Группы окрашены теми же цветами, что и "таблетка" статуса последней редакции
const INITIATOR_COLOR = "#5b6472";

export const LINKED_TO_ME_RELATION_GROUPS: { title: string; color: string; options: LinkedToMeRelationOption[] }[] = [
    {
        // "Согласование" - тот же ключ, что и у верхней вкладки "Мои задачи" (см. VndTasksPanel)
        title: "tasks.vnd.topTabs.coordination",
        color: STATUS_META.review.color,
        options: [
            {key: "currentApprover", label: "vnd.linkedToMeRelation.options.currentApprover", color: STATUS_META.review.color},
            {key: "pastApprover", label: "vnd.linkedToMeRelation.options.pastApprover", color: STATUS_META.review.color},
        ],
    },
    {
        // "Актуализация" - тот же ключ, что и у таба ВНД-карточки (см. vndTabs выше)
        title: "vnd.vndTabs.actual",
        color: STATUS_META.onact.color,
        options: [
            {key: "currentActualizer", label: "vnd.linkedToMeRelation.options.currentActualizer", color: STATUS_META.onact.color},
            {key: "pastActualizer", label: "vnd.linkedToMeRelation.options.pastActualizer", color: STATUS_META.onact.color},
        ],
    },
    {
        // "Консолидация" - тот же ключ, что и у статуса последней редакции consol (см. STATUS_META)
        title: "vnd.redactionStatusMeta.consol",
        color: STATUS_META.consol.color,
        options: [
            {key: "currentConsolidator", label: "vnd.linkedToMeRelation.options.currentConsolidator", color: STATUS_META.consol.color},
            {key: "pastConsolidator", label: "vnd.linkedToMeRelation.options.pastConsolidator", color: STATUS_META.consol.color},
        ],
    },
    {
        title: "vnd.linkedToMeRelation.groups.initiative",
        color: INITIATOR_COLOR,
        options: [
            {key: "initiator", label: "vnd.linkedToMeRelation.options.initiator", color: INITIATOR_COLOR},
        ],
    },
];

export const LINKED_TO_ME_RELATION_OPTIONS: LinkedToMeRelationOption[] =
    LINKED_TO_ME_RELATION_GROUPS.flatMap((g) => g.options);

export const ALL_LINKED_TO_ME_RELATION_KEYS: LinkedToMeRelationKey[] =
    LINKED_TO_ME_RELATION_OPTIONS.map((o) => o.key);

// Цвет и порядковый номер (для сортировки в колонке "Связь со мной" в постоянном,
// сгруппированном по смыслу порядке)
export const LINKED_TO_ME_RELATION_META: Record<LinkedToMeRelationKey, { label: string; color: string; order: number }> =
    Object.fromEntries(
        LINKED_TO_ME_RELATION_OPTIONS.map((o, i) => [o.key, {label: o.label, color: o.color, order: i}])
    ) as Record<LinkedToMeRelationKey, { label: string; color: string; order: number }>;
