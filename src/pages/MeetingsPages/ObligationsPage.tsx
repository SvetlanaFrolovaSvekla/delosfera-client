import {useTranslation} from "react-i18next";
import {toast} from "@/service/toastService.ts";
/**
 * Регулярные обязательства банка.
 *
 * Сверху — просроченное и горящее, потому что это единственное, ради чего сюда
 * заходят. Полный перечень ниже: он нужен раз в квартал, когда обязательства
 * пересматривают.
 *
 * Обязательства-заседания закрываются сами и кнопки исполнения не имеют: заседание
 * либо заведено в системе, либо нет, и вторая отметка об этом же только разошлась
 * бы с повесткой.
 */
import React, {useEffect, useState} from "react";
import {CalendarClock, CircleCheck, Download, Info, TriangleAlert} from "lucide-react";
import {
    obligationsService,
    SELF_CLOSING,
    type AttentionRow, type Obligation, type ObligationPeriod, type PeriodStatus,
} from "@/service/obligationsService/obligationsService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    Badge, Cell, DataTable, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";

const STATUS_TONE: Record<PeriodStatus, BadgeTone> = {
    Fulfilled: "good",
    Pending: "info",
    Missed: "bad",
    Waived: "neutral",
};

export function ObligationsPage() {
    const {t} = useTranslation();
    const [rows, setRows] = useState<Obligation[]>([]);
    const [attention, setAttention] = useState<AttentionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [opened, setOpened] = useState<Obligation | null>(null);
    const [periods, setPeriods] = useState<ObligationPeriod[]>([]);
    const [exporting, setExporting] = useState(false);

    const doExport = async () => {
        setExporting(true);
        const toastId = toast.loading(t("obligations.toast.exporting"));
        try {
            await obligationsService.exportRegistry();
            toast.update(toastId, {variant: "success", title: t("obligations.toast.exported"), duration: 4500});
        } catch {
            toast.update(toastId, {
                variant: "error",
                title: t("obligations.toast.exportFailed"),
                description: t("meetings.toast.tryAgain"),
                duration: 6000,
            });
        } finally {
            setExporting(false);
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const [list, urgent] = await Promise.all([
                obligationsService.list(),
                obligationsService.attention(14),
            ]);
            setRows(list);
            setAttention(urgent);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, []);

    const open = async (obligation: Obligation) => {
        setOpened(obligation);
        setPeriods(await obligationsService.periods(obligation.id));
    };

    const fulfil = async (periodId: number) => {
        try {
            await obligationsService.fulfil(periodId);
            toast.success(t("obligations.toast.fulfilled"));
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            toast.error(t("obligations.toast.fulfilFailed"), message);
            return;
        }
        await load();
        if (opened) setPeriods(await obligationsService.periods(opened.id));
    };

    const missed = attention.filter((a) => a.status === "Missed");
    const soon = attention.filter((a) => a.status === "Pending");

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px] flex flex-col gap-4">
            <PageHeader
                title={t("obligations.title")}
                description={t("obligations.description")}
                actions={(
                    <button
                        type="button"
                        onClick={() => void doExport()}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border border-[#e5e9f0] bg-white
                                   text-[13px] font-semibold text-[#3a4560] cursor-pointer hover:bg-[#f6f8fb]
                                   disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Download className="w-[17px] h-[17px]" strokeWidth={2}/>
                        {exporting ? t("obligations.exporting") : t("obligations.export")}
                    </button>
                )}
            />

            {loading ? (
                <Loader label={t("obligations.loading")}/>
            ) : (
                <>
                    {missed.length > 0 && (
                        <Panel
                            tone="bad"
                            icon={<TriangleAlert size={18} className="text-[#c0392b]"/>}
                            title={t("obligations.missedTitle", {count: missed.length})}
                        >
                            {missed.map((row) => (
                                <AttentionLine key={row.periodId} row={row} tone="bad"/>
                            ))}
                        </Panel>
                    )}

                    {soon.length > 0 && (
                        <Panel
                            tone="warn"
                            icon={<CalendarClock size={18} className="text-[#b3730a]"/>}
                            title={t("obligations.soonTitle", {count: soon.length})}
                        >
                            {soon.map((row) => (
                                <AttentionLine key={row.periodId} row={row} tone="warn"/>
                            ))}
                        </Panel>
                    )}

                    {missed.length === 0 && soon.length === 0 && (
                        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#cfe6da]
                                        bg-[#e6f4ec] px-4 py-3">
                            <CircleCheck size={18} className="text-[#1c7a4d]"/>
                            <span className="text-[14px] font-medium text-[#1c4d35]">
                                {t("obligations.allClear")}
                            </span>
                        </div>
                    )}

                    {rows.length === 0 ? (
                        <EmptyState
                            title={t("obligations.emptyTitle")}
                            description={t("obligations.emptyDesc")}
                        />
                    ) : (
                        <DataTable
                            headers={[
                                t("obligations.columns.obligation"),
                                t("obligations.columns.periodicity"),
                                t("obligations.columns.responsible"),
                                t("obligations.columns.currentPeriod"),
                                t("obligations.columns.missed"),
                            ]}
                        >
                            {rows.map((obligation) => (
                                <Row key={obligation.id} onClick={() => void open(obligation)}>
                                    <Cell strong>
                                        {obligation.title}
                                        {obligation.basis && (
                                            <span className="mt-0.5 block text-[11.5px] font-normal text-[#8b97ab]">
                                                {obligation.basis}
                                            </span>
                                        )}
                                    </Cell>
                                    <Cell nowrap>
                                        {t(`obligations.periodicity.${obligation.periodicity}`)}
                                        <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                                            {obligation.body
                                                ? t(`obligations.bodies.${obligation.body}`)
                                                : t(`obligations.kinds.${obligation.kind}`)}
                                        </span>
                                    </Cell>
                                    <Cell>{obligation.responsible ?? obligation.responsibleUnit ?? "—"}</Cell>
                                    <Cell nowrap>
                                        {obligation.current ? (
                                            <>
                                                <Badge tone={STATUS_TONE[obligation.current.status]}>
                                                    {t(`obligations.periodStatus.${obligation.current.status}`)}
                                                </Badge>
                                                <span className="mt-1 block font-mono text-[11.5px] text-[#8b97ab]">
                                                    {t("obligations.until", {date: formatDate(obligation.current.dueDate)})}
                                                </span>
                                            </>
                                        ) : "—"}
                                    </Cell>
                                    <Cell mono align="right">
                                        {obligation.missedCount > 0 ? (
                                            <span className="font-semibold text-[#c0392b]">
                                                {obligation.missedCount}
                                            </span>
                                        ) : "0"}
                                    </Cell>
                                </Row>
                            ))}
                        </DataTable>
                    )}
                </>
            )}

            {opened && (
                <PeriodsPanel
                    obligation={opened}
                    periods={periods}
                    onClose={() => setOpened(null)}
                    onFulfil={fulfil}
                />
            )}
        </div>
    );
}

function Panel({tone, icon, title, children}: {
    tone: "bad" | "warn";
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    const style = tone === "bad"
        ? "border-[#f2c9c2] bg-[#fbeae7]"
        : "border-[#f0dcc0] bg-[#fdf8ee]";

    return (
        <section className={`rounded-[14px] border p-4 ${style}`}>
            <div className="mb-2.5 flex items-center gap-2">
                {icon}
                <h2 className={`text-[14px] font-semibold ${tone === "bad" ? "text-[#c0392b]" : "text-[#7a5407]"}`}>
                    {title}
                </h2>
            </div>
            <div className="flex flex-col gap-1.5">{children}</div>
        </section>
    );
}

function AttentionLine({row, tone}: {row: AttentionRow; tone: "bad" | "warn"}) {
    const {t} = useTranslation();
    return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[8px] border
                        border-white/70 bg-white px-3 py-2">
            <span className="text-[13.5px] font-medium text-[#1c2740]">{row.title}</span>
            <span className="text-[12.5px] text-[#8b97ab]">
                {formatDate(row.periodStart)} — {formatDate(row.periodEnd)}
            </span>
            {row.responsible && (
                <span className="text-[12.5px] text-[#8b97ab]">{row.responsible}</span>
            )}
            <span className={`ml-auto text-[12.5px] font-semibold
                ${tone === "bad" ? "text-[#c0392b]" : "text-[#b3730a]"}`}>
                {formatDaysLeft(row.daysLeft, t)}
            </span>
        </div>
    );
}

function PeriodsPanel({obligation, periods, onClose, onFulfil}: {
    obligation: Obligation;
    periods: ObligationPeriod[];
    onClose: () => void;
    onFulfil: (periodId: number) => void;
}) {
    const {t} = useTranslation();
    const selfClosing = obligation.kind === SELF_CLOSING;

    return (
        <section className="rounded-2xl border border-[#eef2f7] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="m-0 text-[16px] font-semibold text-[#1c2740]">{obligation.title}</h2>
                    <p className="mt-1 text-[13px] text-[#8b97ab]">
                        {t(`obligations.periodicity.${obligation.periodicity}`)}
                        {obligation.graceDays > 0 && ` · ${t("obligations.grace", {count: obligation.graceDays})}`}
                        {obligation.basis && ` · ${obligation.basis}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-8 rounded-[9px] border-none bg-transparent px-3 text-[12.5px] font-semibold text-[#55617a] cursor-pointer transition hover:bg-[#f2f5f9]"
                >
                    {t("obligations.collapse")}
                </button>
            </div>

            {selfClosing && (
                <p className="mb-3 flex items-start gap-2 rounded-[10px] bg-[#ececfc] px-3 py-2
                              text-[12.5px] text-[#4e57d6]">
                    <Info size={15} className="mt-0.5 shrink-0"/>
                    {t("obligations.selfClosingNote")}
                </p>
            )}

            <DataTable headers={[
                t("obligations.periods.period"),
                t("obligations.periods.due"),
                t("obligations.periods.state"),
                t("obligations.periods.closedBy"),
                "",
            ]}>
                {periods.map((period) => (
                    <Row key={period.id}>
                        <Cell mono>
                            {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                        </Cell>
                        <Cell mono>{formatDate(period.dueDate)}</Cell>
                        <Cell nowrap>
                            <Badge tone={STATUS_TONE[period.status]}>
                                {t(`obligations.periodStatus.${period.status}`)}
                            </Badge>
                            {period.isLate && (
                                <span className="ml-1.5 text-[11.5px] font-semibold text-[#b3730a]">
                                    {t("obligations.periods.late")}
                                </span>
                            )}
                        </Cell>
                        <Cell>
                            {period.meetingId
                                ? t("obligations.periods.meeting", {id: period.meetingId})
                                : period.fulfilledBy ?? period.comment ?? "—"}
                        </Cell>
                        <Cell align="right">
                            {period.status === "Pending" && !selfClosing && (
                                <button
                                    type="button"
                                    onClick={() => onFulfil(period.id)}
                                    className="h-7 rounded-lg border border-[#e5e9f0] bg-white px-2.5 text-[12px] font-semibold
                                               text-[#55617a] cursor-pointer transition hover:border-[#c9e6d5] hover:bg-[#eef8f2] hover:text-[#1c7a4d]"
                                >
                                    {t("obligations.periods.fulfil")}
                                </button>
                            )}
                        </Cell>
                    </Row>
                ))}
            </DataTable>
        </section>
    );
}
