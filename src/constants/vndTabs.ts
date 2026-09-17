import type {TFunction} from "i18next";

// статусы ВНД действующие, на актуализации, на согласовании, на консолидации, архивирован, черновик
export type VndStatusKey = "active" | "onact" | "review" | "consol" | "arch" | "draft";

// статусы последней актуализации: без изменений, с изменениями
export type LastActualizationStatus = "no_changes" | "with_changes";

// Режимы просмотра реестра ВНД: все, действующие, ещё не действующие (таб доступен только при
// праве ViewVndRegistryExtended — см. BaseVndPage/useVndFilters/useVndScopeCounts), архивированные,
// черновики
export type VndScope = "all" | "active" | "notYetActive" | "arch" | "draft";
// Режимы открытого ВНД:
export const VND_TAB_IDS = ["editions", "passport", "links", "history", "approval", "actual"] as const;
export type VndTabId = (typeof VND_TAB_IDS)[number];

interface VndTabMeta {
    id: VndTabId;
    label: string;
}

// label — ключи i18n (namespace vnd.vndTabs), а не готовый текст: переводится в getVndTabs,
// которая теперь принимает t параметром (сама функция — не хук и не компонент, так что
// useTranslation() внутри неё вызвать нельзя; t передаётся из места использования, где он
// уже есть через useTranslation).
const BASE_LABELS: Record<VndTabId, string> = {
    editions: "vnd.vndTabs.editions",
    passport: "vnd.vndTabs.passport",
    links: "vnd.vndTabs.links",
    history: "vnd.vndTabs.history",
    approval: "vnd.vndTabs.approval",
    actual: "vnd.vndTabs.actual",
};

// Лейбл таба «editions» переопределяется для отдельных статусов — сам таб
// один и тот же слот интерфейса, просто для черновика в нём ещё нет истории
// версий, а есть только форма создания первой редакции.
// label — ключ i18n, см. комментарий у BASE_LABELS выше.
const EDITIONS_LABEL_BY_STATUS: Partial<Record<VndStatusKey, string>> = {
    draft: "vnd.vndTabs.editionsFirstDraft",
};

// «Реквизиты» и «Редакции» показываются для любого статуса — паспорт общий
// для всех, а «Редакции» превращается в форму первой редакции, пока документ
// в черновике. «Актуализация» и «Связи» для черновика скрыты — актуализировать
// и связывать пока нечего: первый цикл начнётся только после появления редакции.
//
// «История» для черновика, В ОТЛИЧИЕ от «Актуализации»/«Связей», ОСТАВЛЕНА — статус
// "draft" бывает не только у ВНД, которая ещё вообще ни разу не отправлялась на
// согласование (тогда историю смотреть действительно ещё не на чем, и вкладка просто
// покажет пустые списки - см. VndHistoryTab), но и у редакции, которую только что
// ОТКЛОНИЛИ при согласовании (RejectApprovalAsync возвращает ВНД в статус "draft" -
// см. rejectedRedactionId/wasRejected в VndEditionsTab/RedactionsSidebar). Именно в
// этот момент пользователю и нужно посмотреть историю - какой именно процесс
// отклонился и что там написали согласующие - поэтому вкладка должна быть доступна
// сразу, а не только после того, как документ снова уйдёт на согласование.
//
// onact/consol ОБЯЗАТЕЛЬНО должны включать "approval" — иначе кнопка «Перейти к
// согласованию» на вкладке «Актуализация» (сценарий «без изменений») ведёт в никуда:
// пользователь физически не может открыть вкладку согласования, пока документ на
// актуализации/консолидации (баг: кнопка "не работает").
const TABS_BY_STATUS: Partial<Record<VndStatusKey, VndTabId[]>> = {
    draft: ["passport", "editions", "history"],
    // "history" здесь отсутствовал - из-за этого таб «История» пропадал ровно в момент,
    // когда документ уходит на согласование (первая редакция и любая последующая,
    // отправленная на согласование), хотя посмотреть, кто инициировал согласование и что
    // происходит с процессом (тот же журнал аудита), нужнее всего именно сейчас. onact/consol
    // ниже уже включают "history" по той же причине - review остался не в ряд по недосмотру.
    review: ["passport", "editions", "approval", "links", "history"],
    onact: ["passport", "editions", "approval", "links", "history", "actual"],
    consol: ["passport", "editions", "approval", "links", "history", "actual"],
};

export function getVndTabs(status: VndStatusKey, t: TFunction): VndTabMeta[] {
    const allowedIds = TABS_BY_STATUS[status] ?? VND_TAB_IDS.filter((id) => id !== "approval");
    return VND_TAB_IDS
        .filter((id) => allowedIds.includes(id))
        .map((id) => ({
            id,
            label: t(id === "editions" ? (EDITIONS_LABEL_BY_STATUS[status] ?? BASE_LABELS.editions) : BASE_LABELS[id]),
        }));
}