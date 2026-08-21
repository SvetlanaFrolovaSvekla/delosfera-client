import {useEffect, useState} from "react";
import {
    usageService,
    type SilentUserRow,
    type UsageOverview,
    type UsagePageRow,
    type UsageTimeline,
    type UsageUserRow,
} from "@/service/usageService/usageService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

/**
 * Посещаемость системы.
 *
 * Отвечает на вопросы обкатки, которые иначе решаются голосованием: какие разделы
 * открывают, какие не открыл никто, кто из приглашённых так и не появился.
 *
 * Вкладка «Не заходили» стоит наравне с остальными намеренно. Молчание
 * подразделения читают как «замечаний нет», а обычно это «мы не начинали», и
 * разница между этими двумя выясняется здесь, а не на совещании по итогам.
 */

type Tab = "pages" | "users" | "silent" | "timeline";

const TAB_TITLE: Record<Tab, string> = {
    pages: "Экраны",
    users: "Люди",
    silent: "Не заходили",
    timeline: "По дням и часам",
};

const PERIODS = [7, 14, 30, 90] as const;

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
}

/** Длительность человеку: секунды до минуты, дальше минуты. Миллисекунды никому не нужны. */
function formatDuration(ms: number | null | undefined) {
    if (!ms || ms <= 0) return "—";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} с`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} мин`;
    return `${Math.round(minutes / 60)} ч`;
}

