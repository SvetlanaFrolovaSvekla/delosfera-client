// Модель реестра «Заявки и закупки»: вкладки, расширенный поиск и перевод в запрос.
import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {toDateRangeFilter} from "@/utils/dateUtils.ts";
import type {
    ProcurementSearchRequest,
    ProcurementStatusCode,
    SubjectKind,
} from "@/service/procurementService/procurementService.ts";

export type ProcurementScopeId = "all" | "mine" | "drafts" | "approval" | "inprocurement" | "completed";

export const PROCUREMENT_SCOPES: { id: ProcurementScopeId; statuses?: ProcurementStatusCode[]; mineOnly?: boolean }[] = [
    {id: "all"},                                                    // "Все закупки"
    {id: "mine", mineOnly: true},                                   // "Инициирую я"
    {id: "drafts", statuses: ["Draft"], mineOnly: true},            // "Черновики"
    {id: "approval", statuses: ["OnApproval"]},                     // "На согласовании"
    {id: "inprocurement", statuses: ["InProcurement", "Approved"]}, // "В закупке"
    {id: "completed", statuses: ["Completed"]},                     // "Завершённые"
];

/** На вкладках со своим набором статусов отдельный фильтр по статусу не нужен. */
export const scopeHasStatuses = (id: ProcurementScopeId): boolean =>
    !!PROCUREMENT_SCOPES.find((s) => s.id === id)?.statuses;

/** Порядок в выпадающем списке статусов — по ходу заявки. */
export const PROCUREMENT_FILTER_STATUSES: ProcurementStatusCode[] = [
    "Draft", "OnApproval", "OnRevision", "Approved", "InProcurement", "Completed", "Rejected", "Cancelled",
];

export const SUBJECT_KINDS: SubjectKind[] = [
    "Goods", "HouseholdGoods", "SpecificGoods", "GoodsWithInstallation", "Works", "Services",
];

export interface ProcurementAdvancedFilters {
    regNumber: string;
    subject: string;
    initiatorIds: number[];
    curatorIds: number[];
    /** id способа строкой ("" — любой): так он лежит в выпадающем списке и в сохранённых фильтрах. */
    methodId: string;
    subjectKind: SubjectKind | "";
    amountFrom: string;
    amountTo: string;
    createdDate: DateFilterValue;
    affiliatedOnly: boolean;
    offBudgetOnly: boolean;
}

export const EMPTY_PROCUREMENT_ADVANCED: ProcurementAdvancedFilters = {
    regNumber: "",
    subject: "",
    initiatorIds: [],
    curatorIds: [],
    methodId: "",
    subjectKind: "",
    amountFrom: "",
    amountTo: "",
    createdDate: EMPTY_DATE_FILTER,
    affiliatedOnly: false,
    offBudgetOnly: false,
};

export const isDateFilterSet = (v: DateFilterValue): boolean => !!(v.exact || v.from || v.to);

export const hasProcurementAdvanced = (a: ProcurementAdvancedFilters): boolean =>
    !!a.regNumber.trim() || !!a.subject.trim()
    || a.initiatorIds.length > 0 || a.curatorIds.length > 0
    || !!a.methodId || !!a.subjectKind
    || !!a.amountFrom.trim() || !!a.amountTo.trim()
    || isDateFilterSet(a.createdDate) || a.affiliatedOnly || a.offBudgetOnly;

/** «1 000 000,50» → 1000000.5; пусто или не число — undefined. */
export function parseAmount(value: string): number | undefined {
    const cleaned = value.replace(/\s/g, "").replace(",", ".");
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function toRange(v: DateFilterValue): { from?: string; to?: string } {
    const r = toDateRangeFilter(v);
    if (!r) return {};
    if (r.exact) return {from: r.exact, to: r.exact};
    return {from: r.from ?? undefined, to: r.to ?? undefined};
}

/** Вкладка, статус и расширенный поиск → запрос /procurement/requests/search (и выгрузки). */
export function buildProcurementRequest(
    scope: ProcurementScopeId,
    query: string,
    status: ProcurementStatusCode | "",
    a: ProcurementAdvancedFilters,
    /** Право EditAnyProcurementDraft: во вкладке «Черновики» — черновики всех пользователей. */
    seesAllDrafts = false,
): ProcurementSearchRequest {
    const current = PROCUREMENT_SCOPES.find((s) => s.id === scope)!;
    const created = toRange(a.createdDate);
    return {
        query: query.trim() || undefined,
        // Вкладка со своими статусами важнее выпадающего списка — он там и не показывается.
        statuses: current.statuses ?? (status ? [status] : undefined),
        mineOnly: scope === "drafts" && seesAllDrafts ? undefined : current.mineOnly,
        regNumber: a.regNumber.trim() || undefined,
        subject: a.subject.trim() || undefined,
        initiatorUserIds: a.initiatorIds.length ? a.initiatorIds : undefined,
        curatorUserIds: a.curatorIds.length ? a.curatorIds : undefined,
        methodIds: a.methodId ? [Number(a.methodId)] : undefined,
        subjectKind: a.subjectKind || undefined,
        amountFrom: parseAmount(a.amountFrom),
        amountTo: parseAmount(a.amountTo),
        createdFrom: created.from,
        createdTo: created.to,
        affiliatedOnly: a.affiliatedOnly || undefined,
        offBudgetOnly: a.offBudgetOnly || undefined,
    };
}

/** Дата-фильтр одной строкой для чипса. */
export function dateFilterText(v: DateFilterValue): string {
    if (v.mode === "exact" && v.exact) return v.exact;
    if (v.from || v.to) return `${v.from || "…"} – ${v.to || "…"}`;
    return v.exact || "";
}
