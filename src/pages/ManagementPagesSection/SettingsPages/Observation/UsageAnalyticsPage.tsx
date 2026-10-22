/**
 * Посещения системы.
 *
 * Показатели, дни, разделы и поимённый список — одним запросом. Шесть обращений
 * подряд означали бы шесть разных мгновений: цифры в шапке расходились бы с
 * таблицей под ними.
 *
 * Ни разу не заходившие входят в тот же список, а не лежат отдельной вкладкой.
 * Они и есть главный вопрос к отчёту: молчание подразделения читают как
 * «замечаний нет», а обычно это «мы не начинали».
 */
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    usageReport, downloadUsageCsv, PERIODS, type UsageReport, type UsageEmployee,
} from "@/service/usageService/usageService.ts";
import {toast} from "@/service/toastService.ts";

import {Figure} from "@/components/componentsUsageAnalytics/Figure.tsx";
import {DailyChart} from "@/components/componentsUsageAnalytics/DailyChart.tsx";
import {Sections} from "@/components/componentsUsageAnalytics/Sections.tsx";
import {EmployeeRow} from "@/components/componentsUsageAnalytics/EmployeeRow.tsx";

import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {DataTable, FilterChip} from "@/components/componentsGeneral/DataTable.tsx";
import {Download} from "lucide-react";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {splitSearchTerms} from "@/utils/highlightText.tsx";

type Filter = "all" | "visited" | "never";

/**
 * Порядок списка. По умолчанию — по числу открытий, как и раньше отдавал сервер.
 * «Последний вход» нужен, чтобы увидеть, кто пропал: давно не заходившие уходят вниз,
 * ни разу не заходившие — в самый конец.
 */
type SortKey = "opens" | "lastVisit" | "days" | "name";

const SORT_OPTIONS: {value: SortKey; labelKey: string}[] = [
    {value: "opens", labelKey: "usageAnalytics.sortOpens"},
    {value: "lastVisit", labelKey: "usageAnalytics.sortLastVisit"},
    {value: "days", labelKey: "usageAnalytics.sortDays"},
    {value: "name", labelKey: "usageAnalytics.sortName"},
];

const byName = (a: UsageEmployee, b: UsageEmployee) => a.fullName.localeCompare(b.fullName, "ru");

const visitTime = (e: UsageEmployee) => {
    const time = e.lastVisit ? new Date(e.lastVisit).getTime() : NaN;
    return Number.isNaN(time) ? -Infinity : time;
};

const COMPARATORS: Record<SortKey, (a: UsageEmployee, b: UsageEmployee) => number> = {
    opens: (a, b) => b.opens - a.opens || byName(a, b),
    lastVisit: (a, b) => (visitTime(b) - visitTime(a)) || byName(a, b),
    days: (a, b) => b.days - a.days || b.opens - a.opens || byName(a, b),
    name: byName,
};

