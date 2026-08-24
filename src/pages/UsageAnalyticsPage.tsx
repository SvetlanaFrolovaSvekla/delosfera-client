import {useEffect, useMemo, useState} from "react";
import {Download} from "lucide-react";
import {
    usageReport, downloadUsageCsv, PERIODS,
    type UsageEmployee, type UsageReport,
} from "@/service/usageService/usageService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    Cell, DataTable, FilterChip, Row, formatDateTime,
} from "@/components/componentsGeneral/DataTable.tsx";

/**
 * Посещения портала.
 *
 * Показатели, дни, разделы и поимённый список — одним запросом. Шесть обращений
 * подряд означали бы шесть разных мгновений: цифры в шапке расходились бы с
 * таблицей под ними.
 *
 * Ни разу не заходившие входят в тот же список, а не лежат отдельной вкладкой.
 * Они и есть главный вопрос к отчёту: молчание подразделения читают как
 * «замечаний нет», а обычно это «мы не начинали».
 */

type Filter = "all" | "visited" | "never";

export function UsageAnalyticsPage() {
    const [days, setDays] = useState(30);
    const [report, setReport] = useState<UsageReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        usageReport(days)
            .then((data) => {
                if (!cancelled) setReport(data);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [days]);

    const employees = useMemo(() => {
        if (!report) return [];

        const needle = search.trim().toLowerCase();

        return report.employees.filter((e) => {
            if (filter === "visited" && e.opens === 0) return false;
            if (filter === "never" && e.opens > 0) return false;
            if (!needle) return true;

            // Ищем по всему, чем человека опознают: имя, должность,
            // подразделение. Набирают обычно фамилию, но иногда отдел.
            return `${e.fullName} ${e.position ?? ""} ${e.orgUnit ?? ""}`
                .toLowerCase()
                .includes(needle);
        });
    }, [report, filter, search]);

    const visitedCount = report?.employees.filter((e) => e.opens > 0).length ?? 0;
    const neverCount = (report?.employees.length ?? 0) - visitedCount;

    const save = async () => {
        setSaving(true);
        try {
            await downloadUsageCsv(days);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Посещения портала"
                description="Сколько сотрудников пользуется системой, какими разделами и кто ещё не заходил"
                actions={
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-[10px] border border-[#e1e7ef] px-4 py-2
                                   text-[14px] text-[#4d5a72] transition hover:border-[#2f68f5]
                                   hover:text-[#2f68f5] disabled:opacity-60"
                    >
                        <Download size={16}/>
                        {saving ? "Готовим…" : "Выгрузить в CSV"}
                    </button>
                }
            />

            <div className="flex flex-wrap gap-2">
                {PERIODS.map((p) => (
                    <FilterChip key={p.days} active={days === p.days} onClick={() => setDays(p.days)}>
                        {p.title}
                    </FilterChip>
                ))}
            </div>

            {loading || !report ? (
                <Loader label="Считаем…"/>
            ) : (
                <>
                    {/* Показатели в строку: их читают слева направо как одну фразу —
                        «столько-то из стольких, это столько процентов». */}
                    <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-[14px] border
                                    border-[#e1e7ef] bg-white px-6 py-4">
                        <Figure
                            value={`${report.summary.reached} из ${report.summary.enabled}`}
                            label="Охват за период"
                        />
                        <Figure value={`${report.summary.share}%`} label="Доля справочника"/>
                        <Figure value={report.summary.totalOpens} label="Открытий разделов"/>
                        <Figure value={report.summary.today} label="Сегодня"/>
                        <Figure value={report.summary.week} label="За неделю"/>
                        <Figure
                            value={report.summary.neverVisited}
                            label="Ни разу не заходили"
                            alert={report.summary.neverVisited > 0}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                        <DailyChart days={report.byDay}/>
                        <Sections sections={report.sections}/>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по ФИО, должности или подразделению"
                            className="w-[380px] rounded-[9px] border border-[#e1e7ef] px-3 py-2
                                       text-[13px] outline-none transition focus:border-[#2f68f5]"
                        />

                        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                            Все
                        </FilterChip>
                        <FilterChip
                            active={filter === "visited"}
                            onClick={() => setFilter("visited")}
                            count={visitedCount}
                        >
                            Заходили
                        </FilterChip>
                        <FilterChip
                            active={filter === "never"}
                            onClick={() => setFilter("never")}
                            count={neverCount}
                        >
                            Ни разу
                        </FilterChip>
                    </div>

                    {employees.length === 0 ? (
                        <EmptyState
                            title="Никого не нашлось"
                            description="По выбранным условиям сотрудников нет."
                        />
                    ) : (
                        <DataTable
                            headers={[
                                "Сотрудник",
                                "Подразделение",
                                {title: "Дней с посещениями", align: "right"},
                                {title: "Открытий", align: "right"},
                                {title: "Последний вход", align: "right"},
                            ]}
                        >
                            {employees.map((e) => (
                                <EmployeeRow key={e.userId} employee={e}/>
                            ))}
                        </DataTable>
                    )}
                </>
            )}
        </div>
    );
}

function Figure({value, label, alert}: {
    value: number | string; label: string; alert?: boolean;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className={`font-mono text-[22px] font-bold leading-tight
                              ${alert ? "text-[#c0392b]" : "text-[#101a2c]"}`}>
                {value}
            </span>
            <span className="text-[12px] text-[#8593a8]">{label}</span>
        </div>
    );
}

/**
 * Сотрудников в день. Столбики, а не линия: дни дискретны, а линия между ними
 * подразумевала бы значения в промежутках, которых нет.
 */
function DailyChart({days}: {days: {day: string; users: number}[]}) {
    if (days.length === 0) {
        return (
            <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
                <h2 className="text-[15px] font-semibold text-[#101a2c]">Сотрудников в день</h2>
                <p className="mt-6 text-center text-[13px] text-[#a8b3c4]">За период заходов не было</p>
            </section>
        );
    }

    const max = Math.max(...days.map((d) => d.users), 1);
    const short = (value: string) =>
        new Date(value).toLocaleDateString("ru-RU", {day: "numeric", month: "short"});

    return (
        <section className="flex flex-col rounded-[14px] border border-[#e1e7ef] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#101a2c]">Сотрудников в день</h2>
            <p className="mb-4 text-[12px] text-[#8593a8]">уникальных за день</p>

            {/* Ширину столбика ограничиваем: за неделю их семь, и без предела
                каждый растягивается на седьмую часть карточки — за один день
                выходит сплошная заливка вместо графика. */}
            <div className="flex flex-1 items-end gap-[2px]" style={{minHeight: 170}}>
                {days.map((d) => (
                    <div
                        key={d.day}
                        title={`${short(d.day)} — ${d.users}`}
                        className="flex-1 rounded-t-[2px] bg-[#2f68f5] transition hover:bg-[#2554cc]"
                        style={{
                            maxWidth: 34,
                            height: `${(d.users / max) * 100}%`,
                            // Ноль тоже виден полоской: пустой день и день, которого
                            // нет в выборке, — разные вещи.
                            minHeight: d.users > 0 ? 3 : 1,
                            opacity: d.users > 0 ? 1 : 0.25,
                        }}
                    />
                ))}
            </div>

            <div className="mt-2 flex items-baseline justify-between text-[11.5px] text-[#8593a8]">
                <span>{short(days[0].day)}</span>
                <span className="font-medium text-[#4d5a72]">максимум {max}</span>
                <span>{short(days[days.length - 1].day)}</span>
            </div>
        </section>
    );
}

/** Разделы по числу открытий. Полоска под строкой показывает долю от лидера. */
function Sections({sections}: {sections: {title: string; count: number}[]}) {
    const max = Math.max(...sections.map((s) => s.count), 1);

    return (
        <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#101a2c]">Разделы</h2>
            <p className="mb-3 text-[12px] text-[#8593a8]">открытий за период</p>

            {sections.length === 0 ? (
                <p className="text-[13px] text-[#a8b3c4]">Нет данных</p>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {sections.map((s) => (
                        <div key={s.title}>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[13px] text-[#101a2c]">{s.title}</span>
                                <span className="shrink-0 font-mono text-[12.5px] text-[#4d5a72]">
                                    {s.count}
                                </span>
                            </div>
                            <div className="mt-1 h-[3px] rounded-full bg-[#eef2f7]">
                                <div
                                    className="h-full rounded-full bg-[#2f68f5]"
                                    style={{width: `${(s.count / max) * 100}%`}}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function EmployeeRow({employee}: {employee: UsageEmployee}) {
    const never = employee.opens === 0;

    return (
        <Row>
            <Cell>
                <div className="flex items-center gap-2.5">
                    <Avatar name={employee.fullName} muted={never}/>
                    <span className="min-w-0">
                        <span className={`block truncate text-[13.5px] font-semibold
                                          ${never ? "text-[#8593a8]" : "text-[#101a2c]"}`}>
                            {employee.fullName}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#8593a8]">
                            {employee.position ?? "—"}
                        </span>
                    </span>
                </div>
            </Cell>

            <Cell>{employee.orgUnit ?? "—"}</Cell>

            <Cell mono align="right">{employee.days || "—"}</Cell>
            <Cell mono align="right">{employee.opens || "—"}</Cell>

            <Cell mono align="right">
                {employee.lastVisit ? formatDateTime(employee.lastVisit) : (
                    <span className="text-[#c0392b]">не заходил</span>
                )}
            </Cell>
        </Row>
    );
}

/**
 * Кружок с инициалами. Настоящих фотографий в системе нет, а пустое место в
 * первой колонке делает список трудным для просматривания глазами.
 */
function Avatar({name, muted}: {name: string; muted?: boolean}) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    // Цвет из имени: одинаковый у одного человека между заходами, разный у соседей.
    const hue = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;

    return (
        <span
            aria-hidden="true"
            className="grid h-8 w-8 flex-none place-items-center rounded-full
                       text-[11.5px] font-bold text-white"
            style={{
                background: muted ? "#c3cede" : `hsl(${hue} 45% 52%)`,
            }}
        >
            {initials}
        </span>
    );
}
