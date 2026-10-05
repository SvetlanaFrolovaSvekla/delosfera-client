import {useMemo, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {GitBranch, RotateCcw, Timer, Users as UsersIcon} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
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
 * Поиск работает по уже полученному отчёту: по названию этапа или согласующему.
 */

/** Сервер присылает единицу измерения русской строкой — подменяем на перевод. */
const SERVER_HOURS_UNIT = "раб.ч";

const THEAD = "bg-[#fafbfd] text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]";

function Panel({title, subtitle, count, className = "", children}: {
    title: string;
    subtitle?: string;
    count?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={`overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white ${className}`}>
            <div className="border-b border-[#eef2f7] px-5 py-3">
                <div className="flex items-center gap-2">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">{title}</h3>
                    {count !== undefined && (
                        <span className="rounded-full bg-[#f2f5f9] px-[7px] py-[1px] font-mono text-[11px] font-bold text-[#8b97ab]">
                            {count}
                        </span>
                    )}
                </div>
                {subtitle && <p className="m-0 mt-[3px] text-[12px] text-[#8b97ab]">{subtitle}</p>}
            </div>
            <div className="px-5 py-4">{children}</div>
        </section>
    );
}

function NoData({text}: { text: string }) {
    return <div className="flex items-center justify-center py-8 text-[12.5px] text-[#a3adbd]">{text}</div>;
}

function Kpi({label, value, color, hint}: { label: string; value: string | number; color: string; hint?: string }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">{label}</span>
            <span className="text-[27px] font-semibold leading-none tabular-nums" style={{color}}>{value}</span>
            {hint && <span className="text-[11.5px] text-[#a3adbd]">{hint}</span>}
        </div>
    );
}