export function UsageAnalyticsPage() {
    const [days, setDays] = useState<number>(14);
    const [tab, setTab] = useState<Tab>("pages");

    const [overview, setOverview] = useState<UsageOverview | null>(null);
    const [pages, setPages] = useState<UsagePageRow[]>([]);
    const [users, setUsers] = useState<UsageUserRow[]>([]);
    const [silent, setSilent] = useState<SilentUserRow[]>([]);
    const [timeline, setTimeline] = useState<UsageTimeline | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        Promise.all([
            usageService.overview(days),
            usageService.pages(days),
            usageService.users(days),
            usageService.silent(days),
            usageService.timeline(days),
        ])
            .then(([o, p, u, s, t]) => {
                if (cancelled) return;
                setOverview(o);
                setPages(p);
                setUsers(u);
                setSilent(s);
                setTimeline(t);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [days]);

    const maxDay = timeline ? Math.max(1, ...timeline.byDay.map((d) => d.visits)) : 1;
    const maxHour = timeline ? Math.max(1, ...timeline.byHour.map((h) => h.visits)) : 1;

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Посещаемость"
                description="Кто заходит в систему, какие разделы открывают и когда"
            />

            <div className="flex flex-wrap gap-2">
                {PERIODS.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setDays(value)}
                        className={`rounded-[9px] border px-3 py-1.5 text-[13px] transition
                            ${days === value
                            ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                            : "border-[#e1e7ef] text-[#4d5a72] hover:border-[#c3cede]"}`}
                    >
                        {value} дней
                    </button>
                ))}
            </div>

            {overview && (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px]
                                border border-[#e1e7ef] bg-[#e1e7ef] sm:grid-cols-4">
                    <Figure value={overview.totalVisits} label="заходов"/>
                    <Figure
                        value={overview.distinctUsers}
                        label={`из ${overview.enabledUsers} сотрудников`}
                    />
                    <Figure value={overview.distinctScreens} label="экранов открывали"/>
                    <Figure
                        value={formatDuration(overview.medianDurationMs)}
                        label="на экране, медиана"
                    />
                </div>
            )}

            <div className="flex flex-wrap gap-2 border-b border-[#e1e7ef]">
                {(Object.keys(TAB_TITLE) as Tab[]).map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setTab(value)}
                        className={`-mb-px border-b-2 px-3 py-2 text-[13.5px] transition
                            ${tab === value
                            ? "border-[#2f68f5] font-medium text-[#2f68f5]"
                            : "border-transparent text-[#4d5a72] hover:text-[#101a2c]"}`}
                    >
                        {TAB_TITLE[value]}
                        {value === "silent" && silent.length > 0 && (
                            <span className="ml-1.5 font-mono text-[12px] text-[#c0392b]">{silent.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <Loader label="Считаем…"/>
            ) : (
                <>
                    {tab === "pages" && (
                        pages.length === 0
                            ? <EmptyState title="Заходов нет" description="За выбранный период система никем не открывалась."/>
                            : (
                                <Table headers={["Экран", "Маршрут", "Заходов", "Людей", "В среднем", "Последний"]}>
                                    {pages.map((row) => (
                                        <tr key={row.routePath} className="border-b border-[#e1e7ef] last:border-0">
                                            <Td strong>{row.title || "—"}</Td>
                                            <Td mono>{row.routePath}</Td>
                                            <Td mono>{row.visits}</Td>
                                            <Td mono>{row.users}</Td>
                                            <Td mono>{formatDuration(row.averageDurationMs)}</Td>
                                            <Td mono>{formatDate(row.lastAt)}</Td>
                                        </tr>
                                    ))}
                                </Table>
                            )
                    )}

                    {tab === "users" && (
                        users.length === 0
                            ? <EmptyState title="Никто не заходил" description="За выбранный период заходов не было."/>
                            : (
                                <Table headers={["Сотрудник", "Подразделение", "Заходов", "Экранов", "Дней", "Последний"]}>
                                    {users.map((row) => (
                                        <tr key={row.userId} className="border-b border-[#e1e7ef] last:border-0">
                                            <Td strong>{row.fullName}</Td>
                                            <Td>{row.orgUnit || "—"}</Td>
                                            <Td mono>{row.visits}</Td>
                                            <Td mono>{row.screens}</Td>
                                            <Td mono>{row.days}</Td>
                                            <Td mono>{formatDate(row.lastAt)}</Td>
                                        </tr>
                                    ))}
                                </Table>
                            )
                    )}

                    {tab === "silent" && (
                        silent.length === 0
                            ? <EmptyState title="Заходили все" description="За выбранный период в системе побывал каждый активный сотрудник."/>
                            : (
                                <>
                                    <p className="text-[13px] text-[#8593a8]">
                                        Активные учётные записи, не открывшие ни одного экрана за период.
                                        Если подразделение не пишет замечаний — сначала стоит проверить,
                                        начинало ли оно вообще.
                                    </p>
                                    <Table headers={["Сотрудник", "Должность", "Подразделение", "Последний вход"]}>
                                        {silent.map((row) => (
                                            <tr key={row.id} className="border-b border-[#e1e7ef] last:border-0">
                                                <Td strong>{row.fullName}</Td>
                                                <Td>{row.position || "—"}</Td>
                                                <Td>{row.orgUnit || "—"}</Td>
                                                <Td mono>{formatDate(row.lastLoginAt)}</Td>
                                            </tr>
                                        ))}
                                    </Table>
                                </>
                            )
                    )}

                    {tab === "timeline" && timeline && (
                        <div className="flex flex-col gap-5">
                            <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
                                <h2 className="mb-4 text-[15px] font-semibold text-[#101a2c]">По дням</h2>
                                <div className="flex flex-col gap-1.5">
                                    {timeline.byDay.map((day) => (
                                        <div key={day.day} className="flex items-center gap-3">
                                            <span className="w-[80px] shrink-0 font-mono text-[12px] text-[#8593a8]">
                                                {new Date(day.day).toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit"})}
                                            </span>
                                            <div className="h-[18px] flex-1 overflow-hidden rounded-[4px] bg-[#eef2f7]">
                                                <div
                                                    className="h-full rounded-[4px] bg-[#2f68f5]"
                                                    style={{width: `${(day.visits / maxDay) * 100}%`}}
                                                />
                                            </div>
                                            <span className="w-[100px] shrink-0 text-right font-mono text-[12px] text-[#4d5a72]">
                                                {day.visits} · {day.users} чел.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
                                <h2 className="mb-4 text-[15px] font-semibold text-[#101a2c]">По часам</h2>
                                <div className="flex items-end gap-[3px]" style={{height: 120}}>
                                    {Array.from({length: 24}, (_, hour) => {
                                        const found = timeline.byHour.find((h) => h.hour === hour);
                                        const visits = found?.visits ?? 0;
                                        return (
                                            <div key={hour} className="flex flex-1 flex-col items-center gap-1">
                                                <div
                                                    title={`${hour}:00 — ${visits}`}
                                                    className="w-full rounded-t-[3px] bg-[#2f68f5]"
                                                    style={{height: `${(visits / maxHour) * 96}px`, minHeight: visits > 0 ? 2 : 0}}
                                                />
                                                <span className="font-mono text-[9.5px] text-[#a8b3c4]">
                                                    {hour % 3 === 0 ? hour : ""}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-[12px] text-[#a8b3c4]">Время серверное, UTC.</p>
                            </section>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Figure({value, label}: { value: number | string; label: string }) {
    return (
        <div className="bg-white px-4 py-3">
            <div className="font-mono text-[24px] font-semibold leading-tight text-[#101a2c]">{value}</div>
            <div className="text-[12px] text-[#8593a8]">{label}</div>
        </div>
    );
}

function Table({headers, children}: { headers: string[]; children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-[14px] border border-[#e1e7ef] bg-white">
            <table className="w-full border-collapse text-[13.5px]">
                <thead>
                <tr>
                    {headers.map((header) => (
                        <th
                            key={header}
                            className="whitespace-nowrap border-b border-[#e1e7ef] bg-[#f7f9fc] px-4 py-2.5
                                       text-left text-[10.5px] font-bold uppercase tracking-wider text-[#8593a8]"
                        >
                            {header}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

function Td({children, strong, mono}: { children: React.ReactNode; strong?: boolean; mono?: boolean }) {
    return (
        <td
            className={`px-4 py-2.5 align-top ${mono ? "whitespace-nowrap font-mono text-[12.5px]" : ""}
                        ${strong ? "font-semibold text-[#101a2c]" : "text-[#4d5a72]"}`}
        >
            {children}
        </td>
    );
}
