import {Users as UsersIcon} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {ChartCard} from "@/components/componentsReport/ChartCard.tsx";
import {TimeSeriesChart} from "@/components/componentsReport/TimeSeriesChart.tsx";
import {PeriodControl} from "@/components/componentsReport/PeriodControl.tsx";
import {useVndReportPeriod, useVndReportWorkload} from "@/hooks/analyticsHooks/useVndReport.ts";
import {useMyTimeoutApprovals} from "@/hooks/analyticsHooks/useMyTimeoutApprovals.ts";
import type {TaskStagePhase} from "@/service/tasksVndService/tasksServiceTypes.ts";

/** Вкладка "Согласования" страницы Аналитика → ВНД: общая эффективность и сроки
 * согласования, загрузка согласующих подразделений/пользователей (переехали сюда из вкладки
 * "Все" — здесь им самое место, рядом друг с другом), и персональные показатели текущего
 * пользователя (переехали из вкладки "Актуализация" — просрочка согласования не про сроки
 * актуализации документа, а про сам процесс согласования). Держит свой собственный шаг
 * группировки по периодам (PeriodControl) — независимо от того, что выбрано на вкладке "Все". */
export function ReportVndApprovalsPage() {
    const {hasPermission} = useAuth();
    const canView = hasPermission(PermissionCode.ViewFullStatistics);

    const {granularity, setGranularity, approvalPerformance, loading: periodLoading} = useVndReportPeriod();
    const {byUser, setByUser, workload, loading: workloadLoading} = useVndReportWorkload();
    const {summary: myTimeout, loading: myTimeoutLoading, error: myTimeoutError} = useMyTimeoutApprovals();

    if (!canView) {
        return (
            <EmptyState
                variant="error"
                title="Недостаточно прав"
                description="У вас нет доступа к странице отчётности по ВНД"
            />
        );
    }

    return (
        <div className="w-full">
            {/* Эффективность согласования */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-1 mb-3">
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">Эффективность согласования</h2>
                <PeriodControl granularity={granularity} onGranularityChange={setGranularity}/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-4 mb-4">
                <ChartCard title="Итоги за период" subtitle={`${approvalPerformance?.totalProcesses ?? 0} процессов`}>
                    {periodLoading || !approvalPerformance ? (
                        <Loader label="Загрузка…" fullHeight={false}/>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <MiniStat label="Согласовано" value={approvalPerformance.approved} color="#1c7a4d"/>
                            <MiniStat label="Отклонено" value={approvalPerformance.rejected} color="#c0392b"/>
                            <MiniStat label="Отозвано" value={approvalPerformance.cancelled} color="#8b97ab"/>
                            <MiniStat label="В процессе" value={approvalPerformance.inProgress} color="#2f68f5"/>
                            <MiniStat label="Доля успешных" value={`${approvalPerformance.approvalRatePercent}%`} color="#4e57d6"/>
                            <MiniStat label="С доработками" value={`${approvalPerformance.revisionRatePercent}%`} color="#b3730a"/>
                            <MiniStat label="Средний срок" value={`${approvalPerformance.averageDurationDays} дн.`} color="#7a5ce0"/>
                            <MiniStat label="Медианный срок" value={`${approvalPerformance.medianDurationDays} дн.`} color="#7a5ce0"/>
                        </div>
                    )}
                </ChartCard>
                <ChartCard title="Средняя длительность согласования" subtitle="По периодам, дней">
                    {periodLoading || !approvalPerformance ? (
                        <Loader label="Загрузка…" fullHeight={false}/>
                    ) : (
                        <TimeSeriesChart
                            labels={approvalPerformance.durationTrend.map((p) => p.periodLabel)}
                            series={[
                                {
                                    name: "Дней в среднем",
                                    color: "#4e57d6",
                                    values: approvalPerformance.durationTrend.map((p) => p.value),
                                    area: true,
                                },
                            ]}
                        />
                    )}
                </ChartCard>
            </div>

            {/* Загрузка согласующих */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-7 mb-3">
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">Загрузка согласующих</h2>
                <div className="inline-flex items-center rounded-[10px] border border-[#e5e9f0] bg-[#f6f8fb] p-[3px] gap-[2px]">
                    <button
                        onClick={() => setByUser(false)}
                        className={`px-[10px] py-[5px] rounded-[8px] text-[11.5px] font-semibold cursor-pointer border-none ${
                            !byUser ? "bg-white text-[#4e57d6] shadow-sm" : "bg-transparent text-[#8b97ab] hover:text-[#3a4560]"
                        }`}
                    >
                        По подразделениям
                    </button>
                    <button
                        onClick={() => setByUser(true)}
                        className={`px-[10px] py-[5px] rounded-[8px] text-[11.5px] font-semibold cursor-pointer border-none ${
                            byUser ? "bg-white text-[#4e57d6] shadow-sm" : "bg-transparent text-[#8b97ab] hover:text-[#3a4560]"
                        }`}
                    >
                        По согласующим
                    </button>
                </div>
            </div>

            <ChartCard
                title={byUser ? "Топ согласующих по доле решений по таймауту" : "Подразделения — узкие места согласования"}
                subtitle="Чем выше доля решений по таймауту, тем больше подразделение тормозит согласование"
                className="mb-4"
            >
                {workloadLoading ? (
                    <Loader label="Загрузка…" fullHeight={false}/>
                ) : (
                    <WorkloadTable items={workload} byUser={byUser}/>
                )}
            </ChartCard>

            {/* Мои показатели — персональная сводка по просрочкам согласования текущего
                пользователя. */}
            <h2 className="m-0 text-[16px] font-bold text-[#1c2740] mt-7 mb-3">Мои показатели</h2>
            {myTimeoutLoading ? (
                <Loader label="Загрузка…" fullHeight={false}/>
            ) : myTimeoutError || !myTimeout ? (
                <EmptyState
                    variant="error"
                    title="Не удалось загрузить сводку по просрочкам"
                    description={myTimeoutError ?? undefined}
                />
            ) : (
                <>
                    <p className="mt-0 mb-3 text-[13px] text-[#8b97ab]">
                        Согласования, которые вы не успели рассмотреть в срок — решение по ним было зачтено
                        автоматически по истечении времени на рассмотрение
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <MiniStatCard label="Просрочено в этом месяце" value={myTimeout.thisMonthCount} color="#c0392b"/>
                        <MiniStatCard label="Просрочено в этом году" value={myTimeout.thisYearCount} color="#b3730a"/>
                        <MiniStatCard label="Просрочено всего" value={myTimeout.totalCount} color="#4e57d6"/>
                    </div>
                    {myTimeout.items.length === 0 ? (
                        <div className="rounded-2xl border border-[#e9edf3] bg-white px-4 py-6 text-center text-[13px] text-[#8b97ab] mb-4">
                            Просрочек согласования не было
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-[#e9edf3] bg-white overflow-hidden mb-4">
                            {myTimeout.items.map((item, i) => (
                                <div
                                    key={`${item.vndId}-${item.phase}-${item.decidedAt}`}
                                    className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-[#f0f2f6]" : ""}`}
                                >
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold text-[#1c2740] truncate">
                                            {item.vndCode} — {item.vndTitle}
                                        </div>
                                        <div className="text-[11.5px] text-[#8b97ab] mt-0.5">
                                            {PHASE_LABELS[item.phase]}
                                        </div>
                                    </div>
                                    <div className="flex-none text-[12px] text-[#8b97ab]">
                                        {formatDecidedAt(item.decidedAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function MiniStat({label, value, color}: { label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-[12px] bg-[#f6f8fb] px-3 py-[10px]">
            <div className="text-[17px] font-bold" style={{color}}>
                {value}
            </div>
            <div className="text-[11.5px] text-[#8b97ab] font-medium mt-[2px]">{label}</div>
        </div>
    );
}

function WorkloadTable({
                            items,
                            byUser,
                        }: {
    items: ReturnType<typeof useVndReportWorkload>["workload"];
    byUser: boolean;
}) {
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center text-[12.5px] text-[#a3adbd] py-8">
                Нет данных
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
                <thead>
                <tr className="border-b border-[#e9edf3]">
                    <th className="text-left text-[11.5px] font-semibold text-[#8b97ab] pb-2 pr-3">
                        {byUser ? "Согласующий" : "Подразделение"}
                    </th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Этапов</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Ожидают</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Ср. время, ч</th>
                    <th className="text-left text-[11.5px] font-semibold text-[#8b97ab] pb-2 pl-3 w-[160px]">По таймауту</th>
                </tr>
                </thead>
                <tbody>
                {items.slice(0, 15).map((item, i) => {
                    const label = byUser ? item.approverLabel ?? item.orgUnitLabel : item.orgUnitLabel;
                    return (
                        <tr key={i} className="border-b border-[#f2f5f9] last:border-none">
                            <td className="py-[9px] pr-3 text-[12.5px] text-[#3a4560] max-w-[220px] truncate" title={label}>
                                <div className="flex items-center gap-2">
                                    <UsersIcon className="w-3.5 h-3.5 text-[#a3adbd] shrink-0"/>
                                    {label}
                                </div>
                            </td>
                            <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{item.totalStages}</td>
                            <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{item.pending}</td>
                            <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{item.averageDecisionHours}</td>
                            <td className="pl-3 py-[9px]">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-[7px] rounded-full bg-[#f0f2f6] overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(item.timeoutRatePercent, 100)}%`,
                                                background: item.timeoutRatePercent > 25 ? "#c0392b" : item.timeoutRatePercent > 10 ? "#b3730a" : "#24a36b",
                                            }}
                                        />
                                    </div>
                                    <span className="text-[11.5px] font-mono text-[#55617a] w-[40px] text-right shrink-0">
                                        {item.timeoutRatePercent}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

const PHASE_LABELS: Record<TaskStagePhase, string> = {
    primary: "Первичное согласование",
    repeat: "Повторное согласование",
    final: "Финальная выдержка",
};

function formatDecidedAt(iso: string): string {
    return new Date(iso).toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"});
}

function MiniStatCard({label, value, color}: { label: string; value: number; color: string }) {
    return (
        <div className="rounded-2xl border border-[#e9edf3] bg-white px-4 py-[14px]">
            <div className="text-[22px] font-bold" style={{color}}>{value}</div>
            <div className="text-[12px] text-[#8b97ab] font-medium mt-[2px]">{label}</div>
        </div>
    );
}
