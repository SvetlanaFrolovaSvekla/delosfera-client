import {useState} from "react";
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
import {useAuth} from "@/context/AuthContext.ts";
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
import {useVndReportOverview, useVndReportPeriod, useVndReportWorkload} from "@/hooks/analyticsHooks/useVndReport.ts";
import {vndAnalyticsService} from "@/service/analyticsService/vndAnalyticsService.ts";
import {toast} from "@/service/toastService.ts";

// Порядок статусов ВНД совпадает с backend enum VndStatus - используется, чтобы
// раскрасить круговую диаграмму статусов в те же цвета, что и бейджи статуса по всему приложению
const STATUS_KEY_BY_ID: Array<keyof typeof STATUS_META> = ["active", "onact", "review", "consol", "arch", "draft"];

/** embedded — страница показывается вкладкой раздела «Аналитика», без своей шапки. */
export function ReportVndPage({embedded}: {embedded?: boolean} = {}) {
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
            toast.error("Не удалось скачать отчёт", "Попробуйте ещё раз чуть позже");
        } finally {
            setExporting(false);
        }
    };

    if (!canView) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <EmptyState
                    variant="error"
                    title="Недостаточно прав"
                    description="У вас нет доступа к странице отчётности по ВНД"
                />
            </div>
        );
    }

    if (overviewLoading) {
        return <Loader label="Формируем отчёт…"/>;
    }

    if (overviewError || !overview) {
        return (
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10">
                <EmptyState variant="error" title="Не удалось загрузить отчётность" description={overviewError ?? undefined}/>
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

    return (
        <div className={embedded
            ? "w-full"
            : "w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]"}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                <div>
                    {!embedded && (
                        <>
                            <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em] text-[#0f1b2d]">
                                Отчётность по ВНД
                            </h1>
                            <p className="m-0 mt-1 text-[13px] text-[#8b97ab]">
                                Сводная аналитика по документам, согласованию и актуализации
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
                            {exporting ? "Формируем…" : "Скачать Excel"}
                        </button>
                        <button
                            onClick={() => handleExport("csv")}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] text-[13px] font-semibold cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-default transition-colors"
                        >
                            <Download className="w-4 h-4" strokeWidth={2}/>
                            Скачать CSV
                        </button>
                    </div>
                )}
            </div>

            {/* KPI-плашки */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
                <KpiCard label="Всего документов" value={overview.total} icon={Layers} color="#4e57d6" bg="#ececfc"/>
                <KpiCard label="Действующие" value={overview.active} icon={CheckCircle2} color={STATUS_META.active.color} bg={STATUS_META.active.bg}/>
                <KpiCard label="На актуализации" value={overview.onActualization} icon={Clock} color={STATUS_META.onact.color} bg={STATUS_META.onact.bg}/>
                <KpiCard label="На согласовании" value={overview.onReview} icon={ListChecks} color={STATUS_META.review.color} bg={STATUS_META.review.bg}/>
                <KpiCard label="На консолидации" value={overview.onConsolidation} icon={Layers} color={STATUS_META.consol.color} bg={STATUS_META.consol.bg}/>
                <KpiCard
                    label="Требуют внимания"
                    value={overview.requiresAttention}
                    icon={AlertTriangle}
                    color="#c0392b"
                    bg="#fdecea"
                    hint={`из них просрочено: ${overview.overdue}`}
                />
                <KpiCard label="Черновики" value={overview.draft} icon={FileEdit} color={STATUS_META.draft.color} bg={STATUS_META.draft.bg}/>
                <KpiCard label="В архиве" value={overview.archived} icon={Archive} color={STATUS_META.arch.color} bg={STATUS_META.arch.bg}/>
                <KpiCard label="Активных согласований" value={overview.approvalsInProgress} icon={Timer} color="#2f68f5" bg="#e9f0ff"/>
                <KpiCard
                    label="Средний срок согласования"
                    value={`${overview.averageApprovalDurationDays} дн.`}
                    icon={Gauge}
                    color="#7a5ce0"
                    bg="#efeafe"
                    hint={`решений по таймауту: ${overview.timeoutDecisionRatePercent}%`}
                />
            </div>

            {/* Распределения по справочникам */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title="Статусы документов" subtitle="Распределение ВНД по жизненному циклу">
                    <DonutChart data={statusDonutData} centerLabel="документов"/>
                </ChartCard>
                <ChartCard title="Виды документов" subtitle="Распределение по типам ВНД">
                    <DonutChart data={typeDonutData} centerLabel="документов"/>
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title="Топ подразделений-разработчиков" subtitle="По количеству ВНД">
                    <HorizontalBarList
                        data={developerDistribution.map((d, i) => ({label: d.label, value: d.value, percent: d.percent, color: colorAt(i)}))}
                    />
                </ChartCard>
                <ChartCard title="Уровни секретности" subtitle="Распределение документов">
                    <HorizontalBarList
                        data={securityLevelDistribution.map((d, i) => ({label: d.label, value: d.value, percent: d.percent, color: colorAt(i)}))}
                    />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard title="Топ рубрик классификатора" subtitle="По количеству привязанных ВНД">
                    <HorizontalBarList
                        data={rubricDistribution.map((d, i) => ({label: d.label, value: d.value, percent: d.percent, color: colorAt(i)}))}
                    />
                </ChartCard>
                <ChartCard title="Облако ключевых слов" subtitle="Самые часто используемые ключевые слова">
                    <KeywordCloud data={keywordCloud}/>
                </ChartCard>
            </div>

            {/* Динамика по периодам */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-7 mb-3">
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">Динамика по периодам</h2>
                <PeriodControl granularity={granularity} onGranularityChange={setGranularity}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <ChartCard
                    title="Жизненный цикл ВНД"
                    subtitle="Создано / отправлено на согласование / опубликовано / архивировано"
                >
                    {periodLoading ? (
                        <Loader label="Загрузка…" fullHeight={false}/>
                    ) : (
                        <TimeSeriesChart
                            labels={dynamicsLabels}
                            series={[
                                {name: "Создано", color: "#4e57d6", values: dynamics.map((d) => d.created), area: true},
                                {name: "На согласование", color: "#2f68f5", values: dynamics.map((d) => d.sentToApproval)},
                                {name: "Опубликовано", color: "#24a36b", values: dynamics.map((d) => d.published)},
                                {name: "Архивировано", color: "#c0392b", values: dynamics.map((d) => d.archived)},
                            ]}
                        />
                    )}
                </ChartCard>
                <ChartCard title="Циклы актуализации" subtitle="Запущено / опубликовано по периодам">
                    {periodLoading ? (
                        <Loader label="Загрузка…" fullHeight={false}/>
                    ) : (
                        <TimeSeriesChart
                            labels={actualizationLabels}
                            series={[
                                {name: "Запущено", color: "#b3730a", values: actualizationTrend.map((d) => d.started)},
                                {name: "Опубликовано", color: "#24a36b", values: actualizationTrend.map((d) => d.published), area: true},
                                {name: "С изменениями", color: "#7a5ce0", values: actualizationTrend.map((d) => d.publishedWithChanges)},
                            ]}
                        />
                    )}
                </ChartCard>
            </div>

            <ChartCard
                title="Подразделения × статусы"
                subtitle="Тепловая карта: сколько документов какого статуса у каждого подразделения-разработчика"
                className="mb-4"
            >
                {workloadLoading ? <Loader label="Загрузка…" fullHeight={false}/> : <StatusHeatmap items={matrix}/>}
            </ChartCard>
        </div>
    );
}

