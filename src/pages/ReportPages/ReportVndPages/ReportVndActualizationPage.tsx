import {useTranslation} from "react-i18next";
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
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canView = hasPermission(PermissionCode.ViewFullStatistics);

    const {overview, loading, error} = useVndActualizationOverview();
    const {granularity, setGranularity, actualizationTrend, loading: trendLoading} = useVndReportPeriod();

    if (!canView) {
        return (
            <EmptyState
                variant="error"
                title={t("reportVndActualizationPage.accessDenied.title")}
                description={t("reportVndActualizationPage.accessDenied.description")}
            />
        );
    }

    if (loading) {
        return <Loader label={t("reportVndActualizationPage.loading")}/>;
    }

    if (error || !overview) {
        return (
            <EmptyState
                variant="error"
                title={t("reportVndActualizationPage.loadError.title")}
                description={error ?? undefined}
            />
        );
    }

    const bucketDonutData = [
        {label: t("reportVndActualizationPage.buckets.normal"), value: overview.normal, percent: pct(overview.normal, overview.trackedTotal), color: "#24a36b"},
        {label: t("reportVndActualizationPage.buckets.approaching"), value: overview.approaching, percent: pct(overview.approaching, overview.trackedTotal), color: "#b3730a"},
        {label: t("reportVndActualizationPage.buckets.critical"), value: overview.critical, percent: pct(overview.critical, overview.trackedTotal), color: "#e0483d"},
        {label: t("reportVndActualizationPage.buckets.overdue"), value: overview.overdue, percent: pct(overview.overdue, overview.trackedTotal), color: "#c0392b"},
    ];

    const loadingSectionLabel = t("reportVndActualizationPage.loadingSection");

    return (
        <div className="w-full">
            {/* KPI-плашки */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5 mt-1">
                <KpiCard label={t("reportVndActualizationPage.kpi.trackedTotal")} value={overview.trackedTotal} icon={CalendarClock} color="#4e57d6" bg="#ececfc"/>
                <KpiCard label={t("reportVndActualizationPage.kpi.overdue")} value={overview.overdue} icon={AlertTriangle} color="#c0392b" bg="#fdecea"/>
                <KpiCard label={t("reportVndActualizationPage.kpi.critical")} value={overview.critical} icon={ShieldAlert} color="#e0483d" bg="#fdecea"/>
                <KpiCard label={t("reportVndActualizationPage.kpi.approaching")} value={overview.approaching} icon={Clock} color="#b3730a" bg="#fbeecf"/>
                <KpiCard label={t("reportVndActualizationPage.kpi.openCycles")} value={overview.openCycles} icon={RefreshCcw} color="#2f68f5" bg="#e9f0ff"/>
                <KpiCard label={t("reportVndActualizationPage.kpi.pendingRequests")} value={overview.pendingRequests} icon={FileClock} color="#7a5ce0" bg="#efeafe"/>
                <KpiCard
                    label={t("reportVndActualizationPage.kpi.avgCycleDuration")}
                    value={t("reportVndActualizationPage.kpi.avgCycleDurationValue", {days: overview.averageCycleDurationDays})}
                    icon={Hourglass}
                    color="#7a5ce0"
                    bg="#efeafe"
                    hint={t("reportVndActualizationPage.kpi.avgCycleDurationHint", {days: overview.medianCycleDurationDays})}
                />
                <KpiCard
                    label={t("reportVndActualizationPage.kpi.withRealChanges")}
                    value={t("reportVndActualizationPage.kpi.withRealChangesValue", {percent: overview.cyclesWithChangesRatePercent})}
                    icon={CheckCircle2}
                    color="#1c7a4d"
                    bg="#eafaf1"
                    hint={t("reportVndActualizationPage.kpi.withRealChangesHint")}
                />
            </div>

            {/* Распределения */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title={t("reportVndActualizationPage.charts.deadlines.title")} subtitle={t("reportVndActualizationPage.charts.deadlines.subtitle")}>
                    <DonutChart data={bucketDonutData} centerLabel={t("reportVndActualizationPage.charts.documentsUnit")}/>
                </ChartCard>
                <ChartCard title={t("reportVndActualizationPage.charts.topOverdueDevelopers.title")} subtitle={t("reportVndActualizationPage.charts.topOverdueDevelopers.subtitle")}>
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
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">{t("reportVndActualizationPage.charts.durationSectionTitle")}</h2>
                <PeriodControl granularity={granularity} onGranularityChange={setGranularity}/>
            </div>
            <ChartCard title={t("reportVndActualizationPage.charts.duration.title")} subtitle={t("reportVndActualizationPage.charts.duration.subtitle")} className="mb-4">
                {trendLoading ? (
                    <Loader label={loadingSectionLabel} fullHeight={false}/>
                ) : (
                    <TimeSeriesChart
                        labels={actualizationTrend.map((d) => d.periodLabel)}
                        series={[
                            {
                                name: t("reportVndActualizationPage.charts.duration.seriesName"),
                                color: "#7a5ce0",
                                values: actualizationTrend.map((d) => d.averageDurationDays),
                                area: true,
                            },
                        ]}
                    />
                )}
            </ChartCard>

            {/* Заявки на доступ к актуализации */}
            <h2 className="m-0 text-[16px] font-bold text-[#1c2740] mt-7 mb-3">{t("reportVndActualizationPage.requests.sectionTitle")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <MiniStatCard label={t("reportVndActualizationPage.requests.pending")} value={overview.pendingRequests} color="#7a5ce0"/>
                <MiniStatCard label={t("reportVndActualizationPage.requests.approved")} value={overview.approvedRequests} color="#1c7a4d"/>
                <MiniStatCard label={t("reportVndActualizationPage.requests.rejected")} value={overview.rejectedRequests} color="#c0392b"/>
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