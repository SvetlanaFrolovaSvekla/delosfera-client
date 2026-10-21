/**
 * Доска записок по стадиям (РС-4). Реестр отвечает «какие записки есть», доска — «на
 * какой стадии каждая и где затор». Завершённые и отклонённые не показываем, черновики —
 * только свои.
 *
 * Затор видно по двум признакам: «зависла» (долго на текущей стадии — порог задаёт сервер)
 * и «просрочена» (прошёл срок исполнения). Поиск и быстрые фильтры — на клиенте: доска
 * приходит целиком и уже сужена правами.
 */
import {useCallback, useEffect, useMemo, useState, type ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {
    szService,
    type SzKind,
    type SzStatusCode,
    type SzTrackerBoard,
    type SzTrackerItem,
} from "@/service/szService/szService.ts";
import {STATUS_TONE} from "@/constants/szConstatns/szStatusTone.ts";
import {
    buildHaystack,
    highlightParts,
    matchesWords,
    resolveSearch,
} from "@/utils/szProcess/szTrackerSearch.ts";
import {formatDate} from "@/components/componentsSz/componentsSzRegistry/registryModel.ts";
import {DoubleScroll} from "@/components/componentsGeneral/DoubleScroll.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {colors} from "@/design/tokens.ts";
import {
    AlertTriangle, Building2, CalendarClock, ChevronDown, ChevronUp, Hourglass, List, Search, User, X,
} from "lucide-react";

/** Сколько карточек в колонке видно сразу — дальше "Показать ещё" */
const COLLAPSED_LIMIT = 15;

/** Срок ближе стольких дней - подсвечиваем заранее. */
const DUE_SOON_DAYS = 2;

type SourceFilter = "all" | "mine" | "unit";
const SOURCE_FILTERS: SourceFilter[] = ["all", "mine", "unit"];
const SOURCE_STORAGE_KEY = "szTracker.sourceFilter";

function readSourceFilter(): SourceFilter {
    try {
        const value = localStorage.getItem(SOURCE_STORAGE_KEY);
        return SOURCE_FILTERS.includes(value as SourceFilter) ? value as SourceFilter : "all";
    } catch {
        return "all";
    }
}

function matchesSource(item: SzTrackerItem, source: SourceFilter): boolean {
    if (source === "mine") return item.isMine;
    if (source === "unit") return item.isMyUnit;
    return true;
}

/** Дата момента (ISO, UTC) по местному времени: «12.10.2026». */
function localDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Текст с подсвеченными совпадениями поиска. */
function Hl({text, words}: { text: string; words: string[] }) {
    return (
        <>
            {highlightParts(text, words).map((p, i) =>
                p.hit
                    ? <mark key={i} className="bg-[#fde3c4] text-[#8a4b00] rounded-[3px] px-[1px]">{p.text}</mark>
                    : <span key={i}>{p.text}</span>,
            )}
        </>
    );
}

export function SzTrackerPage() {
    const {t, i18n} = useTranslation();
    const [board, setBoard] = useState<SzTrackerBoard | null>(null);
    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [search, setSearch] = useState("");
    const [source, setSourceState] = useState<SourceFilter>(readSourceFilter);
    const [staleOnly, setStaleOnly] = useState(false);
    const [overdueOnly, setOverdueOnly] = useState(false);
    /** Колонки, развёрнутые целиком */
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

    const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);
        szService.tracker()
            .then(setBoard)
            .catch(() => setError(t("szTracker.loadError")));
    }, [reloadKey, t]);

    useEffect(() => {
        szService.kinds().then(setKinds).catch(() => {
        });
    }, []);

    const setSource = (value: SourceFilter) => {
        setSourceState(value);
        try {
            localStorage.setItem(SOURCE_STORAGE_KEY, value);
        } catch {
            // приватный режим / запрет хранилища - фильтр просто не запомнится
        }
    };

    /** Вид записки на языке интерфейса - по id, а не по русскому названию: переименование вида его не ломает. */
    const kindLabel = useCallback((item: SzTrackerItem): string => {
        const k = kinds.find((x) => x.id === item.kindId);
        if (!k) return item.kind;
        if (i18n.language === "ky") return k.titleKg || k.titleRu;
        if (i18n.language === "en") return k.titleEn || k.titleRu;
        return k.titleRu;
    }, [kinds, i18n.language]);

    const stageTitle = useCallback(
        (code: string, fallback: string) => t(`szTracker.stages.${code}`, {defaultValue: fallback}),
        [t],
    );

    const columns = useMemo(() => board?.columns ?? [], [board]);
    const allItems = useMemo(() => columns.flatMap((c) => c.items), [columns]);

    /**
     * Строка поиска каждой записки: номер, тема, вид (на языке интерфейса и по-русски, чтобы
     * находилось и так и так), автор, адресат, стадия.
     */
    const haystacks = useMemo(() => {
        const map = new Map<number, string>();
        for (const col of columns) {
            const stage = stageTitle(col.code, col.title);
            for (const it of col.items) {
                map.set(it.id, buildHaystack(
                    [it.regNumber, it.title, kindLabel(it), it.kind, it.authorName, it.addresseeName, stage],
                    it.regNumber,
                ));
            }
        }
        return map;
    }, [columns, kindLabel, stageTitle]);

    // Слова для поиска - среди записок, прошедших быстрые фильтры: иначе «другая раскладка»
    // срабатывала бы по записке, которую фильтр всё равно спрячет.
    const passesQuick = useCallback((it: SzTrackerItem) =>
            matchesSource(it, source) && (!staleOnly || it.isStale) && (!overdueOnly || it.isOverdue),
        [source, staleOnly, overdueOnly]);

    const {words, switchedQuery} = useMemo(
        () => resolveSearch(search, allItems.filter(passesQuick).map((it) => haystacks.get(it.id) ?? "")),
        [search, allItems, passesQuick, haystacks],
    );

    const shown = useMemo(() => columns.map((col) => ({
        ...col,
        items: col.items.filter((it) => passesQuick(it) && matchesWords(haystacks.get(it.id) ?? "", words)),
    })), [columns, passesQuick, haystacks, words]);

    const total = allItems.length;
    const found = shown.reduce((s, c) => s + c.items.length, 0);
    const staleCount = allItems.filter((i) => i.isStale).length;
    const overdueCount = allItems.filter((i) => i.isOverdue).length;
    const mineCount = allItems.filter((i) => i.isMine).length;
    const unitCount = allItems.filter((i) => i.isMyUnit).length;
    const filtering = words.length > 0 || source !== "all" || staleOnly || overdueOnly;
    const sourceFilters = SOURCE_FILTERS.filter((f) => f !== "unit" || board?.hasUnit);

    const resetFilters = () => {
        setSearch("");
        setSource("all");
        setStaleOnly(false);
        setOverdueOnly(false);
    };

    const toggleExpanded = (code: string) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
    });

    const staleHint = board
        ? `${t("szTracker.hints.stale", {
            days: board.staleAfterDays,
            execDays: board.staleExecutionAfterDays
        })} ${t("szTracker.hints.overdue")}`
        : "";

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
                <div>
                    <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{t("szTracker.title")}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[12.5px] text-[#8b97ab]">
                        <span>{t("szTracker.subtitle")}</span>
                        {board && <span>· {t("szTracker.total", {n: total})}</span>}
                        {staleCount > 0 &&
                            <span className="text-[#b3730a]">· {t("szTracker.stale", {n: staleCount})}</span>}
                        {overdueCount > 0 && (
                            <span
                                style={{color: colors.ryg.red.fg}}>· {t("szTracker.overdueTotal", {n: overdueCount})}</span>
                        )}
                        {board && <HelpTooltip content={staleHint} className="-my-1"/>}
                    </div>
                </div>
                <Link to="/sz"
                      className="inline-flex items-center gap-2 h-10 px-[15px]
                             rounded-[10px] border border-[#e5e9f0] bg-white text-[13px]
                             font-semibold text-[#3a4560] no-underline hover:bg-[#f6f8fb]">
                    <List className="w-[17px] h-[17px]" strokeWidth={2}/>
                    {t("szTracker.back")}
                </Link>
            </div>

            {error && (
                <EmptyState
                    variant="error"
                    title={error}
                    description={t("szTracker.loadErrorHint")}
                    actionLabel={t("szTracker.retry")}
                    onAction={refetch}
                />
            )}
            {!board && !error && <div className="text-[13px] text-[#8b97ab]">{t("general.loading")}</div>}

            {board && (
                <>
                    {/* --- Поиск и быстрые фильтры --- */}
                    <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                        <label
                            className="flex h-10 min-w-[240px] flex-1 basis-[320px] items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-3 focus-within:border-[#4e57d6] focus-within:shadow-[0_0_0_3px_#ececfc]">
                            <Search className="h-4 w-4 flex-none text-[#8b97ab]" strokeWidth={2}/>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") setSearch("");
                                }}
                                placeholder={t("szTracker.searchPlaceholder")}
                                aria-label={t("szTracker.searchPlaceholder")}
                                className="h-full min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-[#a3adbd]"
                            />
                            {search && (
                                <button type="button" onClick={() => setSearch("")}
                                        aria-label={t("general.clearFilter")}
                                        className="grid h-6 w-6 place-items-center rounded-md border-none bg-transparent text-[#a3adbd] cursor-pointer hover:bg-[#f2f5f9]">
                                    <X className="h-3.5 w-3.5" strokeWidth={2.2}/>
                                </button>
                            )}
                        </label>

                        {/* Чьи записки */}
                        <div role="radiogroup" aria-label={t("szTracker.filters.label")}
                             className="inline-flex h-10 items-center gap-0.5 rounded-[10px] border border-[#e5e9f0] bg-white p-1">
                            {sourceFilters.map((key) => {
                                const active = source === key;
                                const count = key === "all" ? total : key === "mine" ? mineCount : unitCount;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => setSource(key)}
                                        className={`inline-flex h-full items-center gap-1.5 rounded-[7px] border-none px-3 text-[12.5px] font-semibold cursor-pointer ${
                                            active ? "bg-[#ececfc] text-[#4e57d6]" : "bg-transparent text-[#55617a] hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                        {key === "mine" && <User className="h-3.5 w-3.5" strokeWidth={2}/>}
                                        {key === "unit" && <Building2 className="h-3.5 w-3.5" strokeWidth={2}/>}
                                        {t(`szTracker.filters.${key}`)}
                                        <span
                                            className={`font-mono text-[11.5px] ${active ? "text-[#4e57d6]" : "text-[#a3adbd]"}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Где затор */}
                        <ToggleChip
                            active={staleOnly}
                            onClick={() => setStaleOnly((v) => !v)}
                            icon={<Hourglass className="h-3.5 w-3.5" strokeWidth={2}/>}
                            label={t("szTracker.filters.stale")}
                            count={staleCount}
                            tone={colors.ryg.amber}
                        />
                        <ToggleChip
                            active={overdueOnly}
                            onClick={() => setOverdueOnly((v) => !v)}
                            icon={<AlertTriangle className="h-3.5 w-3.5" strokeWidth={2}/>}
                            label={t("szTracker.filters.overdue")}
                            count={overdueCount}
                            tone={colors.ryg.red}
                        />
                    </div>

                    {(filtering || switchedQuery) && (
                        <div
                            className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#8b97ab]">
                            {filtering && (
                                <>
                                <span>
                                    {found > 0 ? t("szTracker.foundOf", {
                                        n: found,
                                        total
                                    }) : t("szTracker.nothingFound")}
                                </span>
                                    <button type="button" onClick={resetFilters}
                                            className="border-none bg-transparent p-0 text-[12.5px] font-semibold text-[#4e57d6] cursor-pointer hover:underline">
                                        {t("szTracker.filters.reset")}
                                    </button>
                                </>
                            )}
                            {switchedQuery && (
                                <span
                                    className="text-[#55617a]">{t("szTracker.layoutHint", {query: switchedQuery})}</span>
                            )}
                        </div>
                    )}

                    {/* --- Колонки по стадиям --- */}
                    <DoubleScroll className="flex gap-3 overflow-x-auto pb-3">
                        {shown.map((col) => {
                            const isExpanded = expanded.has(col.code);
                            const visible = isExpanded ? col.items : col.items.slice(0, COLLAPSED_LIMIT);
                            const rest = col.items.length - visible.length;
                            const tone = STATUS_TONE[col.code as SzStatusCode] ?? colors.status.draft;
                            return (
                                <section key={col.code}
                                         className="shrink-0 w-[270px] min-h-[calc(100vh-280px)] rounded-[13px] bg-[#f6f8fb] border border-[#e5e9f0] flex flex-col">
                                    <div
                                        className="px-3.5 py-3 border-b border-[#e5e9f0] flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-0.5 min-w-0">
                                            <span
                                                className="inline-block max-w-full truncate rounded-full px-[9px] py-0.5 text-[11.5px] font-semibold"
                                                style={{color: tone.fg, background: tone.bg}}>
                                                {stageTitle(col.code, col.title)}
                                            </span>
                                            {col.code === "Draft" && (
                                                <HelpTooltip
                                                    className="-my-1"
                                                    content={board.canSeeOthersDrafts
                                                        ? t("szTracker.hints.draftsAdmin")
                                                        : t("szTracker.hints.drafts")}
                                                />
                                            )}
                                        </span>
                                        <span
                                            className="flex-none text-[12px] font-bold text-[#55617a] bg-white border border-[#e5e9f0] rounded-full px-2 py-0.5">
                                            {filtering ? `${col.items.length} / ${col.count}` : col.count}
                                        </span>
                                    </div>

                                    <div className="p-2.5 flex flex-col gap-2 flex-1 min-h-[60px]">
                                        {col.items.length === 0 && (
                                            <div className="text-[12px] text-[#a3adbd] text-center py-4">
                                                {filtering && col.count > 0 ? t("szTracker.noMatches") : t("szTracker.empty")}
                                            </div>
                                        )}
                                        {visible.map((it) => (
                                            <BoardCard key={it.id} item={it} words={words} kind={kindLabel(it)}/>
                                        ))}
                                        {(rest > 0 || (isExpanded && col.items.length > COLLAPSED_LIMIT)) && (
                                            <button
                                                type="button"
                                                onClick={() => toggleExpanded(col.code)}
                                                className="mt-0.5 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border-none bg-transparent text-[12px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#ececfc]"
                                            >
                                                {isExpanded ? (
                                                    <><ChevronUp className="h-3.5 w-3.5"
                                                                 strokeWidth={2.2}/>{t("szTracker.collapse")}</>
                                                ) : (
                                                    <><ChevronDown className="h-3.5 w-3.5"
                                                                   strokeWidth={2.2}/>{t("szTracker.showMore", {count: rest})}</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </DoubleScroll>
                </>
            )}
        </div>
    );
}

interface ToggleChipProps {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    label: string;
    count: number;
    tone: { fg: string; bg: string; bd: string };
}

/** Переключатель «только зависшие / только просроченные». */
function ToggleChip({active, onClick, icon, label, count, tone}: ToggleChipProps) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            disabled={count === 0 && !active}
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold cursor-pointer disabled:cursor-default disabled:opacity-50"
            style={active
                ? {color: tone.fg, background: tone.bg, borderColor: tone.bd}
                : {color: "#55617a", background: "#fff", borderColor: "#e5e9f0"}}
        >
            {icon}
            {label}
            <span className="font-mono text-[11.5px]" style={{color: active ? tone.fg : "#a3adbd"}}>{count}</span>
        </button>
    );
}

/** Карточка записки на доске. */
function BoardCard({item, words, kind}: { item: SzTrackerItem; words: string[]; kind: string }) {
    const {t} = useTranslation();

    const stageLabel = item.stageDays === 0
        ? t("szTracker.stageToday")
        : t("szTracker.stageFor", {days: t("time.days", {count: item.stageDays})});
    const stageTooltip = t("szTracker.stageTooltip", {
        date: localDate(item.stageSince),
        age: item.ageDays === 0 ? t("szTracker.today") : t("time.days", {count: item.ageDays}),
    });

    const toneClass = item.isOverdue
        ? "bg-white border-[#f1c9c2] hover:border-[#e8b0a6]"
        : item.isStale
            ? "bg-[#fefaf2] border-[#f0dcae] hover:border-[#e6c98a]"
            : "bg-white border-[#e9edf3] hover:border-[#d5dcf0]";

    return (
        <Link to={`/sz/${item.id}`}
              className={`block rounded-xl border p-3 no-underline transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-[0_8px_20px_-12px_rgba(31,45,90,0.35)] focus-visible:border-[#cbd3f5] ${toneClass}`}>
            <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11.5px] text-[#2f68f5] truncate">
                    {item.regNumber ? <Hl text={item.regNumber} words={words}/> : t("szTracker.draftNumber")}
                </span>
                <span className="text-[11px] font-semibold whitespace-nowrap"
                      title={stageTooltip}
                      style={{color: item.isStale ? colors.ryg.amber.fg : colors.inkFaint}}>
                    {stageLabel}
                </span>
            </div>
            <div className="mt-1 text-[12.5px] font-medium text-[#1c2740] leading-snug line-clamp-2">
                <Hl text={item.title} words={words}/>
            </div>
            <div className="mt-1 text-[11px] text-[#8b97ab] truncate">
                <Hl text={kind} words={words}/>
                {item.addresseeName && <> · <Hl text={item.addresseeName} words={words}/></>}
            </div>
            {item.authorName && (
                <div className="mt-0.5 text-[11px] text-[#a3adbd] truncate">
                    {t("szTracker.authorLabel")} <Hl text={item.authorName} words={words}/>
                </div>
            )}
            <CardBadges item={item}/>
        </Link>
    );
}

/** Срок исполнения и «зависла» — внизу карточки, только когда есть что сказать. */
function CardBadges({item}: { item: SzTrackerItem }) {
    const {t} = useTranslation();
    const badges: { key: string; text: string; tone: { fg: string; bg: string }; icon: ReactNode }[] = [];

    if (item.dueDate && item.daysLeft != null) {
        const icon = <CalendarClock className="h-3 w-3" strokeWidth={2.2}/>;
        if (item.isOverdue) {
            badges.push({
                key: "due", icon, tone: colors.ryg.red,
                text: t("szTracker.due.overdue", {days: t("time.days", {count: -item.daysLeft})}),
            });
        } else if (item.daysLeft === 0) {
            badges.push({key: "due", icon, tone: colors.ryg.amber, text: t("szTracker.due.today")});
        } else if (item.daysLeft <= DUE_SOON_DAYS) {
            badges.push({
                key: "due", icon, tone: colors.ryg.amber,
                text: t("szTracker.due.soon", {days: t("time.days", {count: item.daysLeft})}),
            });
        } else {
            badges.push({
                key: "due", icon, tone: {fg: colors.inkMuted, bg: colors.surfaceAlt},
                text: t("szTracker.due.date", {date: formatDate(item.dueDate)}),
            });
        }
    }
    if (item.isStale) {
        badges.push({
            key: "stale", tone: colors.ryg.amber, text: t("szTracker.staleBadge"),
            icon: <Hourglass className="h-3 w-3" strokeWidth={2.2}/>,
        });
    }
    if (badges.length === 0) return null;

    return (
        <div className="mt-2 flex flex-wrap gap-1">
            {badges.map((b) => (
                <span key={b.key}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-[1px] text-[10.5px] font-semibold leading-[16px]"
                      style={{color: b.tone.fg, background: b.tone.bg}}>
                    {b.icon}
                    {b.text}
                </span>
            ))}
        </div>
    );
}