export function ReportProcessMiningPage() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canView = hasPermission(PermissionCode.ViewFullStatistics);

    const {documentType, setDocumentType, templateId, setTemplateId, options, report, loading, error} =
        useProcessMining();

    const [search, setSearch] = useState("");
    const term = search.trim().toLowerCase();
    const match = (text: string) => !term || text.toLowerCase().includes(term);

    const variants = useMemo(
        () => (report?.variants ?? []).filter((v) => !term || v.steps.some(match) || match(v.signature)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [report, term],
    );
    const rework = useMemo(
        () => (report?.rework ?? []).filter((r) => r.occurrences > 0 && match(r.stepLabel)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [report, term],
    );
    const steps = useMemo(
        () => (report?.bottleneckSteps ?? []).filter((s) => match(s.stepLabel)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [report, term],
    );
    const participants = useMemo(
        () => (report?.bottleneckParticipants ?? []).filter((p) => match(p.label)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [report, term],
    );

    if (!canView) {
        return (
            <EmptyState
                variant="error"
                title={t("processMining.noAccessTitle")}
                description={t("processMining.noAccessDescription")}
            />
        );
    }

    const unit = !report?.durationUnit || report.durationUnit === SERVER_HOURS_UNIT
        ? t("processMining.unitWorkHours")
        : report.durationUnit;

    const hasFilter = documentType !== null || templateId !== null || search !== "";
    const reset = () => {
        setDocumentType(null);
        setTemplateId(null);
        setSearch("");
    };

    return (
        <div className="w-full">
            <div className="mb-4">
                <p className="mt-[7px] mb-0 text-[13px] text-[#8b97ab]">{t("processMining.subtitle")}</p>
            </div>

            {/* Фильтры */}
            <section className="mb-4 flex flex-wrap items-end gap-3 rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        {t("processMining.filters.documentType")}
                    </div>
                    <SelectDropdown
                        searchable
                        searchPlaceholder={t("processMining.filters.find")}
                        minWidth="220px"
                        options={[
                            {value: "", label: t("processMining.filters.allDocumentTypes")},
                            ...(options?.documentTypes ?? []).map((o) => ({value: String(o.id), label: o.label})),
                        ]}
                        value={documentType === null ? "" : String(documentType)}
                        onChange={(v) => setDocumentType(v === "" ? null : Number(v))}
                    />
                </div>
                <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        {t("processMining.filters.template")}
                    </div>
                    <SelectDropdown
                        searchable
                        searchPlaceholder={t("processMining.filters.find")}
                        minWidth="240px"
                        options={[
                            {value: "", label: t("processMining.filters.allTemplates")},
                            ...(options?.templates ?? []).map((o) => ({value: String(o.id), label: o.label})),
                        ]}
                        value={templateId === null ? "" : String(templateId)}
                        onChange={(v) => setTemplateId(v === "" ? null : Number(v))}
                    />
                </div>

                <SearchBar
                    variant="white"
                    value={search}
                    onChange={setSearch}
                    placeholder={t("processMining.searchPlaceholder")}
                    className="min-w-[240px] max-w-[380px]"
                />

                <div className="flex-1"/>

                <button type="button" onClick={reset} disabled={!hasFilter}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:cursor-default disabled:opacity-50">
                    <RotateCcw className="h-3.5 w-3.5"/>
                    {t("processMining.reset")}
                </button>
            </section>

            {loading ? (
                <Loader label={t("general.loading")} fullHeight={false}/>
            ) : error || !report ? (
                <EmptyState variant="error" title={t("processMining.loadError")}/>
            ) : report.overview.totalInstances === 0 ? (
                <div className="rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-10 text-center text-[13px] text-[#8b97ab]">
                    {t("processMining.emptyFilter")}
                </div>
            ) : (
                <>
                    {/* KPI */}
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <Kpi label={t("processMining.kpi.total")} value={report.overview.totalInstances} color={REPORT_UI.accent}/>
                        <Kpi label={t("processMining.kpi.completed")} value={report.overview.completedInstances} color="#1c7a4d"/>
                        <Kpi label={t("processMining.kpi.running")} value={report.overview.runningInstances} color="#2f68f5"/>
                        <Kpi label={t("processMining.kpi.variants")} value={report.overview.distinctVariants} color="#7a5ce0"/>
                        <Kpi
                            label={t("processMining.kpi.reworkRate")}
                            value={`${report.overview.reworkRatePercent}%`}
                            color={REPORT_UI.danger}
                            hint={t("processMining.kpi.reworkHint", {count: report.overview.reworkInstances})}
                        />
                        <Kpi
                            label={t("processMining.kpi.averageDuration")}
                            value={`${report.overview.averageDurationHours} ${unit}`}
                            color={REPORT_UI.warning}
                            hint={t("processMining.kpi.median", {value: report.overview.medianDurationHours, unit})}
                        />
                    </div>

                    {/* Варианты маршрута */}
                    <Panel
                        title={t("processMining.variants.title")}
                        subtitle={t("processMining.variants.subtitle")}
                        count={variants.length}
                        className="mb-4"
                    >
                        <VariantsList variants={variants} unit={unit} search={search} noData={t("processMining.noData")}/>
                    </Panel>

                    {/* Узкие места и возвраты */}
                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Panel
                            title={t("processMining.bottleneckSteps.title")}
                            subtitle={t("processMining.bottleneckSteps.subtitle", {unit})}
                            count={steps.length}
                        >
                            {steps.length === 0 ? <NoData text={t("processMining.noData")}/> : (
                                <BarList
                                    search={search}
                                    rows={steps.map((s, i) => ({
                                        label: s.stepLabel,
                                        value: s.averageWaitHours,
                                        text: `${s.averageWaitHours} ${unit}`,
                                        color: colorAt(i),
                                    }))}
                                />
                            )}
                        </Panel>
                        <Panel
                            title={t("processMining.rework.title")}
                            subtitle={t("processMining.rework.subtitle")}
                            count={rework.length}
                        >
                            <ReworkList rework={rework} search={search} noData={t("processMining.noData")}/>
                        </Panel>
                    </div>

                    {/* Детали по этапам */}
                    <Panel
                        title={t("processMining.stepsTable.title")}
                        subtitle={t("processMining.stepsTable.subtitle")}
                        count={steps.length}
                        className="mb-4"
                    >
                        <StepsTable steps={steps} unit={unit} search={search} noData={t("processMining.noData")}/>
                    </Panel>

                    {/* Узкие места по участникам */}
                    <Panel
                        title={t("processMining.participants.title")}
                        subtitle={t("processMining.participants.subtitle")}
                        count={participants.length}
                        className="mb-4"
                    >
                        <ParticipantsTable participants={participants} unit={unit} search={search}
                                           noData={t("processMining.noData")}/>
                    </Panel>
                </>
            )}
        </div>
    );
}

function BarList({rows, search}: {
    rows: Array<{ label: string; value: number; text: string; color: string }>;
    search: string;
}) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
        <div className="flex flex-col gap-3">
            {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="w-[150px] shrink-0 truncate text-[12.5px] text-[#3a4560]" title={r.label}>
                        <HighlightText text={r.label} query={search}/>
                    </span>
                    <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-[#f0f2f6]">
                        <div className="h-full rounded-full transition-all"
                             style={{width: `${Math.max((r.value / max) * 100, 2)}%`, background: r.color}}/>
                    </div>
                    <span className="w-[72px] shrink-0 text-right font-mono text-[12px] text-[#55617a]">{r.text}</span>
                </div>
            ))}
        </div>
    );
}

