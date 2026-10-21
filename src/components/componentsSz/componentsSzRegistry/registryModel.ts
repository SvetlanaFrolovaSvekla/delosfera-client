import type {SzStatusCode} from "@/service/szService/szService.ts";
import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {toDateRangeFilter} from "@/utils/dateUtils.ts";

/** Вкладки реестра СЗ. */
export type ScopeId = "all" | "inbox" | "assignments" | "originals" | "mine" | "drafts"
    | "approval" | "pending" | "signing" | "archive" | "favorites";

export const SCOPES: { id: ScopeId; statuses?: SzStatusCode[]; mineOnly?: boolean; favoritesOnly?: boolean }[] = [
    // Весь реестр
    {id: "all"},
    // Черновики
    {id: "drafts", statuses: ["Draft", "Withdrawn"], mineOnly: true},
    // СЗ, инициирую я
    {id: "mine", mineOnly: true},
    // СЗ, согласую я
    // Отозванная записка возвращается автору на правку - лежит вместе с черновиками.
    {id: "approval", statuses: ["OnApproval"], mineOnly: true},
    // Ждут регистрации
    {id: "pending", statuses: ["PendingRegistration"]},
    // На подписании
    {id: "signing", statuses: ["OnSigning"]},
    // Мои поручения
    {id: "assignments"},
    // Оригиналы на руках
    {id: "originals"},
    // Архив
    {id: "archive", statuses: ["Archived"]},
    // Избранное - личные отметки пользователя, в любом статусе
    {id: "favorites", favoritesOnly: true},
];

/** Статусы для фильтра реестра - в порядке хода записки. */
export const FILTER_STATUSES: SzStatusCode[] = [
    "Draft", "PendingRegistration", "OnApproval", "OnRevision", "OnSigning",
    "OnAddresseeDecision", "OnBoardReview", "OnExecution", "Executed",
    "Withdrawn", "Rejected", "Archived",
];

export function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
}

/** Вкладка со своим набором статусов (черновики, архив…) — фильтр по статусу к ней не применяется. */
export const scopeHasStatuses = (id: ScopeId): boolean => !!SCOPES.find((x) => x.id === id)?.statuses;

/** Вкладки, где фильтры не применяются: список формирует отдельная выдача. */
export const isFilterlessScope = (scope: ScopeId, dataScope: ScopeId): boolean =>
    dataScope === "inbox" || scope === "assignments" || scope === "originals";

/** Расширенный поиск реестра СЗ: код, тема, автор, дата регистрации, срок исполнения. */
export interface SzAdvancedFilters {
    regNumber: string;
    title: string;
    authorIds: string[];
    registeredDate: DateFilterValue;
    dueDate: DateFilterValue;
    /** Только записки на бумажном носителе. */
    paperOnly: boolean;
}

export const EMPTY_SZ_ADVANCED: SzAdvancedFilters = {
    regNumber: "",
    title: "",
    authorIds: [],
    registeredDate: EMPTY_DATE_FILTER,
    dueDate: EMPTY_DATE_FILTER,
    paperOnly: false,
};

const isDateFilterSet = (v: DateFilterValue): boolean => !!(v.exact || v.from || v.to);

/** Задано ли хоть одно поле расширенного поиска (для зелёной точки на кнопке). */
export const hasAdvancedFilters = (a: SzAdvancedFilters): boolean =>
    !!a.regNumber.trim() || !!a.title.trim() || a.authorIds.length > 0
    || isDateFilterSet(a.registeredDate) || isDateFilterSet(a.dueDate) || a.paperOnly;

/** Конкретный день → from = to = день; период → как задан (любая граница может быть пустой). */
function toRange(v: DateFilterValue): { from?: string; to?: string } {
    const r = toDateRangeFilter(v);
    if (!r) return {};
    if (r.exact) return {from: r.exact, to: r.exact};
    return {from: r.from ?? undefined, to: r.to ?? undefined};
}

/**
 * Чьи черновики показывать на вкладке «Черновики». «Черновики других пользователей» —
 * только администратору системы (сервер остальным вернёт пусто).
 */
export type DraftOwner = "mine" | "others";

export interface RegistryFilters {
    query: string;
    kindId: number | "";
    overdueOnly: boolean;
    statusFilter: SzStatusCode | "";
    /** Расширенный поиск; не задан — не применяется. */
    advanced?: SzAdvancedFilters;
    /** Вкладка «Черновики»: свои или чужие. По умолчанию — свои. */
    draftOwner?: DraftOwner;
}

/**
 * Параметры поиска/выгрузки реестра по вкладке и фильтрам.
 * Статусы: свои у вкладки, иначе выбранный в фильтре, иначе — по умолчанию сервера.
 */
export function buildSearchParams(scope: ScopeId, f: RegistryFilters) {
    const s = SCOPES.find((x) => x.id === scope)!;
    const a = f.advanced ?? EMPTY_SZ_ADVANCED;
    const registered = toRange(a.registeredDate);
    const due = toRange(a.dueDate);
    const othersDrafts = scope === "drafts" && f.draftOwner === "others";
    return {
        query: f.query.trim() || undefined,
        statuses: s.statuses ?? (f.statusFilter ? [f.statusFilter] : undefined),
        mineOnly: othersDrafts ? undefined : s.mineOnly,
        othersOnly: othersDrafts || undefined,
        favoritesOnly: s.favoritesOnly,
        kindIds: f.kindId ? [Number(f.kindId)] : undefined,
        overdueOnly: f.overdueOnly || undefined,
        regNumber: a.regNumber.trim() || undefined,
        title: a.title.trim() || undefined,
        authorIds: a.authorIds.length > 0 ? a.authorIds.map(Number) : undefined,
        registeredFrom: registered.from,
        registeredTo: registered.to,
        dueFrom: due.from,
        dueTo: due.to,
        paperCarrierOnly: a.paperOnly || undefined,
    };
}
