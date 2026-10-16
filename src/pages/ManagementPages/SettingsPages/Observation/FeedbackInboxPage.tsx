/**
 * Пожелания и замечания
 * Разбор пожеланий и замечаний с экранов системы.
 *
 * Сверху - плитки "сколько чего" (они же быстрые фильтры), справа - экраны, о которых пишут
 * чаще всего: во время обкатки важнее знать, какой экран собрал больше всего жалоб, чем
 * прочитать их по одной - три замечания об одном экране это одна задача, а не три.
 */
import {useEffect, useMemo, useState, type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {
    feedbackService,
    KIND_ORDER,
    STATUS_ORDER,
    type FeedbackKind,
    type FeedbackRow,
    type FeedbackStatus,
    type FeedbackSummary, getStatusTitle, getKindTitle,
} from "@/service/feedbackService/feedbackService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    AlertTriangle, CircleHelp, Inbox, Lightbulb, Loader2, MessageSquareReply, Monitor, MonitorSmartphone, Timer, X,
} from "lucide-react";

const KIND_ICON: Record<FeedbackKind, typeof AlertTriangle> = {
    Problem: AlertTriangle,
    Wish: Lightbulb,
    Question: CircleHelp,
};

/** Цвет вида сообщения: иконка, её подложка и полоска слева у карточки */
const KIND_TONE: Record<FeedbackKind, { fg: string; bg: string }> = {
    Problem: {fg: "#c0392b", bg: "#fbe9e7"},
    Wish: {fg: "#2f68f5", bg: "#eaf0ff"},
    Question: {fg: "#b3730a", bg: "#fdf3e0"},
};

const STATUS_STYLE: Record<FeedbackStatus, string> = {
    New: "bg-[#eaf0ff] text-[#2f68f5]",
    InProgress: "bg-[#fdf3e0] text-[#b3730a]",
    Accepted: "bg-[#e6f4ec] text-[#1c7a4d]",
    Done: "bg-[#e6f4ec] text-[#1c7a4d]",
    Declined: "bg-[#eef2f7] text-[#8593a8]",
};

/** Активная кнопка статуса в карточке - в цвет самого статуса */
const STATUS_ACTIVE: Record<FeedbackStatus, string> = {
    New: "border-[#2f68f5] bg-[#2f68f5] text-white",
    InProgress: "border-[#d68a0c] bg-[#d68a0c] text-white",
    Accepted: "border-[#1c7a4d] bg-[#1c7a4d] text-white",
    Done: "border-[#1c7a4d] bg-[#1c7a4d] text-white",
    Declined: "border-[#8593a8] bg-[#8593a8] text-white",
};

function formatDate(value: string) {
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
}

/** Оставляет от строки браузера то, что помогает воспроизвести: имя и версию. */
function shortBrowser(userAgent: string | null): string | null {
    if (!userAgent) return null;

    const known = [
        [/Edg\/([\d.]+)/, "Edge"],
        [/OPR\/([\d.]+)/, "Opera"],
        [/YaBrowser\/([\d.]+)/, "Яндекс"],
        [/Firefox\/([\d.]+)/, "Firefox"],
        [/Chrome\/([\d.]+)/, "Chrome"],
        [/Version\/([\d.]+).*Safari/, "Safari"],
    ] as const;

    for (const [pattern, name] of known) {
        const match = userAgent.match(pattern);
        if (match) return `${name} ${match[1].split(".")[0]}`;
    }

    return null;
}

