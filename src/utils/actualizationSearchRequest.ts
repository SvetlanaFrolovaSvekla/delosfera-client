// Общие кусочки построения VndSearchRequest для страницы "Планирование актуализации"
// (ActualizationPage) и модалки её экспорта в Excel (ActualizationExportModal) — вынесены сюда,
// а не оставлены локально в ActualizationPage.tsx, чтобы модалка могла их переиспользовать без
// циклического импорта (ActualizationPage рендерит модалку, модалке нужна та же логика фильтра).
import type {VndSearchRequest} from "@/service/vndService/vndServiceType.ts";
import type {DateFilterValue} from "@/components/componentsGeneral/datePickers/DateFilterGroup.tsx";

// "Планирование актуализации" — планируем сроки только для документов, которые в принципе уже
// существуют как ВНД: действующих (active) и ещё не действующих, но уже прошедших согласование
// хотя бы раз (onact/review/consol — в процессе актуализации, на согласовании или на консолидации,
// т.е. "ещё не действующие" в терминах DocumentStatusKey). Черновики (draft — ещё ни разу не
// отправленные на согласование) и архивные (arch) документы актуализировать нельзя/не нужно —
// поэтому они сюда никогда не должны попадать, независимо от прочих фильтров на странице.
export const ACTUALIZATION_PLANNING_STATUSES: VndSearchRequest["statuses"] = ["active", "onact", "review", "consol"];

export function toDateRangeFilter(v: DateFilterValue): VndSearchRequest["dueActualizationDate"] {
    if (v.mode === "exact") {
        return v.exact ? {exact: v.exact} : undefined;
    }
    return v.from || v.to
        ? {from: v.from || undefined, to: v.to || undefined}
        : undefined;
}