export function UsageAnalyticsPage() {
    const {t} = useTranslation();
    const [days, setDays] = useState(30);
    const [report, setReport] = useState<UsageReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortKey>("opens");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // Слова запроса: запись подходит, если в ней есть все слова — в любом поле и порядке
    // («иванов бухгалт» найдёт Иванова из бухгалтерии). Те же слова подсвечиваются в строках.
    const terms = useMemo(() => splitSearchTerms(search), [search]);

    const employees = useMemo(() => {
        if (!report) return [];

        const filtered = report.employees.filter((e) => {
            if (filter === "visited" && e.opens === 0) return false;
            if (filter === "never" && e.opens > 0) return false;
            if (terms.length === 0) return true;

            // Ищем по всему, чем человека опознают: имя, должность,
            // подразделение. Набирают обычно фамилию, но иногда отдел.
            const haystack = `${e.fullName} ${e.position ?? ""} ${e.orgUnit ?? ""}`.toLowerCase();
            return terms.every((term) => haystack.includes(term));
        });

        return filtered.sort(COMPARATORS[sort]);
    }, [report, filter, terms, sort]);

    const visitedCount = report?.employees.filter((e) => e.opens > 0).length ?? 0;
    const neverCount = (report?.employees.length ?? 0) - visitedCount;

    const save = async () => {
        setSaving(true);

        const toastId = toast.loading(
            t("usageAnalytics.toastPreparingTitle") /* Готовим файл */,
            t("usageAnalytics.toastPreparingDescription") /* Формируем CSV за выбранный период */,
        );

        try {
            await downloadUsageCsv(days);

            toast.update(toastId, {
                variant: "success",
                title: t("usageAnalytics.toastSuccessTitle") /* Файл выгружен */,
                description: t("usageAnalytics.toastSuccessDescription") /* CSV сохранён в загрузки */,
                duration: 4500,
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.update(toastId, {
                variant: "error",
                title: t("usageAnalytics.toastErrorTitle") /* Не удалось выгрузить */,
                description: t("usageAnalytics.toastErrorDescription") /* Попробуйте ещё раз */,
                duration: 4500,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title={t("usageAnalytics.title") /* Посещения системы */}
                description={t("usageAnalytics.description") /* Сколько сотрудников пользуется системой, какими разделами и кто ещё не заходил */}
                actions={
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Download className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {saving
                            ? t("usageAnalytics.preparing") /* Готовим… */
                            : t("usageAnalytics.exportCsv") /* Выгрузить в CSV */}
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
                <Loader label={t("usageAnalytics.calculating") /* Считаем… */}/>
            ) : (
                <>
                    {/* Показатели в строку: их читают слева направо как одну фразу —
                        «столько-то из стольких, это столько процентов». */}
                    <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-[14px] border
                                    border-[#e1e7ef] bg-white px-6 py-4">
                        <Figure
                            value={t("usageAnalytics.reachedOfEnabled", {
                                reached: report.summary.reached,
                                enabled: report.summary.enabled,
                            }) /* `${report.summary.reached} из ${report.summary.enabled}` */}
                            label={t("usageAnalytics.reachedPeriod") /* Охват за период */}
                        />
                        <Figure
                            value={`${report.summary.share}%`}
                            label={t("usageAnalytics.directoryShare") /* Доля справочника */}
                        />
                        <Figure
                            value={report.summary.totalOpens}
                            label={t("usageAnalytics.sectionOpens") /* Открытий разделов */}
                        />
                        <Figure
                            value={report.summary.today}
                            label={t("usageAnalytics.today") /* Сегодня */}
                        />
                        <Figure
                            value={report.summary.week}
                            label={t("usageAnalytics.thisWeek") /* За неделю */}
                        />
                        <Figure
                            value={report.summary.neverVisited}
                            label={t("usageAnalytics.neverVisited") /* Ни разу не заходили */}
                            alert={report.summary.neverVisited > 0}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                        <DailyChart days={report.byDay}/>
                        <Sections sections={report.sections}/>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <SearchBar
                            value={search}
                            onChange={setSearch}
                            placeholder={t("usageAnalytics.searchPlaceholder") /* Поиск по ФИО, должности или подразделению */}
                            maxWidth="380px"
                        />

                        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                            {t("usageAnalytics.all") /* Все */}
                        </FilterChip>
                        <FilterChip
                            active={filter === "visited"}
                            onClick={() => setFilter("visited")}
                            count={visitedCount}
                        >
                            {t("usageAnalytics.visited") /* Заходили */}
                        </FilterChip>
                        <FilterChip
                            active={filter === "never"}
                            onClick={() => setFilter("never")}
                            count={neverCount}
                        >
                            {t("usageAnalytics.never") /* Ни разу */}
                        </FilterChip>

                        <div className="ml-auto">
                            <SelectDropdown
                                label={t("usageAnalytics.sortLabel") /* Сортировка: */}
                                options={SORT_OPTIONS.map((o) => ({value: o.value, label: t(o.labelKey)}))}
                                value={sort}
                                onChange={(v) => setSort(v as SortKey)}
                                minWidth="220px"
                                size="sm"
                                className="font-semibold text-gray-500"
                                valueClassName="font-semibold"
                            />
                        </div>
                    </div>

                    {employees.length === 0 ? (
                        <EmptyState
                            title={t("usageAnalytics.noResultsTitle") /* Никого не нашлось */}
                            description={t("usageAnalytics.noResultsDescription") /* По выбранным условиям сотрудников нет. */}
                        />
                    ) : (
                        <DataTable
                            headers={[
                                t("usageAnalytics.columnEmployee") /* Сотрудник */,
                                t("usageAnalytics.columnOrgUnit") /* Подразделение */,
                                {title: t("usageAnalytics.columnDaysVisited") /* Дней с посещениями */, align: "right"},
                                {title: t("usageAnalytics.columnOpens") /* Открытий */, align: "right"},
                                {title: t("usageAnalytics.columnLastLogin") /* Последний вход */, align: "right"},
                            ]}
                        >
                            {employees.map((e) => (
                                <EmployeeRow key={e.userId} employee={e} terms={terms}/>
                            ))}
                        </DataTable>
                    )}
                </>
            )}
        </div>
    );
}