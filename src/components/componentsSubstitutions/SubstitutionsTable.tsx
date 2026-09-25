/**
 * Список оформленных замещений, с переключателем видимости отменённых.
 *
 * Внешний вид — тот же, что и у таблицы "Пользователи" (UsersTable): сетка с
 * рамкой и скруглением на всей карточке, а не построчными рамками у нативной
 * <table>, — чтобы реестры в системе не расходились по виду один от другого.
 */
import {useTranslation} from "react-i18next";
import type {Substitution} from "@/service/dashboardService/dashboardService.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";

interface SubstitutionsTableProps {
    substitutions: Substitution[];
    showCancelled: boolean;
    onShowCancelledChange: (value: boolean) => void;
    busy: boolean;
    onCancel: (s: Substitution) => void;
}

const GRID_TEMPLATE = "1.4fr 1.4fr 1.2fr 1.6fr 0.9fr 0.7fr";

export function SubstitutionsTable({
                                       substitutions,
                                       showCancelled,
                                       onShowCancelledChange,
                                       busy,
                                       onCancel,
                                   }: SubstitutionsTableProps) {
    const {t} = useTranslation();

    return (
        <section className="flex flex-col gap-3 mt-[17px]">
            <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                    {t("substitutions.tableTitle", {count: substitutions.length}) /* `Оформленные замещения · ${substitutions.length}` */}
                </h2>
                <PlainCheckbox checked={showCancelled} onChange={onShowCancelledChange}>
                    {t("substitutions.showCancelled") /* показывать отменённые */}
                </PlainCheckbox>
            </div>

            <div className="bg-white border border-[#e9edf3] rounded-[14px]">
                <div className="overflow-x-auto">
                    {/* min-w-max, не w-full — см. пояснение в UsersTable: иначе браузер
                        занижает scrollWidth и до последней колонки не доскроллить. */}
                    <div className="min-w-max">
                        <div
                            className="grid gap-3 px-5 py-3 border-b border-[#eef2f7] bg-[#fafbfd] rounded-t-[14px] text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]"
                            style={{gridTemplateColumns: GRID_TEMPLATE}}
                        >
                            <div className="whitespace-nowrap">{t("substitutions.columnSubstituted") /* Кого замещают */}</div>
                            <div className="whitespace-nowrap">{t("substitutions.columnSubstitute") /* Замещающий */}</div>
                            <div className="whitespace-nowrap">{t("substitutions.columnPeriod") /* Период */}</div>
                            <div className="whitespace-nowrap">{t("substitutions.columnReason") /* Основание */}</div>
                            <div className="whitespace-nowrap">{t("substitutions.columnState") /* Состояние */}</div>
                            <div className="text-right">{""}</div>
                        </div>

                        {substitutions.length === 0 ? (
                            <div className="px-5 py-8 text-center text-[13px] text-[#8b97ab] rounded-b-[14px]">
                                {t("substitutions.empty") /* Замещения не оформлялись */}
                            </div>
                        ) : (
                            substitutions.map((s, index) => (
                                <div
                                    key={s.id}
                                    className={`group grid gap-3 items-center px-5 py-3 hover:bg-[#fbfcfe] transition ${
                                        index === substitutions.length - 1 ? "rounded-b-[14px]" : "border-b border-[#f3f6f9]"
                                    }`}
                                    style={{gridTemplateColumns: GRID_TEMPLATE}}
                                >
                                    <div className="min-w-0 truncate text-[13px] font-semibold text-[#1c2740]">
                                        {s.userName}
                                    </div>
                                    <div className="min-w-0 truncate text-[13px] text-[#26324a]">
                                        {s.substituteUserName}
                                    </div>
                                    <div className="whitespace-nowrap text-[12.5px] text-[#55617a]">
                                        {formatDate(s.startsOn)} — {formatDate(s.endsOn)}
                                    </div>
                                    <div className="min-w-0 truncate text-[12.5px] text-[#55617a]" title={s.reason ?? undefined}>
                                        {s.reason ?? "—"}
                                    </div>
                                    <div className="whitespace-nowrap">
                                        {s.isCancelled ? (
                                            <span className="text-[10.5px] font-semibold px-[9px] py-[2px] rounded-full text-[#c0392b] bg-[#fdeceb]">
                                                {t("substitutions.stateCancelled") /* отменено */}
                                            </span>
                                        ) : s.isActive ? (
                                            <span className="text-[10.5px] font-semibold px-[9px] py-[2px] rounded-full text-[#1a8a5f] bg-[#e5f7ee]">
                                                {t("substitutions.stateActive") /* действует */}
                                            </span>
                                        ) : (
                                            <span className="text-[10.5px] font-semibold px-[9px] py-[2px] rounded-full text-[#8b97ab] bg-[#eef2f7]">
                                                {t("substitutions.stateOutOfPeriod") /* вне периода */}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {!s.isCancelled && (
                                            <button
                                                type="button"
                                                onClick={() => onCancel(s)}
                                                disabled={busy}
                                                className="border-none bg-transparent p-0 text-[12px] text-[#c0392b] underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {t("substitutions.cancel") /* отменить */}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
