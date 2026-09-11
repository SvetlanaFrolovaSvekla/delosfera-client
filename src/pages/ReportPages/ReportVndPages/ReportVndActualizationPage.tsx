import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileClock,
    Hourglass,
    RefreshCcw,
    ShieldAlert,
} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {colorAt} from "@/constants/reportPalette.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {ChartCard} from "@/components/componentsReport/ChartCard.tsx";
import {KpiCard} from "@/components/componentsReport/KpiCard.tsx";
import {DonutChart} from "@/components/componentsReport/DonutChart.tsx";
import {HorizontalBarList} from "@/components/componentsReport/HorizontalBarList.tsx";
import {TimeSeriesChart} from "@/components/componentsReport/TimeSeriesChart.tsx";
import {PeriodControl} from "@/components/componentsReport/PeriodControl.tsx";
import {useVndActualizationOverview} from "@/hooks/analyticsHooks/useVndActualizationOverview.ts";
import {useVndReportPeriod} from "@/hooks/analyticsHooks/useVndReport.ts";

/** Вкладка "Актуализация" страницы Аналитика → ВНД: статистика по срокам актуализации,
 * открытым циклам и заявкам на доступ к актуализации. Держит свой собственный шаг
 * группировки по периодам (PeriodControl) - независимо от того, что выбрано на вкладке "Все". */
export function ReportVndActualizationPage() {
    const {hasPermission} = useAuth();
    const canView = hasPermission(PermissionCode.ViewFullStatistics);

    const {overview, loading, error} = useVndActualizationOverview();
    const {granularity, setGranularity, actualizationTrend, loading: trendLoading} = useVndReportPeriod();

    if (!canView) {
        return (
            <EmptyState
                variant="error"
                title="Недостаточно прав"
                description="У вас нет доступа к странице отчётности по ВНД"
            />
        );
    }

    if (loading) {
        return <Loader label="Формируем статистику…"/>;
    }

    if (error || !overview) {
        return (
            <EmptyState
                variant="error"
                title="Не удалось загрузить статистику актуализации"
                description={error ?? undefined}
            />
        );
    }

    const bucketDonutData = [
        {label: "В норме", value: overview.normal, percent: pct(overview.normal, overview.trackedTotal), color: "#24a36b"},
        {label: "Срок приближается", value: overview.approaching, percent: pct(overview.approaching, overview.trackedTotal), color: "#b3730a"},
        {label: "Критично", value: overview.critical, percent: pct(overview.critical, overview.trackedTotal), color: "#e0483d"},
        {label: "Просрочено", value: overview.overdue, percent: pct(overview.overdue, overview.trackedTotal), color: "#c0392b"},
    ];

    return (
        <div className="w-full">
            {/* KPI-плашки */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5 mt-1">
                <KpiCard label="На контроле сроков" value={overview.trackedTotal} icon={CalendarClock} color="#4e57d6" bg="#ececfc"/>
                <KpiCard label="Просрочено" value={overview.overdue} icon={AlertTriangle} color="#c0392b" bg="#fdecea"/>
                <KpiCard label="Критично" value={overview.critical} icon={ShieldAlert} color="#e0483d" bg="#fdecea"/>
                <KpiCard label="Срок приближается" value={overview.approaching} icon={Clock} color="#b3730a" bg="#fbeecf"/>
                <KpiCard label="Открытых циклов" value={overview.openCycles} icon={RefreshCcw} color="#2f68f5" bg="#e9f0ff"/>
                <KpiCard label="Заявок в ожидании" value={overview.pendingRequests} icon={FileClock} color="#7a5ce0" bg="#efeafe"/>
                <KpiCard
                    label="Средний срок цикла"
                    value={`${overview.averageCycleDurationDays} дн.`}
                    icon={Hourglass}
                    color="#7a5ce0"
                    bg="#efeafe"
                    hint={`медиана: ${overview.medianCycleDurationDays} дн.`}
                />
                <KpiCard
                    label="С реальными изменениями"
                    value={`${overview.cyclesWithChangesRatePercent}%`}
                    icon={CheckCircle2}
                    color="#1c7a4d"
                    bg="#eafaf1"
                    hint="доля завершённых циклов"
                />
            </div>

            {/* Распределения */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title="Сроки актуализации" subtitle="Распределение действующих ВНД по близости к сроку">
                    <DonutChart data={bucketDonutData} centerLabel="документов"/>
                </ChartCard>
                <ChartCard title="Подразделения с наибольшим числом просрочек" subtitle="Критично + просрочено, по подразделению-разработчику">
                    <HorizontalBarList
                        data={overview.topOverdueDevelopers.map((d, i) => ({
                            label: d.label,
                            value: d.value,
                            percent: d.percent,
                            color: colorAt(i),
                        }))}
                    />
                </ChartCard>
            </div>

            {/* Длительность цикла по периодам */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-7 mb-3">
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">Длительность цикла актуализации по периодам</h2>
                <PeriodControl granularity={granularity} onGranularityChange={setGranularity}/>
            </div>
            <ChartCard title="Средняя длительность цикла" subtitle="От старта актуализации до публикации, дней" className="mb-4">
                {trendLoading ? (
                    <Loader label="Загрузка…" fullHeight={false}/>
                ) : (
                    <TimeSeriesChart
                        labels={actualizationTrend.map((d) => d.periodLabel)}
                        series={[
                            {
                                name: "Дней в среднем",
                                color: "#7a5ce0",
                                values: actualizationTrend.map((d) => d.averageDurationDays),
                                area: true,
                            },
                        ]}
                    />
                )}
            </ChartCard>

            {/* Заявки на доступ к актуализации */}
            <h2 className="m-0 text-[16px] font-bold text-[#1c2740] mt-7 mb-3">Заявки на актуализацию</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <MiniStatCard label="Ожидают решения" value={overview.pendingRequests} color="#7a5ce0"/>
                <MiniStatCard label="Одобрено" value={overview.approvedRequests} color="#1c7a4d"/>
                <MiniStatCard label="Отклонено" value={overview.rejectedRequests} color="#c0392b"/>
            </div>
        </div>
    );
}

function pct(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function MiniStatCard({label, value, color}: { label: string; value: number; color: string }) {
    return (
        <div className="rounded-2xl border border-[#e9edf3] bg-white px-4 py-[14px]">
            <div className="text-[22px] font-bold" style={{color}}>{value}</div>
            <div className="text-[12px] text-[#8b97ab] font-medium mt-[2px]">{label}</div>
        </div>
    );
}
