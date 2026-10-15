import {ChartColumn, FileText, Layers, ShoppingCart, StickyNote, type LucideIcon} from "lucide-react";
import type {SzTaskStage} from "@/service/workflowService/taskInboxService.ts";

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
    vnd: {icon: FileText, color: "#55abb1", bg: "#e3f7f8", ring: "#c3edf0"},
    sz: {icon: StickyNote, color: "#d1a154", bg: "#fdf3e2", ring: "#f6e2bb"},
    prc: {icon: ShoppingCart, color: "#7a5ce0", bg: "#efeafe", ring: "#ddd0fa"},
    ack: {icon: FileText, color: "#499c72", bg: "#e5f7ee", ring: "#c8ecd9"},
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

// Подвкладки раздела «Служебные записки»: по этапу записки. В каждую попадают и задачи
// пользователя (зарегистрировать, согласовать, подписать...), и его собственные записки,
// которые на этом этапе ждут других, — инициатор видит, где сейчас его СЗ.
export type SzInboxSubTab = "all" | SzTaskStage;
export const SZ_INBOX_SUB_TAB_IDS: SzInboxSubTab[] = [
    "all", "Registration", "Approval", "Signing", "Revision", "Decision", "Board", "Execution",
];

export const SZ_INBOX_SUB_TAB_LABEL_KEYS: Record<SzInboxSubTab, string> = {
    all: "tasks.inbox.szTabs.all",
    Registration: "tasks.inbox.szTabs.registration",
    Approval: "tasks.inbox.szTabs.approval",
    Signing: "tasks.inbox.szTabs.signing",
    Revision: "tasks.inbox.szTabs.revision",
    Decision: "tasks.inbox.szTabs.decision",
    Board: "tasks.inbox.szTabs.board",
    Execution: "tasks.inbox.szTabs.execution",
};

// Подвкладки «Согласования» в разделе СЗ: свои записки, которые сейчас согласуют другие,
// и записки, где согласующий — сам пользователь.
export type SzApprovalWho = "mine" | "approve";
export const SZ_APPROVAL_WHO_IDS: SzApprovalWho[] = ["mine", "approve"];

export const SZ_APPROVAL_WHO_LABEL_KEYS: Record<SzApprovalWho, string> = {
    mine: "tasks.inbox.szApprovalTabs.mine",
    approve: "tasks.inbox.szApprovalTabs.approve",
};