function initials(fullName: string): string {
    return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function FeedbackInboxPage() {
    const {t} = useTranslation();
    const [rows, setRows] = useState<FeedbackRow[]>([]);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<FeedbackSummary | null>(null);
    const [status, setStatus] = useState<FeedbackStatus | "">("");
    const [kind, setKind] = useState<FeedbackKind | "">("");
    const [routePath, setRoutePath] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [list, stats] = await Promise.all([
                feedbackService.list({
                    status: status || undefined,
                    kind: kind || undefined,
                    routePath: routePath || undefined,
                    pageSize: 200,
                }),
                feedbackService.summary(),
            ]);
            setRows(list.items);
            setTotal(list.total);
            setSummary(stats);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, kind, routePath]);

    const statusCounts = useMemo(() => {
        const map = new Map<string, number>();
        summary?.byStatus.forEach((s) => map.set(s.status, s.count));
        return map;
    }, [summary]);

    const kindCounts = useMemo(() => {
        const map = new Map<string, number>();
        summary?.byKind.forEach((k) => map.set(k.kind, k.count));
        return map;
    }, [summary]);

    const allCount = summary?.byStatus.reduce((sum, s) => sum + s.count, 0) ?? 0;
    const maxPageCount = summary?.byPage.reduce((max, p) => Math.max(max, p.count), 0) ?? 0;
    const selectedPage = summary?.byPage.find((p) => p.routePath === routePath);
    const hasFilters = status !== "" || kind !== "" || routePath !== "";

    const change = async (id: number, next: FeedbackStatus) => {
        setSaving(id);
        try {
            await feedbackService.handle(id, next);
            await load();
        } finally {
            setSaving(null);
        }
    };

    const resetFilters = () => {
        setStatus("");
        setKind("");
        setRoutePath("");
    };

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                // title="Пожелания и замечания"
                title={t("feedbackInbox.title")}
                // description="Что пишут сотрудники с экранов системы во время обкатки"
                description={t("feedbackInbox.description")}
            />

            {/* Плитки "сколько чего" - они же быстрые фильтры */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label={t("feedbackInbox.stats.new")}
                    value={statusCounts.get("New") ?? 0}
                    icon={<Inbox size={17}/>}
                    tone={{fg: "#2f68f5", bg: "#eaf0ff"}}
                    highlight={(statusCounts.get("New") ?? 0) > 0}
                    active={status === "New" && kind === ""}
                    onClick={() => {
                        setKind("");
                        setStatus(status === "New" && kind === "" ? "" : "New");
                    }}
                />
                <StatTile
                    label={t("feedbackInbox.stats.inProgress")}
                    value={statusCounts.get("InProgress") ?? 0}
                    icon={<Timer size={17}/>}
                    tone={{fg: "#b3730a", bg: "#fdf3e0"}}
                    active={status === "InProgress" && kind === ""}
                    onClick={() => {
                        setKind("");
                        setStatus(status === "InProgress" && kind === "" ? "" : "InProgress");
                    }}
                />
                <StatTile
                    label={t("feedbackInbox.stats.problems")}
                    value={kindCounts.get("Problem") ?? 0}
                    icon={<AlertTriangle size={17}/>}
                    tone={KIND_TONE.Problem}
                    active={kind === "Problem" && status === ""}
                    onClick={() => {
                        setStatus("");
                        setKind(kind === "Problem" && status === "" ? "" : "Problem");
                    }}
                />
                <StatTile
                    label={t("feedbackInbox.stats.total")}
                    value={allCount}
                    icon={<MonitorSmartphone size={17}/>}
                    tone={{fg: "#4d5a72", bg: "#eef2f7"}}
                    active={!hasFilters}
                    onClick={resetFilters}
                />
            </div>

            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Лента сообщений */}
                <div className="min-w-0">
                    <div className="mb-4 flex flex-col gap-3 rounded-[14px] border border-[#e1e7ef] bg-white p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <FilterLabel>{t("feedbackInbox.filterStatus")}</FilterLabel>
                            <Chip active={status === ""} onClick={() => setStatus("")}>
                                {t("feedbackInbox.allStatuses")}
                            </Chip>
                            {STATUS_ORDER.map((value) => (
                                <Chip key={value} active={status === value} onClick={() => setStatus(value)}
                                      count={statusCounts.get(value)}>
                                    {getStatusTitle()[value]}
                                </Chip>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <FilterLabel>{t("feedbackInbox.filterKind")}</FilterLabel>
                            <Chip active={kind === ""} onClick={() => setKind("")}>
                                {t("feedbackInbox.allKinds")}
                            </Chip>
                            {KIND_ORDER.map((value) => {
                                const Icon = KIND_ICON[value];
                                return (
                                    <Chip key={value} active={kind === value} onClick={() => setKind(value)}
                                          count={kindCounts.get(value)}
                                          icon={<Icon size={13} style={{color: KIND_TONE[value].fg}}/>}>
                                        {getKindTitle()[value]}
                                    </Chip>
                                );
                            })}
                        </div>
                        {(routePath || hasFilters) && (
                            <div className="flex flex-wrap items-center gap-2 border-t border-[#eef2f7] pt-3 text-[12.5px] text-[#8593a8]">
                                {routePath && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf0ff] py-1 pl-3 pr-1.5 text-[#2f68f5]">
                                        {t("feedbackInbox.screenFilter", {name: selectedPage?.screenTitle || routePath})}
                                        <button type="button" onClick={() => setRoutePath("")} aria-label={t("feedbackInbox.showAllPages")}
                                                className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-white">
                                            <X size={12}/>
                                        </button>
                                    </span>
                                )}
                                {!loading && <span>{t("feedbackInbox.shown", {shown: rows.length, total})}</span>}
                                {hasFilters && (
                                    <button type="button" onClick={resetFilters}
                                            className="ml-auto cursor-pointer font-semibold text-[#2f68f5] hover:underline">
                                        {t("feedbackInbox.resetFilters")}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {loading ? (
                        // <Loader label="Загружаем сообщения…"/>
                        <Loader label={t("feedbackInbox.loadingMessages")}/>
                    ) : rows.length === 0 ? (
                        <EmptyState
                            // title="Сообщений нет"
                            title={t("feedbackInbox.emptyTitle")}
                            // description="Пока никто не написал. Кнопка «Сообщить» есть на каждом экране системы."
                            description={t("feedbackInbox.emptyDescription")}
                        />
                    ) : (
                        <div className="flex flex-col gap-3">
                            {rows.map((row) => (
                                <FeedbackCard key={row.id} row={row} saving={saving === row.id}
                                              onChange={(next) => change(row.id, next)}
                                              onPageClick={() => setRoutePath(row.routePath)}/>
                            ))}
                        </div>
                    )}
                </div>

                {/* Экраны, о которых пишут чаще всего: три замечания об одном экране - одна задача */}
                {summary && summary.byPage.length > 0 && (
                    <aside className="rounded-[14px] border border-[#e1e7ef] bg-white p-4 xl:sticky xl:top-4">
                        <h2 className="mb-1 text-[14px] font-semibold text-[#101a2c]">
                            {/* Экраны, о которых пишут чаще всего */}
                            {t("feedbackInbox.topPagesTitle")}
                        </h2>
                        <p className="mb-3 text-[12px] text-[#8593a8]">{t("feedbackInbox.topPagesHint")}</p>
                        <div className="flex flex-col gap-1">
                            {summary.byPage.slice(0, 12).map((page) => {
                                const active = routePath === page.routePath;
                                return (
                                    <button
                                        key={page.routePath}
                                        type="button"
                                        onClick={() => setRoutePath(active ? "" : page.routePath)}
                                        className={`cursor-pointer rounded-[10px] border px-3 py-2 text-left transition ${
                                            active ? "border-[#2f68f5] bg-[#f3f7ff]" : "border-transparent hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13px] font-medium text-[#101a2c]">
                                                    {page.screenTitle || page.routePath}
                                                </span>
                                                <span className="block truncate font-mono text-[11px] text-[#8593a8]">
                                                    {page.routePath}
                                                </span>
                                            </span>
                                            {page.problems > 0 && (
                                                <span className="flex-none rounded-full bg-[#fbe9e7] px-1.5 py-[1px] text-[11px] font-semibold text-[#c0392b]">
                                                    {/* ошибок {page.problems} */}
                                                    {t("feedbackInbox.problemsCount", {count: page.problems})}
                                                </span>
                                            )}
                                            <span className="flex-none font-mono text-[12px] font-semibold text-[#4d5a72]">{page.count}</span>
                                        </span>
                                        <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-[#eef2f7]">
                                            <span className="relative block h-full rounded-full bg-[#9db6f7]"
                                                  style={{width: `${maxPageCount ? Math.max(6, (page.count / maxPageCount) * 100) : 0}%`}}>
                                                {page.problems > 0 && (
                                                    <span className="absolute inset-y-0 left-0 rounded-full bg-[#e0796d]"
                                                          style={{width: `${(page.problems / page.count) * 100}%`}}/>
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {routePath && (
                            <button
                                type="button"
                                onClick={() => setRoutePath("")}
                                className="mt-3 cursor-pointer text-[12.5px] font-semibold text-[#2f68f5] hover:underline"
                            >
                                {/* Показать все экраны */}
                                {t("feedbackInbox.showAllPages")}
                            </button>
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
}

function StatTile({label, value, icon, tone, active, highlight, onClick}: {
    label: string;
    value: number;
    icon: ReactNode;
    tone: { fg: string; bg: string };
    active: boolean;
    highlight?: boolean;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick} aria-pressed={active}
                className={`group relative flex cursor-pointer items-center gap-3 rounded-[14px] border bg-white p-4 text-left transition ${
                    active ? "border-[#2f68f5] shadow-[0_6px_18px_-12px_rgba(47,104,245,.6)]" : "border-[#e1e7ef] hover:border-[#c3cede]"
                }`}>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px]" style={{background: tone.bg, color: tone.fg}}>
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block font-mono text-[22px] font-semibold leading-none text-[#101a2c]">{value}</span>
                <span className="mt-1 block truncate text-[12.5px] text-[#8593a8]">{label}</span>
            </span>
            {highlight && (
                <span className="absolute right-3 top-3 h-[8px] w-[8px] rounded-full bg-[#e0483d] ring-[3px] ring-[#e0483d]/15"/>
            )}
        </button>
    );
}

function FilterLabel({children}: { children: ReactNode }) {
    return (
        <span className="mr-1 w-[52px] flex-none text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
            {children}
        </span>
    );
}

function Chip({active, onClick, count, icon, children}: {
    active: boolean;
    onClick: () => void;
    count?: number;
    icon?: ReactNode;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
                active
                    ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                    : "border-[#e5e9f0] bg-white text-[#55617a] hover:border-[#c3cede] hover:bg-[#f6f8fb]"
            }`}
        >
            {icon}
            {children}
            {count !== undefined && (
                <span className={`font-mono text-[11.5px] ${active ? "text-[#2f68f5]" : "text-[#a3adbd]"}`}>{count}</span>
            )}
        </button>
    );
}

function FeedbackCard({row, saving, onChange, onPageClick}: {
    row: FeedbackRow;
    saving: boolean;
    onChange: (next: FeedbackStatus) => void;
    onPageClick: () => void;
}) {
    const {t} = useTranslation();
    const Icon = KIND_ICON[row.kind];
    const tone = KIND_TONE[row.kind];
    const browser = shortBrowser(row.userAgent);
    const isNew = row.status === "New";

    return (
        <article
            className={`relative overflow-hidden rounded-[14px] border bg-white transition ${
                isNew ? "border-[#cfdcf7] shadow-[0_6px_20px_-16px_rgba(47,104,245,.7)]" : "border-[#e1e7ef]"
            }`}
        >
            {/* Полоска слева - вид сообщения */}
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{background: tone.fg}}/>

            <div className="p-4 pl-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full" style={{background: tone.bg, color: tone.fg}}>
                        <Icon size={16}/>
                    </span>
                    <span className="text-[13.5px] font-semibold text-[#101a2c]">{getKindTitle()[row.kind]}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[row.status]}`}>
                        {getStatusTitle()[row.status]}
                    </span>
                    <button type="button" onClick={onPageClick}
                            title={t("feedbackInbox.filterByThisPage")}
                            className="inline-flex max-w-full cursor-pointer items-center gap-1 truncate rounded-full border border-[#e5e9f0] px-2.5 py-0.5 text-[11.5px] text-[#4d5a72] hover:border-[#2f68f5] hover:text-[#2f68f5]">
                        <Monitor size={12}/>
                        {row.screenTitle || row.routePath}
                    </button>
                    <span className="ml-auto font-mono text-[11.5px] text-[#8593a8]">
                        {formatDate(row.createdAt)}
                    </span>
                </div>

                <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.6] text-[#101a2c]">
                    {row.text}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#8593a8]">
                    {row.author && (
                        <span className="inline-flex items-center gap-2">
                            <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#eef2f7] text-[10px] font-bold text-[#4d5a72]">
                                {initials(row.author.fullName)}
                            </span>
                            <span>
                                <span className="font-medium text-[#4d5a72]">{row.author.fullName}</span>
                                {row.author.orgUnit ? ` · ${row.author.orgUnit}` : ""}
                            </span>
                        </span>
                    )}
                    <span className="font-mono">{row.routePath}</span>
                    {(browser || row.viewportWidth) && (
                        <span className="inline-flex items-center gap-1">
                            <MonitorSmartphone size={13}/>
                            {browser}
                            {row.viewportWidth && row.viewportHeight
                                ? ` ${row.viewportWidth}×${row.viewportHeight}`
                                : ""}
                        </span>
                    )}
                </div>

                {/* Ответ разбирающего - его же видит автор в "Мои сообщения" */}
                {row.handlerComment && (
                    <div className="mt-3 flex gap-2.5 rounded-[10px] bg-[#f6f8fb] px-3 py-2.5">
                        <MessageSquareReply size={15} className="mt-0.5 flex-none text-[#8593a8]"/>
                        <div className="min-w-0 text-[12.5px]">
                            <div className="text-[#8593a8]">
                                {t("feedbackInbox.reply")}
                                {row.handledBy ? ` · ${row.handledBy}` : ""}
                                {row.handledAt ? ` · ${formatDate(row.handledAt)}` : ""}
                            </div>
                            <div className="whitespace-pre-wrap text-[#26324a]">{row.handlerComment}</div>
                        </div>
                    </div>
                )}

                {/* Смена статуса: текущий выделен цветом статуса */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#eef2f7] pt-3">
                    <span className="mr-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        {t("feedbackInbox.changeStatus")}
                    </span>
                    {STATUS_ORDER.map((value) => {
                        const current = value === row.status;
                        return (
                            <button
                                key={value}
                                type="button"
                                disabled={saving || current}
                                onClick={() => onChange(value)}
                                aria-pressed={current}
                                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition disabled:cursor-default ${
                                    current
                                        ? STATUS_ACTIVE[value]
                                        : "cursor-pointer border-[#e1e7ef] text-[#4d5a72] hover:border-[#2f68f5] hover:text-[#2f68f5] disabled:opacity-50"
                                }`}
                            >
                                {getStatusTitle()[value]}
                            </button>
                        );
                    })}
                    {saving && <Loader2 size={14} className="ml-1 animate-spin text-[#8593a8]"/>}
                </div>
            </div>
        </article>
    );
}
