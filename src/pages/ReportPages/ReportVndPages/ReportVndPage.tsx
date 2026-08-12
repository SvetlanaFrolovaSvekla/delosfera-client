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
    Users as UsersIcon,
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

export function ReportVndPage() {
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

    const {granularity, setGranularity, dynamics, actualizationTrend, approvalPerformance, loading: periodLoading} =
        useVndReportPeriod();

    const {byUser, setByUser, workload, matrix, loading: workloadLoading} = useVndReportWorkload();

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
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                <div>
                    <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em] text-[#0f1b2d]">
                        Отчётность по ВНД
                    </h1>
                    <p className="m-0 mt-1 text-[13px] text-[#8b97ab]">
                        Сводная аналитика по документам, согласованию и актуализации
                    </p>
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
                            CSV
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

            {/* Эффективность согласования */}
            <h2 className="m-0 text-[16px] font-bold text-[#1c2740] mt-7 mb-3">Эффективность согласования</h2>
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
