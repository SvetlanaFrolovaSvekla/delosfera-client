import {GitBranch, RotateCcw, Timer, Users as UsersIcon} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {ChartCard} from "@/components/componentsReport/ChartCard.tsx";
import {HorizontalBarList} from "@/components/componentsReport/HorizontalBarList.tsx";
import {colorAt, REPORT_UI} from "@/constants/reportPalette.ts";
import {useProcessMining} from "@/hooks/analyticsHooks/useProcessMining.ts";
import type {
    ProcessBottleneckParticipant,
    ProcessBottleneckStep,
    ProcessPathVariant,
    ProcessReworkStep,
} from "@/service/analyticsService/processMiningServiceType.ts";

/**
 * Вкладка "Process mining" страницы Аналитика: добывает знание о фактическом ходе
 * маршрутов из их трейсов (MINE-1). Показывает реальные варианты маршрута с частотами,
 * узкие места по этапам и участникам, и долю возвратов/доработок по этапам. Фильтры —
 * тип документа и шаблон маршрута. Длительности считаются в рабочих часах банка.
 */
export function ReportProcessMiningPage() {
    const {hasPermission} = useAuth();
    const canView = hasPermission(PermissionCode.ViewFullStatistics);

    const {documentType, setDocumentType, templateId, setTemplateId, options, report, loading, error} =
        useProcessMining();

    if (!canView) {
        return (
            <EmptyState
                variant="error"
                title="Недостаточно прав"
                description="У вас нет доступа к аналитике process mining"
            />
        );
    }

    const unit = report?.durationUnit ?? "раб.ч";

    return (
        <div className="w-full">
            {/* Фильтры */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-1 mb-3">
                <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">Ход маршрутов согласования</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select
                        value={documentType}
                        onChange={setDocumentType}
                        placeholder="Все типы документов"
                        options={options?.documentTypes ?? []}
                    />
                    <Select
                        value={templateId}
                        onChange={setTemplateId}
                        placeholder="Все шаблоны"
                        options={options?.templates ?? []}
                    />
                </div>
            </div>

            {loading ? (
                <Loader label="Загрузка…" fullHeight={false}/>
            ) : error || !report ? (
                <EmptyState
                    variant="error"
                    title="Не удалось загрузить отчёт"
                    description={error ?? undefined}
                />
            ) : report.overview.totalInstances === 0 ? (
                <div className="rounded-2xl border border-[#e9edf3] bg-white px-4 py-10 text-center text-[13px] text-[#8b97ab]">
                    По заданному фильтру запущенных маршрутов не найдено
                </div>
            ) : (
                <>
                    {/* KPI */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                        <Kpi label="Маршрутов" value={report.overview.totalInstances} color={REPORT_UI.accent}/>
                        <Kpi label="Завершено" value={report.overview.completedInstances} color={REPORT_UI.brand}/>
                        <Kpi label="В процессе" value={report.overview.runningInstances} color="#2f68f5"/>
                        <Kpi label="Вариантов" value={report.overview.distinctVariants} color="#7a5ce0"/>
                        <Kpi
                            label="Доля возвратов"
                            value={`${report.overview.reworkRatePercent}%`}
                            color={REPORT_UI.danger}
                            hint={`${report.overview.reworkInstances} маршрутов с доработками`}
                        />
                        <Kpi
                            label="Средний срок"
                            value={`${report.overview.averageDurationHours} ${unit}`}
                            color={REPORT_UI.warning}
                            hint={`медиана ${report.overview.medianDurationHours} ${unit}`}
                        />
                    </div>

                    {/* Варианты маршрута */}
                    <ChartCard
                        title="Варианты маршрута"
                        subtitle="Фактические последовательности пройденных этапов и как часто они встречаются"
                        className="mb-4"
                    >
                        <VariantsTable variants={report.variants} unit={unit}/>
                    </ChartCard>

                    {/* Узкие места */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <ChartCard
                            title="Узкие места: этапы"
                            subtitle={`Среднее время ожидания решения на этапе, ${unit}`}
                        >
                            <HorizontalBarList
                                data={report.bottleneckSteps.map((s, i) => ({
                                    label: s.stepLabel,
                                    value: s.averageWaitHours,
                                    color: colorAt(i),
                                }))}
                                valueSuffix={` ${unit}`}
                            />
                        </ChartCard>
                        <ChartCard
                            title="Возвраты и доработки по этапам"
                            subtitle="Где маршрут разворачивало назад — отклонение или вето на этапе"
                        >
                            <ReworkTable rework={report.rework}/>
                        </ChartCard>
                    </div>

                    {/* Детали узких мест по этапам */}
                    <ChartCard
                        title="Этапы: сроки рассмотрения"
                        subtitle="Среднее / медиана / максимум ожидания и доля решений по таймауту"
                        className="mb-4"
                    >
                        <BottleneckStepsTable steps={report.bottleneckSteps} unit={unit}/>
                    </ChartCard>

                    {/* Узкие места по участникам */}
                    <ChartCard
                        title="Узкие места: участники"
                        subtitle="Согласующие с наибольшим средним временем на решение"
                        className="mb-4"
                    >
                        <ParticipantsTable participants={report.bottleneckParticipants} unit={unit}/>
                    </ChartCard>
                </>
            )}
        </div>
    );
}

function Select({
                    value,
                    onChange,
                    placeholder,
                    options,
                }: {
    value: number | null;
    onChange: (v: number | null) => void;
    placeholder: string;
    options: {id: number; label: string}[];
}) {
    return (
        <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            className="h-9 px-3 rounded-[10px] border border-[#e5e9f0] bg-white text-[12.5px] text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb] focus:outline-none focus:border-[#4e57d6]"
        >
            <option value="">{placeholder}</option>
            {options.map((o) => (
                <option key={o.id} value={o.id}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

function Kpi({label, value, color, hint}: {label: string; value: string | number; color: string; hint?: string}) {
    return (
        <div className="rounded-2xl border border-[#e9edf3] bg-white px-4 py-[14px]">
            <div className="text-[20px] font-bold leading-tight" style={{color}}>
                {value}
            </div>
            <div className="text-[12px] text-[#8b97ab] font-medium mt-[3px]">{label}</div>
            {hint && <div className="text-[10.5px] text-[#a3adbd] mt-[2px]">{hint}</div>}
        </div>
    );
}

function VariantsTable({variants, unit}: {variants: ProcessPathVariant[]; unit: string}) {
    if (variants.length === 0) {
        return <div className="flex items-center justify-center text-[12.5px] text-[#a3adbd] py-8">Нет данных</div>;
    }
    const max = Math.max(...variants.map((v) => v.frequency), 1);

    return (
        <div className="flex flex-col gap-3">
            {variants.slice(0, 12).map((v, i) => (
                <div key={i} className="rounded-[12px] border border-[#eef2f7] bg-[#fbfcfe] px-3 py-[10px]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <GitBranch className="w-3.5 h-3.5 text-[#a3adbd] shrink-0"/>
                                {v.steps.length > 0 ? (
                                    v.steps.map((s, j) => (
                                        <span key={j} className="flex items-center gap-1.5">
                                            {j > 0 && <span className="text-[#c3ccd9] text-[11px]">→</span>}
                                            <span className="text-[12px] text-[#3a4560] font-medium">{s}</span>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[12px] text-[#a3adbd] italic">{v.signature}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-none text-right">
                            <div className="text-[13px] font-bold text-[#1c2740]">{v.frequency}</div>
                            <div className="text-[10.5px] text-[#a3adbd] font-mono">{v.percent}%</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-[7px] rounded-full bg-[#f0f2f6] overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{width: `${Math.max((v.frequency / max) * 100, 2)}%`, background: colorAt(i)}}
                            />
                        </div>
                        {v.averageDurationHours > 0 && (
                            <span className="text-[11px] font-mono text-[#8b97ab] shrink-0">
                                ~{v.averageDurationHours} {unit}
                            </span>
                        )}
                        {v.reworkCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#c0392b] shrink-0">
                                <RotateCcw className="w-3 h-3"/>
                                {v.reworkCount}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReworkTable({rework}: {rework: ProcessReworkStep[]}) {
    const rows = rework.filter((r) => r.occurrences > 0);
    if (rows.length === 0) {
        return <div className="flex items-center justify-center text-[12.5px] text-[#a3adbd] py-8">Нет данных</div>;
    }
    return (
        <div className="flex flex-col gap-3">
            {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-[12.5px] text-[#3a4560] w-[150px] shrink-0 truncate" title={r.stepLabel}>
                        {r.stepLabel}
                    </span>
                    <div className="flex-1 h-[9px] rounded-full bg-[#f0f2f6] overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.max(r.returnRatePercent, r.returns > 0 ? 3 : 0)}%`,
                                background: r.returnRatePercent > 25 ? "#c0392b" : r.returnRatePercent > 10 ? "#b3730a" : "#24a36b",
                            }}
                        />
                    </div>
                    <span className="text-[12px] font-mono text-[#55617a] w-[30px] text-right shrink-0">{r.returns}</span>
                    <span className="text-[11px] font-mono text-[#a3adbd] w-[42px] text-right shrink-0">
                        {r.returnRatePercent}%
                    </span>
                </div>
            ))}
        </div>
    );
}

function BottleneckStepsTable({steps, unit}: {steps: ProcessBottleneckStep[]; unit: string}) {
    if (steps.length === 0) {
        return <div className="flex items-center justify-center text-[12.5px] text-[#a3adbd] py-8">Нет данных</div>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
                <thead>
                <tr className="border-b border-[#e9edf3]">
                    <th className="text-left text-[11.5px] font-semibold text-[#8b97ab] pb-2 pr-3">Этап</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Решений</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Ср., {unit}</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Медиана</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Макс.</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 pl-2">Таймаут</th>
                </tr>
                </thead>
                <tbody>
                {steps.map((s, i) => (
                    <tr key={i} className="border-b border-[#f2f5f9] last:border-none">
                        <td className="py-[9px] pr-3 text-[12.5px] text-[#3a4560]">
                            <div className="flex items-center gap-2">
                                <Timer className="w-3.5 h-3.5 text-[#a3adbd] shrink-0"/>
                                {s.stepLabel}
                            </div>
                        </td>
                        <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{s.samples}</td>
                        <td className="text-right text-[12.5px] font-mono font-semibold text-[#1c2740] px-2">{s.averageWaitHours}</td>
                        <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{s.medianWaitHours}</td>
                        <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{s.maxWaitHours}</td>
                        <td className="text-right text-[12.5px] font-mono text-[#55617a] pl-2">{s.timeoutRatePercent}%</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function ParticipantsTable({participants, unit}: {participants: ProcessBottleneckParticipant[]; unit: string}) {
    if (participants.length === 0) {
        return <div className="flex items-center justify-center text-[12.5px] text-[#a3adbd] py-8">Нет данных</div>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
                <thead>
                <tr className="border-b border-[#e9edf3]">
                    <th className="text-left text-[11.5px] font-semibold text-[#8b97ab] pb-2 pr-3">Согласующий</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Решений</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 px-2">Ср., {unit}</th>
                    <th className="text-right text-[11.5px] font-semibold text-[#8b97ab] pb-2 pl-2">Медиана</th>
                </tr>
                </thead>
                <tbody>
                {participants.slice(0, 15).map((p, i) => (
                    <tr key={i} className="border-b border-[#f2f5f9] last:border-none">
                        <td className="py-[9px] pr-3 text-[12.5px] text-[#3a4560] max-w-[260px] truncate" title={p.label}>
                            <div className="flex items-center gap-2">
                                <UsersIcon className="w-3.5 h-3.5 text-[#a3adbd] shrink-0"/>
                                {p.label}
                            </div>
                        </td>
                        <td className="text-right text-[12.5px] font-mono text-[#55617a] px-2">{p.samples}</td>
                        <td className="text-right text-[12.5px] font-mono font-semibold text-[#1c2740] px-2">{p.averageWaitHours}</td>
                        <td className="text-right text-[12.5px] font-mono text-[#55617a] pl-2">{p.medianWaitHours}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
