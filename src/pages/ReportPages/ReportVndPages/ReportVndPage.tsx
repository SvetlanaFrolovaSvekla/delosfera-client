import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {vndAnalyticsService} from "@/service/analyticsService/vndAnalyticsService.ts";
import {toast} from "@/service/toastService.ts";
import {useVndReportOverview, useVndReportPeriod, useVndReportWorkload} from "@/hooks/analyticsHooks/useVndReport.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {colorAt} from "@/constants/reportPalette.ts";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {ChartCard} from "@/components/componentsReport/ChartCard.tsx";
import {KpiCard} from "@/components/componentsReport/KpiCard.tsx";
import {DonutChart} from "@/components/componentsReport/DonutChart.tsx";
import {HorizontalBarList} from "@/components/componentsReport/HorizontalBarList.tsx";
import {TimeSeriesChart} from "@/components/componentsReport/TimeSeriesChart.tsx";
import {StatusHeatmap} from "@/components/componentsReport/StatusHeatmap.tsx";
import {KeywordCloud} from "@/components/componentsReport/KeywordCloud.tsx";
import {PeriodControl} from "@/components/componentsReport/PeriodControl.tsx";

import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    Clock,
    Download,
    FileEdit,
    Gauge,
    Layers,
    ListChecks,
    Timer,
} from "lucide-react";

// Порядок статусов ВНД совпадает с backend enum VndStatus - используется, чтобы
// раскрасить круговую диаграмму статусов в те же цвета, что и бейджи статуса по всему приложению
const STATUS_KEY_BY_ID: Array<keyof typeof STATUS_META> = ["active", "onact", "review", "consol", "arch", "draft"];

