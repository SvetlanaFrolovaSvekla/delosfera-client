// Виды связи текущего пользователя с ВНД — используются фильтром "Только связанные со мной"
// (чекбокс + выпадающий список "Тип связи" + колонка "Связь со мной" в реестре).
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
// (STATUS_META): согласование — синий (review), актуализация — коричневый (onact),
// консолидация — фиолетовый (consol). У "инициатора" нет своего статуса ВНД, поэтому
// для него взят нейтральный серый.
const INITIATOR_COLOR = "#5b6472";

export const LINKED_TO_ME_RELATION_GROUPS: { title: string; color: string; options: LinkedToMeRelationOption[] }[] = [
    {
        title: "Согласование",
        color: STATUS_META.review.color,
        options: [
            {key: "currentApprover", label: "Я являюсь согласующим сейчас", color: STATUS_META.review.color},
            {key: "pastApprover", label: "Я когда-то являлся согласующим", color: STATUS_META.review.color},
        ],
    },
    {
        title: "Актуализация",
        color: STATUS_META.onact.color,
        options: [
            {key: "currentActualizer", label: "Я актуализирую", color: STATUS_META.onact.color},
            {key: "pastActualizer", label: "Я когда-то актуализировал", color: STATUS_META.onact.color},
        ],
    },
    {
        title: "Консолидация",
        color: STATUS_META.consol.color,
        options: [
            {key: "currentConsolidator", label: "Я консолидирую", color: STATUS_META.consol.color},
            {key: "pastConsolidator", label: "Я когда-то консолидировал", color: STATUS_META.consol.color},
        ],
    },
    {
        title: "Инициатива",
        color: INITIATOR_COLOR,
        options: [
            {key: "initiator", label: "Я являюсь инициатором", color: INITIATOR_COLOR},
        ],
    },
];

export const LINKED_TO_ME_RELATION_OPTIONS: LinkedToMeRelationOption[] =
    LINKED_TO_ME_RELATION_GROUPS.flatMap((g) => g.options);

export const ALL_LINKED_TO_ME_RELATION_KEYS: LinkedToMeRelationKey[] =
    LINKED_TO_ME_RELATION_OPTIONS.map((o) => o.key);

// Цвет и порядковый номер (для сортировки бэйджей в колонке "Связь со мной" в постоянном,
// сгруппированном по смыслу порядке — а не в том, в каком их вернул бэкенд)
export const LINKED_TO_ME_RELATION_META: Record<LinkedToMeRelationKey, { label: string; color: string; order: number }> =
    Object.fromEntries(
        LINKED_TO_ME_RELATION_OPTIONS.map((o, i) => [o.key, {label: o.label, color: o.color, order: i}])
    ) as Record<LinkedToMeRelationKey, { label: string; color: string; order: number }>;
