// Модель расширенного поиска реестра доверенностей: черновик полей панели,
// признак «что-то задано» и перевод в запрос /poa/search.
import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";
import {EMPTY_DATE_FILTER} from "@/constants/emptyDateFilter.ts";
import {displayToIso, toDateRangeFilter} from "@/utils/dateUtils.ts";
import type {PoaFilter, PoaHolderKind, PoaStatus} from "@/service/poaService/poaService.ts";

export interface PoaAdvancedFilters {
    regNumber: string;
    powers: string;
    grantorIds: number[];
    holderIds: number[];
    /** Часть ФИО представителя в доверенности - для сторонних лиц, у которых нет учётной записи. */
    holderName: string;
    holderKind: PoaHolderKind | "";
    allowsDelegation: boolean;
    /** Дата выдачи: день или период. */
    issuedDate: DateFilterValue;
    /** Дата окончания срока: день или период. */
    validToDate: DateFilterValue;
    /** «Действует на дату» (дд.мм.гггг): кто был вправе подписать в этот день. */
    validOn: string;
}

export const EMPTY_POA_ADVANCED: PoaAdvancedFilters = {
    regNumber: "",
    powers: "",
    grantorIds: [],
    holderIds: [],
    holderName: "",
    holderKind: "",
    allowsDelegation: false,
    issuedDate: EMPTY_DATE_FILTER,
    validToDate: EMPTY_DATE_FILTER,
    validOn: "",
};

export const isDateFilterSet = (v: DateFilterValue): boolean => !!(v.exact || v.from || v.to);

/** Задано ли хоть одно поле расширенного поиска (зелёная точка на кнопке). */
export const hasPoaAdvancedFilters = (a: PoaAdvancedFilters): boolean =>
    !!a.regNumber.trim() || !!a.powers.trim()
    || a.grantorIds.length > 0 || a.holderIds.length > 0 || !!a.holderName.trim()
    || a.holderKind !== "" || a.allowsDelegation
    || isDateFilterSet(a.issuedDate) || isDateFilterSet(a.validToDate)
    || !!a.validOn;

/** Конкретный день → from = to = день; период — как задан. */
function toRange(v: DateFilterValue): { from?: string; to?: string } {
    const r = toDateRangeFilter(v);
    if (!r) return {};
    if (r.exact) return {from: r.exact, to: r.exact};
    return {from: r.from ?? undefined, to: r.to ?? undefined};
}

/** Поля расширенного поиска → часть запроса /poa/search. */
export function poaAdvancedToFilter(a: PoaAdvancedFilters): PoaFilter {
    const issued = toRange(a.issuedDate);
    const validTo = toRange(a.validToDate);
    return {
        regNumber: a.regNumber.trim() || undefined,
        powers: a.powers.trim() || undefined,
        grantorUserIds: a.grantorIds.length ? a.grantorIds : undefined,
        holderUserIds: a.holderIds.length ? a.holderIds : undefined,
        holderName: a.holderName.trim() || undefined,
        holderKind: a.holderKind || undefined,
        allowsDelegation: a.allowsDelegation || undefined,
        issuedFrom: issued.from,
        issuedTo: issued.to,
        validToFrom: validTo.from,
        validToTo: validTo.to,
        validOn: a.validOn ? displayToIso(a.validOn) || undefined : undefined,
    };
}

/** Дата-фильтр одной строкой для чипса: «15.10.2026» или «01.10.2026 – 15.10.2026». */
export function dateFilterText(v: DateFilterValue): string {
    if (v.mode === "exact" && v.exact) return v.exact;
    if (v.from || v.to) return `${v.from || "…"} – ${v.to || "…"}`;
    return v.exact || "";
}

/** Сочетание условий, которое заведомо ничего не найдёт. Код - ключ подсказки poaRegistryPage.conflicts.*. */
export type PoaFilterConflict = "validOnNeverActive" | "employeesNotExternal" | "issuedAfterValidOn" | "expiredBeforeValidOn";

/**
 * Проверка противоречий в фильтрах: пустой список без объяснения выглядит как ошибка
 * реестра, а не как следствие выбранных условий.
 */
export function poaFilterConflicts(status: PoaStatus | "", a: PoaAdvancedFilters): PoaFilterConflict[] {
    const result: PoaFilterConflict[] = [];
    const validOn = a.validOn ? displayToIso(a.validOn) : "";

    // Проект и неподписанная ни в какой день не действовали.
    if (validOn && (status === "Draft" || status === "OnApproval")) result.push("validOnNeverActive");

    // В «Кому» выбирают сотрудников банка - у стороннего лица учётной записи нет.
    if (a.holderKind === "External" && a.holderIds.length > 0) result.push("employeesNotExternal");

    if (validOn) {
        const issued = toRange(a.issuedDate);
        const validTo = toRange(a.validToDate);
        // Выдана позже дня, на который спрашиваем, - в тот день её ещё не было. ISO сравниваются строками.
        if (issued.from && issued.from > validOn) result.push("issuedAfterValidOn");
        // Срок кончился раньше этого дня - в тот день она уже не действовала.
        if (validTo.to && validTo.to < validOn) result.push("expiredBeforeValidOn");
    }

    return result;
}