/** embedded — страница показывается вкладкой раздела «Аналитика», без своей шапки. */
export function ReportVndPage({embedded}: {embedded?: boolean} = {}) {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canView = hasPermission(PermissionCode.ViewFullStatistics);
    const canExport = hasPermission(PermissionCode.ExportFullStatisticsReport);

    const {
        overview,
        statusDistribution,
        typeDistribution,
        developerDistribution,
        securityLevelDistribution,
        rubricDistribution,
        keywordCloud,
        loading: overviewLoading,
        error: overviewError,
    } = useVndReportOverview();

    const {granularity, setGranularity, dynamics, actualizationTrend, loading: periodLoading} =
        useVndReportPeriod();

    // Эффективность согласования и загрузка согласующих переехали в отдельную вкладку
    // "Согласования" (см. ReportVndApprovalsPage.tsx) — здесь остаётся только тепловая карта
    // "Подразделения × статусы", она про статусы документов, а не про сам процесс согласования.
    const {matrix, loading: workloadLoading} = useVndReportWorkload();

    const [exporting, setExporting] = useState(false);

    const handleExport = async (format: "csv" | "xlsx") => {
        setExporting(true);
        try {
            if (format === "xlsx") {
                // Шаг группировки берём тот же, что выбран на странице: иначе
                // «Динамика» в файле разошлась бы с графиком на экране.
                await vndAnalyticsService.downloadExportXlsx({granularity});
            } else {
                await vndAnalyticsService.downloadExportCsv();
            }
        } catch {
            toast.error(t("reportVndPage.export.error.title"), t("reportVndPage.export.error.description"));
        } finally {
            setExporting(false);
        }
    };

    if (!canView) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <EmptyState
                    variant="error"
                    title={t("reportVndPage.accessDenied.title")}
                    description={t("reportVndPage.accessDenied.description")}
                />
            </div>
        );
    }

    if (overviewLoading) {
        return <Loader label={t("reportVndPage.loading")}/>;
    }

    if (overviewError || !overview) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <EmptyState
                    variant="error"
                    title={t("reportVndPage.loadError.title")}
                    description={overviewError ?? undefined}
                />
            </div>
        );
    }

    const statusDonutData = statusDistribution.map((p) => {
        const key = p.id !== null ? STATUS_KEY_BY_ID[p.id] : undefined;
        const meta = key ? STATUS_META[key] : undefined;
        return {
            label: p.label,
            value: p.value,
            percent: p.percent,
            color: meta?.color ?? "#8b97ab",
        };
    });

    const typeDonutData = typeDistribution.map((p, i) => ({
        label: p.label,
        value: p.value,
        percent: p.percent,
        color: colorAt(i),
    }));

    const dynamicsLabels = dynamics.map((d) => d.periodLabel);
    const actualizationLabels = actualizationTrend.map((d) => d.periodLabel);
    const documentsUnit = t("reportVndPage.charts.documentsUnit");
    const loadingSectionLabel = t("reportVndPage.loadingSection");

    return (
        <div className={embedded
            ? "w-full"
            : "w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]"}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                <div>
                    {!embedded && (
                        <>
                            <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em] text-[#0f1b2d]">
                                {t("reportVndPage.header.title")}
                            </h1>
                            <p className="m-0 mt-1 text-[13px] text-[#8b97ab]">
                                {t("reportVndPage.header.description")}
                            </p>
                        </>
                    )}
                </div>
                {canExport && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleExport("xlsx")}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[#4e57d6] text-white text-[13px] font-semibold cursor-pointer border-none hover:bg-[#3f47c4] disabled:opacity-60 disabled:cursor-default transition-colors"
                        >
                            <Download className="w-4 h-4" strokeWidth={2}/>
                            {exporting ? t("reportVndPage.export.xlsxLoading") : t("reportVndPage.export.xlsx")}
                        </button>
                        <button
                            onClick={() => handleExport("csv")}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] text-[13px] font-semibold cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-default transition-colors"
                        >
                            <Download className="w-4 h-4" strokeWidth={2}/>
                            {t("reportVndPage.export.csv")}
                        </button>
                    </div>
                )}
            </div>

            {/* KPI-плашки */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
                <KpiCard label={t("reportVndPage.kpi.total")} value={overview.total} icon={Layers} color="#4e57d6" bg="#ececfc"/>
                <KpiCard label={t("reportVndPage.kpi.active")} value={overview.active} icon={CheckCircle2} color={STATUS_META.active.color} bg={STATUS_META.active.bg}/>
                <KpiCard label={t("reportVndPage.kpi.onActualization")} value={overview.onActualization} icon={Clock} color={STATUS_META.onact.color} bg={STATUS_META.onact.bg}/>
                <KpiCard label={t("reportVndPage.kpi.onReview")} value={overview.onReview} icon={ListChecks} color={STATUS_META.review.color} bg={STATUS_META.review.bg}/>
                <KpiCard label={t("reportVndPage.kpi.onConsolidation")} value={overview.onConsolidation} icon={Layers} color={STATUS_META.consol.color} bg={STATUS_META.consol.bg}/>
                <KpiCard
                    label={t("reportVndPage.kpi.requiresAttention")}
                    value={overview.requiresAttention}
                    icon={AlertTriangle}
                    color="#c0392b"
                    bg="#fdecea"
                    hint={t("reportVndPage.kpi.requiresAttentionHint", {count: overview.overdue})}
                />
                <KpiCard label={t("reportVndPage.kpi.draft")} value={overview.draft} icon={FileEdit} color={STATUS_META.draft.color} bg={STATUS_META.draft.bg}/>
                <KpiCard label={t("reportVndPage.kpi.archived")} value={overview.archived} icon={Archive} color={STATUS_META.arch.color} bg={STATUS_META.arch.bg}/>
                <KpiCard label={t("reportVndPage.kpi.approvalsInProgress")} value={overview.approvalsInProgress} icon={Timer} color="#2f68f5" bg="#e9f0ff"/>
                <KpiCard
                    label={t("reportVndPage.kpi.avgApprovalDuration")}
                    value={t("reportVndPage.kpi.avgApprovalDurationValue", {days: overview.averageApprovalDurationDays})}
                    icon={Gauge}
                    color="#7a5ce0"
                    bg="#efeafe"
                    hint={t("reportVndPage.kpi.avgApprovalDurationHint", {percent: overview.timeoutDecisionRatePercent})}
                />
            </div>

            {/* Распределения по справочникам */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title={t("reportVndPage.charts.statusDistribution.title")} subtitle={t("reportVndPage.charts.statusDistribution.subtitle")}>
                    <DonutChart data={statusDonutData} centerLabel={documentsUnit}/>
                </ChartCard>
                <ChartCard title={t("reportVndPage.charts.typeDistribution.title")} subtitle={t("reportVndPage.charts.typeDistribution.subtitle")}>
                    <DonutChart data={typeDonutData} centerLabel={documentsUnit}/>
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title={t("reportVndPage.charts.topDevelopers.title")} subtitle={t("reportVndPage.charts.topDevelopers.subtitle")}>
                    <HorizontalBarList
                        data={developerDistribution.map((d, i) => ({label: d.label, value: d.value, percent: d.percent, color: colorAt(i)}))}
                    />
                </ChartCard>
                <ChartCard title={t("reportVndPage.charts.securityLevels.title")} subtitle={t("reportVndPage.charts.securityLevels.subtitle")}>
                    <HorizontalBarList
                        data={securityLevelDistribution.map((d, i) => ({label: d.label, value: d.value, percent: d.percent, color: colorAt(i)}))}
                    />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title={t("reportVndPage.charts.topRubrics.title")} subtitle={t("reportVndPage.charts.topRubrics.subtitle")}>
                    <HorizontalBarList
                        data={rubricDistribution.map((d, i) => ({label: d.label, value: d.value, percent: d.percent, color: colorAt(i)}))}
                    />
                </ChartCard>
                <ChartCard title={t("reportVndPage.charts.keywordCloud.title")} subtitle={t("reportVndPage.charts.keywordCloud.subtitle")}>
                    <KeywordCloud data={keywordCloud}/>
                </ChartCard>
            </div>

            {/* Динамика по периодам */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-7 mb-3">
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">{t("reportVndPage.charts.dynamicsSectionTitle")}</h2>
                <PeriodControl granularity={granularity} onGranularityChange={setGranularity}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard
                    title={t("reportVndPage.charts.lifecycle.title")}
                    subtitle={t("reportVndPage.charts.lifecycle.subtitle")}
                >
                    {periodLoading ? (
                        <Loader label={loadingSectionLabel} fullHeight={false}/>
                    ) : (
                        <TimeSeriesChart
                            labels={dynamicsLabels}
                            series={[
                                {name: t("reportVndPage.charts.lifecycle.created"), color: "#4e57d6", values: dynamics.map((d) => d.created), area: true},
                                {name: t("reportVndPage.charts.lifecycle.sentToApproval"), color: "#2f68f5", values: dynamics.map((d) => d.sentToApproval)},
                                {name: t("reportVndPage.charts.lifecycle.published"), color: "#24a36b", values: dynamics.map((d) => d.published)},
                                {name: t("reportVndPage.charts.lifecycle.archived"), color: "#c0392b", values: dynamics.map((d) => d.archived)},
                            ]}
                        />
                    )}
                </ChartCard>
                <ChartCard title={t("reportVndPage.charts.actualization.title")} subtitle={t("reportVndPage.charts.actualization.subtitle")}>
                    {periodLoading ? (
                        <Loader label={loadingSectionLabel} fullHeight={false}/>
                    ) : (
                        <TimeSeriesChart
                            labels={actualizationLabels}
                            series={[
                                {name: t("reportVndPage.charts.actualization.started"), color: "#b3730a", values: actualizationTrend.map((d) => d.started)},
                                {name: t("reportVndPage.charts.actualization.published"), color: "#24a36b", values: actualizationTrend.map((d) => d.published), area: true},
                                {name: t("reportVndPage.charts.actualization.publishedWithChanges"), color: "#7a5ce0", values: actualizationTrend.map((d) => d.publishedWithChanges)},
                            ]}
                        />
                    )}
                </ChartCard>
            </div>

            <ChartCard
                title={t("reportVndPage.charts.workload.title")}
                subtitle={t("reportVndPage.charts.workload.subtitle")}
                className="mb-4"
            >
                {workloadLoading ? <Loader label={loadingSectionLabel} fullHeight={false}/> : <StatusHeatmap items={matrix}/>}
            </ChartCard>
        </div>
    );
}