// статусы ВНД действующие, на актуализации, на согласовании, на консолидации, архивирован, черновик
export type VndStatusKey = "active" | "onact" | "review" | "consol" | "arch" | "draft";

// статусы последней актуализации: без изменений, с изменениями
export type LastActualizationStatus = "no_changes" | "with_changes";

// Режимы просмотра реестра ВНД:: все, действующие, архивированные, черновики
export type VndScope = "all" | "active" | "arch" | "draft";
// Режимы открытого ВНД:
export const VND_TAB_IDS = ["editions", "passport", "links", "history", "approval", "actual"] as const;
export type VndTabId = (typeof VND_TAB_IDS)[number];

interface VndTabMeta {
    id: VndTabId;
    label: string;
}

const BASE_LABELS: Record<VndTabId, string> = {
    editions: "Редакции",
    passport: "Реквизиты",
    links: "Связи",
    history: "История",
    approval: "Ход согласования",
    actual: "Актуализация",
};

// Лейбл таба «editions» переопределяется для отдельных статусов — сам таб
// один и тот же слот интерфейса, просто для черновика в нём ещё нет истории
// версий, а есть только форма создания первой редакции.
const EDITIONS_LABEL_BY_STATUS: Partial<Record<VndStatusKey, string>> = {
    draft: "Первая редакция",
};

// «Реквизиты» и «Редакции» показываются для любого статуса — паспорт общий
// для всех, а «Редакции» превращается в форму первой редакции, пока документ
// в черновике. «Актуализация» и «Связи и история» для черновика скрыты —
// актуализировать и связывать пока нечего: первый цикл начнётся только
// после появления редакции.
//
// onact/consol ОБЯЗАТЕЛЬНО должны включать "approval" — иначе кнопка «Перейти к
// согласованию» на вкладке «Актуализация» (сценарий «без изменений») ведёт в никуда:
// пользователь физически не может открыть вкладку согласования, пока документ на
// актуализации/консолидации (баг: кнопка "не работает").
const TABS_BY_STATUS: Partial<Record<VndStatusKey, VndTabId[]>> = {
    draft: ["passport", "editions"],
    review: ["passport", "editions", "approval", "links"],
    onact: ["passport", "editions", "approval", "links", "history", "actual"],
    consol: ["passport", "editions", "approval", "links", "history", "actual"],
};

export function getVndTabs(status: VndStatusKey): VndTabMeta[] {
    const allowedIds = TABS_BY_STATUS[status] ?? VND_TAB_IDS.filter((id) => id !== "approval");
    return VND_TAB_IDS
        .filter((id) => allowedIds.includes(id))
        .map((id) => ({
            id,
            label: id === "editions" ? (EDITIONS_LABEL_BY_STATUS[status] ?? BASE_LABELS.editions) : BASE_LABELS[id],
        }));
}