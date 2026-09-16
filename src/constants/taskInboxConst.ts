import {ChartColumn, FileText, Layers, ShoppingCart, StickyNote, type LucideIcon} from "lucide-react";

// Вкладки сводного реестра задач
export type InboxFilterId = "all" | "vnd" | "sz" | "prc" | "ack";
export const INBOX_FILTER_IDS: InboxFilterId[] = ["all", "vnd", "sz", "prc", "ack"];

// documentType, который передаётся в taskInboxService.get() - у "all" и "vnd" его нет:
// "all" тянет всё без фильтра, "vnd" идёт через другой сервис
export const INBOX_FILTER_DOCUMENT_TYPE: Partial<Record<InboxFilterId, string>> = {
    sz: "Sz",
    prc: "Procurement",
    ack: "Acknowledgement",
};

// Ключ i18n подписи вкладки — см. tasks.inbox.filters.* в translation.json.
export const INBOX_FILTER_LABEL_KEYS: Record<InboxFilterId, string> = {
    all: "tasks.inbox.filters.all",
    vnd: "tasks.inbox.filters.vnd",
    sz: "tasks.inbox.filters.sz",
    prc: "tasks.inbox.filters.prc",
    ack: "tasks.inbox.filters.ack",
};

// Вид карточек-вкладок (кроме "Все контуры" — та стилизована отдельно, см.
// TaskInboxFilterTabs).
export const INBOX_CONTOUR_META: Record<Exclude<InboxFilterId, "all">, { icon: LucideIcon; color: string; bg: string; ring: string }> = {
    vnd: {icon: FileText, color: "#0e8091", bg: "#dbf2f5", ring: "#b4e6ec"},
    sz: {icon: StickyNote, color: "#b3730a", bg: "#fbeecf", ring: "#f0d9ad"},
    prc: {icon: ShoppingCart, color: "#7a5ce0", bg: "#efeafe", ring: "#ddd0fa"},
    ack: {icon: FileText, color: "#1c7a4d", bg: "#e2f4ea", ring: "#c7e9d6"},
};

export const INBOX_ALL_TAB_ICON: LucideIcon = Layers;
export const INBOX_STATS_LINK_ICON: LucideIcon = ChartColumn;

// Сообщение при пустом списке
export const INBOX_EMPTY_META: Record<Exclude<InboxFilterId, "vnd">, { icon: LucideIcon; titleKey: string; descriptionKey: string }> = {
    all: {
        icon: Layers,
        titleKey: "tasks.inbox.empty.all.title",
        descriptionKey: "tasks.inbox.empty.all.description",
    },
    sz: {
        icon: StickyNote,
        titleKey: "tasks.inbox.empty.sz.title",
        descriptionKey: "tasks.inbox.empty.sz.description",
    },
    prc: {
        icon: ShoppingCart,
        titleKey: "tasks.inbox.empty.prc.title",
        descriptionKey: "tasks.inbox.empty.prc.description",
    },
    ack: {
        icon: FileText,
        titleKey: "tasks.inbox.empty.ack.title",
        descriptionKey: "tasks.inbox.empty.ack.description",
    },
};
