import {useEffect, useState} from "react";
import {CalendarClock, CircleCheck, Info, TriangleAlert} from "lucide-react";
import {
    obligationsService,
    BODY_TITLE, KIND_TITLE, PERIOD_STATUS_TITLE, PERIODICITY_TITLE, SELF_CLOSING,
    type AttentionRow, type Obligation, type ObligationPeriod, type PeriodStatus,
} from "@/service/obligationsService/obligationsService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    Badge, Cell, DataTable, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";

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

const STATUS_TONE: Record<PeriodStatus, BadgeTone> = {
    Fulfilled: "good",
    Pending: "info",
    Missed: "bad",
    Waived: "neutral",
};

export function ObligationsPage() {
    const [rows, setRows] = useState<Obligation[]>([]);
    const [attention, setAttention] = useState<AttentionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [opened, setOpened] = useState<Obligation | null>(null);
    const [periods, setPeriods] = useState<ObligationPeriod[]>([]);

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
        void load();
    }, []);

    const open = async (obligation: Obligation) => {
        setOpened(obligation);
        setPeriods(await obligationsService.periods(obligation.id));
    };

    const fulfil = async (periodId: number) => {
        await obligationsService.fulfil(periodId);
        await load();
        if (opened) setPeriods(await obligationsService.periods(opened.id));
    };

    const missed = attention.filter((a) => a.status === "Missed");
    const soon = attention.filter((a) => a.status === "Pending");

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Регулярные обязательства"
                description="Заседания комитетов, отчёты, пересмотр политик, график сдачи в НБКР"
            />

            {loading ? (
                <Loader label="Считаем сроки…"/>
            ) : (
                <>
                    {missed.length > 0 && (
                        <Panel
                            tone="bad"
                            icon={<TriangleAlert size={18} className="text-[#c0392b]"/>}
                            title={`Просрочено — ${missed.length}`}
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
                            title={`Срок в ближайшие две недели — ${soon.length}`}
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
                                Просроченного нет, ближайшие две недели свободны
                            </span>
                        </div>
                    )}

                    {rows.length === 0 ? (
                        <EmptyState
                            title="Обязательств нет"
                            description="Заведите первое: заседания комитета по рискам, отчёты службы рисков, пересмотр риск-аппетита."
                        />
                    ) : (
                        <DataTable
                            headers={["Обязательство", "Периодичность", "Ответственный", "Текущий период", "Срывов"]}
                        >
                            {rows.map((obligation) => (
                                <Row key={obligation.id} onClick={() => void open(obligation)}>
                                    <Cell strong>
                                        {obligation.title}
                                        {obligation.basis && (
                                            <span className="mt-0.5 block text-[11.5px] font-normal text-[#8593a8]">
                                                {obligation.basis}
                                            </span>
                                        )}
                                    </Cell>
                                    <Cell nowrap>
                                        {PERIODICITY_TITLE[obligation.periodicity]}
                                        <span className="mt-0.5 block text-[11.5px] text-[#8593a8]">
                                            {obligation.body
                                                ? BODY_TITLE[obligation.body]
                                                : KIND_TITLE[obligation.kind]}
                                        </span>
                                    </Cell>
                                    <Cell>{obligation.responsible ?? obligation.responsibleUnit ?? "—"}</Cell>
                                    <Cell nowrap>
                                        {obligation.current ? (
                                            <>
                                                <Badge tone={STATUS_TONE[obligation.current.status]}>
                                                    {PERIOD_STATUS_TITLE[obligation.current.status]}
                                                </Badge>
                                                <span className="mt-1 block font-mono text-[11.5px] text-[#8593a8]">
                                                    до {formatDate(obligation.current.dueDate)}
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
    return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[8px] border
                        border-white/70 bg-white px-3 py-2">
            <span className="text-[13.5px] font-medium text-[#101a2c]">{row.title}</span>
            <span className="text-[12.5px] text-[#8593a8]">
                {formatDate(row.periodStart)} — {formatDate(row.periodEnd)}
            </span>
            {row.responsible && (
                <span className="text-[12.5px] text-[#8593a8]">{row.responsible}</span>
            )}
            <span className={`ml-auto text-[12.5px] font-semibold
                ${tone === "bad" ? "text-[#c0392b]" : "text-[#b3730a]"}`}>
                {formatDaysLeft(row.daysLeft)}
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
    const selfClosing = obligation.kind === SELF_CLOSING;

    return (
        <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-[16px] font-semibold text-[#101a2c]">{obligation.title}</h2>
                    <p className="mt-1 text-[13px] text-[#8593a8]">
                        {PERIODICITY_TITLE[obligation.periodicity]}
                        {obligation.graceDays > 0 && ` · отсрочка ${obligation.graceDays} дн.`}
                        {obligation.basis && ` · ${obligation.basis}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-[9px] px-3 py-1.5 text-[13px] text-[#4d5a72] transition hover:bg-[#eef2f7]"
                >
                    Свернуть
                </button>
            </div>

            {selfClosing && (
                <p className="mb-3 flex items-start gap-2 rounded-[10px] bg-[#eaf0ff] px-3 py-2
                              text-[12.5px] text-[#2f68f5]">
                    <Info size={15} className="mt-0.5 shrink-0"/>
                    Период закрывается заседанием органа автоматически. Отмечать исполнение
                    вручную не нужно — достаточно завести заседание в разделе «Решения комитетов».
                </p>
            )}

            <DataTable headers={["Период", "Срок", "Состояние", "Чем закрыто", ""]}>
                {periods.map((period) => (
                    <Row key={period.id}>
                        <Cell mono>
                            {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                        </Cell>
                        <Cell mono>{formatDate(period.dueDate)}</Cell>
                        <Cell nowrap>
                            <Badge tone={STATUS_TONE[period.status]}>
                                {PERIOD_STATUS_TITLE[period.status]}
                            </Badge>
                            {period.isLate && (
                                <span className="ml-1.5 text-[11.5px] font-semibold text-[#b3730a]">
                                    с нарушением срока
                                </span>
                            )}
                        </Cell>
                        <Cell>
                            {period.meetingId
                                ? `Заседание № ${period.meetingId}`
                                : period.fulfilledBy ?? period.comment ?? "—"}
                        </Cell>
                        <Cell align="right">
                            {period.status === "Pending" && !selfClosing && (
                                <button
                                    type="button"
                                    onClick={() => onFulfil(period.id)}
                                    className="rounded-[8px] border border-[#e1e7ef] px-2.5 py-1 text-[12.5px]
                                               text-[#4d5a72] transition hover:border-[#1c7a4d] hover:text-[#1c7a4d]"
                                >
                                    Исполнено
                                </button>
                            )}
                        </Cell>
                    </Row>
                ))}
            </DataTable>
        </section>
    );
}