function VariantsList({variants, unit, search, noData}: {
    variants: ProcessPathVariant[];
    unit: string;
    search: string;
    noData: string;
}) {
    if (variants.length === 0) return <NoData text={noData}/>;
    const max = Math.max(...variants.map((v) => v.frequency), 1);

    return (
        <div className="flex flex-col gap-3">
            {variants.slice(0, 12).map((v, i) => (
                <div key={i} className="rounded-[12px] border border-[#eef2f7] bg-[#fbfcfe] px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <GitBranch className="h-3.5 w-3.5 shrink-0 text-[#a3adbd]"/>
                                {v.steps.length > 0 ? (
                                    v.steps.map((s, j) => (
                                        <span key={j} className="flex items-center gap-1.5">
                                            {j > 0 && <span className="text-[11px] text-[#c3ccd9]">→</span>}
                                            <span className="text-[12px] font-medium text-[#3a4560]">
                                                <HighlightText text={s} query={search}/>
                                            </span>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[12px] italic text-[#a3adbd]">{v.signature}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-none text-right">
                            <div className="text-[13px] font-bold tabular-nums text-[#1c2740]">{v.frequency}</div>
                            <div className="font-mono text-[10.5px] text-[#a3adbd]">{v.percent}%</div>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#f0f2f6]">
                            <div className="h-full rounded-full"
                                 style={{width: `${Math.max((v.frequency / max) * 100, 2)}%`, background: colorAt(i)}}/>
                        </div>
                        {v.averageDurationHours > 0 && (
                            <span className="shrink-0 font-mono text-[11px] text-[#8b97ab]">
                                ~{v.averageDurationHours} {unit}
                            </span>
                        )}
                        {v.reworkCount > 0 && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fbeae7] px-2 py-[1px] text-[11px] font-semibold text-[#c0392b]">
                                <RotateCcw className="h-3 w-3"/>
                                {v.reworkCount}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReworkList({rework, search, noData}: { rework: ProcessReworkStep[]; search: string; noData: string }) {
    if (rework.length === 0) return <NoData text={noData}/>;
    return (
        <div className="flex flex-col gap-3">
            {rework.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="w-[150px] shrink-0 truncate text-[12.5px] text-[#3a4560]" title={r.stepLabel}>
                        <HighlightText text={r.stepLabel} query={search}/>
                    </span>
                    <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-[#f0f2f6]">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.max(r.returnRatePercent, r.returns > 0 ? 3 : 0)}%`,
                                background: r.returnRatePercent > 25 ? "#c0392b" : r.returnRatePercent > 10 ? "#b3730a" : "#24a36b",
                            }}
                        />
                    </div>
                    <span className="w-[30px] shrink-0 text-right font-mono text-[12px] text-[#55617a]">{r.returns}</span>
                    <span className="w-[42px] shrink-0 text-right font-mono text-[11px] text-[#a3adbd]">
                        {r.returnRatePercent}%
                    </span>
                </div>
            ))}
        </div>
    );
}

function StepsTable({steps, unit, search, noData}: {
    steps: ProcessBottleneckStep[];
    unit: string;
    search: string;
    noData: string;
}) {
    const {t} = useTranslation();
    if (steps.length === 0) return <NoData text={noData}/>;
    return (
        <div className="-mx-5 -my-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
                <thead>
                <tr className={THEAD}>
                    <th className="px-5 py-2.5 text-left">{t("processMining.cols.step")}</th>
                    <th className="px-3 py-2.5 text-right">{t("processMining.cols.decisions")}</th>
                    <th className="px-3 py-2.5 text-right">{t("processMining.cols.average", {unit})}</th>
                    <th className="px-3 py-2.5 text-right">{t("processMining.cols.median")}</th>
                    <th className="px-3 py-2.5 text-right">{t("processMining.cols.max")}</th>
                    <th className="px-5 py-2.5 text-right">{t("processMining.cols.timeout")}</th>
                </tr>
                </thead>
                <tbody>
                {steps.map((s, i) => (
                    <tr key={i} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                        <td className="px-5 py-2.5 text-[#26324a]">
                            <div className="flex items-center gap-2">
                                <Timer className="h-3.5 w-3.5 shrink-0 text-[#a3adbd]"/>
                                <HighlightText text={s.stepLabel} query={search}/>
                            </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#55617a]">{s.samples}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#1c2740]">{s.averageWaitHours}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#55617a]">{s.medianWaitHours}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#55617a]">{s.maxWaitHours}</td>
                        <td className="px-5 py-2.5 text-right">
                            {s.timeoutRatePercent > 0 ? (
                                <span className="inline-flex rounded-full bg-[#fdf3e2] px-[9px] py-0.5 font-mono text-[12px] font-semibold text-[#b3730a]">
                                    {s.timeoutRatePercent}%
                                </span>
                            ) : (
                                <span className="font-mono text-[#a3adbd]">0%</span>
                            )}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function ParticipantsTable({participants, unit, search, noData}: {
    participants: ProcessBottleneckParticipant[];
    unit: string;
    search: string;
    noData: string;
}) {
    const {t} = useTranslation();
    if (participants.length === 0) return <NoData text={noData}/>;
    return (
        <div className="-mx-5 -my-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-[13px]">
                <thead>
                <tr className={THEAD}>
                    <th className="px-5 py-2.5 text-left">{t("processMining.cols.approver")}</th>
                    <th className="px-3 py-2.5 text-right">{t("processMining.cols.decisions")}</th>
                    <th className="px-3 py-2.5 text-right">{t("processMining.cols.average", {unit})}</th>
                    <th className="px-5 py-2.5 text-right">{t("processMining.cols.median")}</th>
                </tr>
                </thead>
                <tbody>
                {participants.slice(0, 15).map((p, i) => (
                    <tr key={i} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                        <td className="max-w-[260px] truncate px-5 py-2.5 text-[#26324a]" title={p.label}>
                            <div className="flex items-center gap-2">
                                <UsersIcon className="h-3.5 w-3.5 shrink-0 text-[#a3adbd]"/>
                                <HighlightText text={p.label} query={search}/>
                            </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#55617a]">{p.samples}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#1c2740]">{p.averageWaitHours}</td>
                        <td className="px-5 py-2.5 text-right font-mono text-[#55617a]">{p.medianWaitHours}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
