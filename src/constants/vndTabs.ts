import type {VndStatusKey} from "@/service/vndService/vndServiceType.ts";

export const VND_TAB_IDS = ["passport", "editions", "actual", "links"] as const;
export type VndTabId = (typeof VND_TAB_IDS)[number];

interface VndTabMeta {
    id: VndTabId;
    label: string;
}

const BASE_LABELS: Record<VndTabId, string> = {
    passport: "Реквизиты",
    editions: "Редакции",
    actual: "Актуализация",
    links: "Связи и история",
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
const TABS_BY_STATUS: Partial<Record<VndStatusKey, VndTabId[]>> = {
    draft: ["passport", "editions"],
};

export function getVndTabs(status: VndStatusKey): VndTabMeta[] {
    const allowedIds = TABS_BY_STATUS[status] ?? VND_TAB_IDS.slice();
    return VND_TAB_IDS
        .filter((id) => allowedIds.includes(id))
        .map((id) => ({
            id,
            label: id === "editions" ? (EDITIONS_LABEL_BY_STATUS[status] ?? BASE_LABELS.editions) : BASE_LABELS[id],
        }));
}