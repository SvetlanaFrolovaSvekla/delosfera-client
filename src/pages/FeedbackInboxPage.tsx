import {useEffect, useMemo, useState} from "react";
import {AlertTriangle, CircleHelp, Lightbulb, Monitor} from "lucide-react";
import {
    feedbackService,
    KIND_TITLE,
    STATUS_ORDER,
    STATUS_TITLE,
    type FeedbackKind,
    type FeedbackRow,
    type FeedbackStatus,
    type FeedbackSummary,
} from "@/service/feedbackService/feedbackService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

/**
 * Разбор пожеланий и замечаний с экранов системы.
 *
 * Главное здесь — не список, а сводка по страницам сверху. Во время обкатки важнее
 * знать, какой экран собрал больше всего жалоб, чем прочитать их по одной: три
 * замечания об одном экране — это одна задача, а не три.
 */

const KIND_ICON: Record<FeedbackKind, typeof AlertTriangle> = {
    Problem: AlertTriangle,
    Wish: Lightbulb,
    Question: CircleHelp,
};

const KIND_COLOR: Record<FeedbackKind, string> = {
    Problem: "text-[#c0392b]",
    Wish: "text-[#2f68f5]",
    Question: "text-[#b3730a]",
};

const STATUS_STYLE: Record<FeedbackStatus, string> = {
    New: "bg-[#eaf0ff] text-[#2f68f5]",
    InProgress: "bg-[#fdf3e0] text-[#b3730a]",
    Accepted: "bg-[#e6f4ec] text-[#1c7a4d]",
    Done: "bg-[#e6f4ec] text-[#1c7a4d]",
    Declined: "bg-[#eef2f7] text-[#8593a8]",
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

export function FeedbackInboxPage() {
    const [rows, setRows] = useState<FeedbackRow[]>([]);
    const [summary, setSummary] = useState<FeedbackSummary | null>(null);
    const [status, setStatus] = useState<FeedbackStatus | "">("");
    const [routePath, setRoutePath] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [list, stats] = await Promise.all([
                feedbackService.list({
                    status: status || undefined,
                    routePath: routePath || undefined,
                    pageSize: 200,
                }),
                feedbackService.summary(),
            ]);
            setRows(list.items);
            setSummary(stats);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, routePath]);

    const counts = useMemo(() => {
        const map = new Map<string, number>();
        summary?.byStatus.forEach((s) => map.set(s.status, s.count));
        return map;
    }, [summary]);

    const change = async (id: number, next: FeedbackStatus) => {
        setSaving(id);
        try {
            await feedbackService.handle(id, next);
            await load();
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Пожелания и замечания"
                description="Что пишут сотрудники с экранов системы во время обкатки"
            />

            {/* Сводка по страницам: три замечания об одном экране — одна задача, а не три. */}
            {summary && summary.byPage.length > 0 && (
                <section className="rounded-[14px] border border-[#e1e7ef] bg-white p-5">
                    <h2 className="mb-3 text-[15px] font-semibold text-[#101a2c]">
                        Экраны, о которых пишут чаще всего
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {summary.byPage.slice(0, 12).map((page) => (
                            <button
                                key={page.routePath}
                                type="button"
                                onClick={() => setRoutePath(routePath === page.routePath ? "" : page.routePath)}
                                className={`flex items-baseline gap-2 rounded-[9px] border px-3 py-2 text-left transition
                                    ${routePath === page.routePath
                                    ? "border-[#2f68f5] bg-[#eaf0ff]"
                                    : "border-[#e1e7ef] hover:border-[#c3cede]"}`}
                            >
                                <span className="text-[13px] font-medium text-[#101a2c]">
                                    {page.pageTitle || page.routePath}
                                </span>
                                <span className="font-mono text-[12px] text-[#4d5a72]">{page.count}</span>
                                {page.problems > 0 && (
                                    <span className="font-mono text-[11.5px] text-[#c0392b]">
                                        ошибок {page.problems}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    {routePath && (
                        <button
                            type="button"
                            onClick={() => setRoutePath("")}
                            className="mt-3 text-[13px] text-[#2f68f5] hover:underline"
                        >
                            Показать все экраны
                        </button>
                    )}
                </section>
            )}

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setStatus("")}
                    className={`rounded-[9px] border px-3 py-1.5 text-[13px] transition
                        ${status === "" ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]" : "border-[#e1e7ef] text-[#4d5a72]"}`}
                >
                    Все
                </button>
                {STATUS_ORDER.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setStatus(value)}
                        className={`rounded-[9px] border px-3 py-1.5 text-[13px] transition
                            ${status === value ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]" : "border-[#e1e7ef] text-[#4d5a72]"}`}
                    >
                        {STATUS_TITLE[value]}
                        {counts.has(value) && (
                            <span className="ml-1.5 font-mono text-[12px] opacity-70">{counts.get(value)}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <Loader label="Загружаем сообщения…"/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Сообщений нет"
                    description="Пока никто не написал. Кнопка «Сообщить» есть на каждом экране системы."
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {rows.map((row) => {
                        const Icon = KIND_ICON[row.kind];
                        const browser = shortBrowser(row.userAgent);

                        return (
                            <article
                                key={row.id}
                                className="rounded-[14px] border border-[#e1e7ef] bg-white p-4"
                            >
                                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    <Icon size={17} className={KIND_COLOR[row.kind]}/>
                                    <span className="text-[13px] font-medium text-[#101a2c]">
                                        {KIND_TITLE[row.kind]}
                                    </span>
                                    <span
                                        className={`rounded-[5px] px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_STYLE[row.status]}`}>
                                        {STATUS_TITLE[row.status]}
                                    </span>
                                    <span className="font-mono text-[11.5px] text-[#8593a8]">
                                        {row.pageTitle || row.routePath}
                                    </span>
                                    <span className="ml-auto font-mono text-[11.5px] text-[#8593a8]">
                                        {formatDate(row.createdAt)}
                                    </span>
                                </div>

                                <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-[#101a2c]">
                                    {row.text}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#8593a8]">
                                    {row.author && (
                                        <span>
                                            {row.author.fullName}
                                            {row.author.orgUnit ? ` · ${row.author.orgUnit}` : ""}
                                        </span>
                                    )}
                                    <span className="font-mono">{row.routePath}</span>
                                    {(browser || row.viewportWidth) && (
                                        <span className="flex items-center gap-1">
                                            <Monitor size={13}/>
                                            {browser}
                                            {row.viewportWidth && row.viewportHeight
                                                ? ` ${row.viewportWidth}×${row.viewportHeight}`
                                                : ""}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#eef2f7] pt-3">
                                    {STATUS_ORDER.filter((s) => s !== row.status).map((next) => (
                                        <button
                                            key={next}
                                            type="button"
                                            disabled={saving === row.id}
                                            onClick={() => change(row.id, next)}
                                            className="rounded-[8px] border border-[#e1e7ef] px-2.5 py-1 text-[12.5px]
                                                       text-[#4d5a72] transition hover:border-[#2f68f5] hover:text-[#2f68f5]
                                                       disabled:opacity-50"
                                        >
                                            {STATUS_TITLE[next]}
                                        </button>
                                    ))}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
