// «История действий» в профиле пользователя: поиск с подсветкой, период (с/по), фильтр по
// видам действий (цвет точки — вид, расшифровка — легенда у "?", как в журнале аудита ВНД).
//
// Всё фильтруется на сервере, лента грузится страницами по 20 (курсор) и догружается при
// прокрутке до конца списка — вся история целиком не тянется никогда.
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {CircleHelp, Search, X} from "lucide-react";

import {userService} from "@/service/userService/userService.ts";
import type {UserActivityItem} from "@/service/userService/userServiceType.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {LightTooltip} from "@/components/componentsGeneral/tooltips/LightTooltip.tsx";
import {
    USER_ACTIVITY_KINDS,
    getUserActivityKind,
    type UserActivityKindKey,
    type UserActivityKindMeta,
} from "@/components/componentsUsers/userActivityKinds.ts";

const PAGE_SIZE = 20;
/** Пауза после ввода в поиск, прежде чем идти на сервер */
const SEARCH_DEBOUNCE_MS = 300;

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * "дд.мм.гггг" (как в календаре) -> "гггг-мм-ддTчч:мм:сс" (как ждёт бэкенд).
 * Пока дата введена не полностью или такой даты нет (31.02) — undefined.
 */
function displayDateToIso(v: string, time: string): string | undefined {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v);
    if (!m) return undefined;
    const [, dd, mo, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mo) - 1, Number(dd));
    if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mo) - 1 || d.getDate() !== Number(dd)) {
        return undefined;
    }
    return `${yyyy}-${mo}-${dd}T${time}`;
}

function KindDot({kind, size = 7}: { kind: UserActivityKindMeta; size?: number }) {
    return <span className="block flex-none rounded-full" style={{width: size, height: size, background: kind.color}}/>;
}

/** Белая подсказка у "?": что означает каждый цвет точки — и сразу фильтр. Клик по виду
 * включает/выключает его (как чипсы), рядом — сколько таких действий за выбранный период. */
function KindLegend({counts, selected, onToggle, onReset}: {
    counts: Record<string, number>;
    selected: UserActivityKindKey[];
    onToggle: (key: UserActivityKindKey) => void;
    onReset: () => void;
}) {
    const {t} = useTranslation();
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-[13px] font-bold text-[#1c2740]">{t("userProfile.activityLegendTitle")}</span>
                {selected.length > 0 && (
                    <button type="button" onClick={onReset}
                            className="cursor-pointer text-[11.5px] font-semibold text-[#4e57d6] hover:underline">
                        {t("userProfile.activityLegendShowAll")}
                    </button>
                )}
            </div>
            <div className="mb-2.5 text-[11.5px] text-[#8b97ab]">{t("userProfile.activityLegendHint")}</div>
            <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2">
                {USER_ACTIVITY_KINDS.map((kind) => {
                    const count = counts[kind.key] ?? 0;
                    const active = selected.includes(kind.key);
                    return (
                        <li key={kind.key}>
                            <button type="button" disabled={count === 0 && !active} aria-pressed={active}
                                    onClick={() => onToggle(kind.key)}
                                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-[9px] border px-2.5 py-2 text-left transition-colors disabled:cursor-default disabled:opacity-45 ${
                                        active
                                            ? "border-[#4e57d6]/50 bg-[#f1f1fd]"
                                            : "border-transparent hover:border-[#e5e9f0] hover:bg-[#f6f8fb] disabled:hover:border-transparent disabled:hover:bg-transparent"
                                    }`}>
                                <span className="mt-[5px]"><KindDot kind={kind} size={9}/></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 font-semibold text-[#26324a]">
                                        <span className="min-w-0">{t(`userProfile.activityKinds.${kind.key}.label`)}</span>
                                        <span className={`ml-auto flex-none rounded-full px-1.5 text-[10.5px] font-bold ${
                                            active ? "bg-[#4e57d6] text-white" : "bg-[#eef1f5] text-[#6b7891]"
                                        }`}>{count}</span>
                                    </span>
                                    <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-[#6b7891]">
                                        {t(`userProfile.activityKinds.${kind.key}.description`)}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

interface UserActivityHistoryProps {
    userId: number;
}

export function UserActivityHistory({userId}: UserActivityHistoryProps) {
    const {t} = useTranslation();

    // --- Фильтры ---
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [kinds, setKinds] = useState<UserActivityKindKey[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    const fromIso = displayDateToIso(dateFrom, "00:00:00");
    // "По" включительно: до конца выбранного дня
    const toIso = displayDateToIso(dateTo, "23:59:59");
    // Подсветка — сразу по тому, что набрано (не ждём ответа сервера)
    const terms = useMemo(() => splitSearchTerms(query), [query]);

    // --- Данные ---
    const [items, setItems] = useState<UserActivityItem[]>([]);
    const [kindCounts, setKindCounts] = useState<Record<string, number>>({});
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(false);

    // Ответ на устаревший запрос (фильтр уже сменили) — игнорируем
    const requestId = useRef(0);
    const listRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const filterParams = useMemo(() => ({
        from: fromIso,
        to: toIso,
        search: debouncedQuery || undefined,
        kinds: kinds.length > 0 ? kinds : undefined,
        pageSize: PAGE_SIZE,
    }), [fromIso, toIso, debouncedQuery, kinds]);

    // Первая страница — при открытии и при любой смене фильтра
    useEffect(() => {
        const id = ++requestId.current;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(false);
        listRef.current?.scrollTo({top: 0});
        userService
            .getActivity(userId, filterParams)
            .then((data) => {
                if (id !== requestId.current) return;
                setItems(data.recent);
                setHasMore(Boolean(data.hasMore));
                setNextCursor(data.nextCursor ?? null);
                if (data.kindCounts) setKindCounts(data.kindCounts);
            })
            .catch(() => {
                if (id !== requestId.current) return;
                setItems([]);
                setHasMore(false);
                setNextCursor(null);
                setError(true);
            })
            .finally(() => {
                if (id === requestId.current) setLoading(false);
            });
    }, [userId, filterParams]);

    // Следующая страница
    const loadMore = useCallback(() => {
        if (!hasMore || !nextCursor || loading || loadingMore) return;
        const id = requestId.current;
        setLoadingMore(true);
        userService
            .getActivity(userId, {...filterParams, cursor: nextCursor})
            .then((data) => {
                if (id !== requestId.current) return;
                setItems((prev) => [...prev, ...data.recent]);
                setHasMore(Boolean(data.hasMore));
                setNextCursor(data.nextCursor ?? null);
            })
            .catch(() => {
                if (id !== requestId.current) return;
                setHasMore(false);
            })
            .finally(() => setLoadingMore(false));
    }, [userId, filterParams, hasMore, nextCursor, loading, loadingMore]);

    // Догрузка, когда низ списка показался в области прокрутки
    useEffect(() => {
        const root = listRef.current;
        const sentinel = sentinelRef.current;
        if (!root || !sentinel || !hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) loadMore();
            },
            {root, rootMargin: "120px"},
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const toggleKind = (key: UserActivityKindKey) =>
        setKinds((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);

    const hasFilters = query.trim() !== "" || dateFrom !== "" || dateTo !== "" || kinds.length > 0;
    const reset = () => {
        setQuery("");
        setDebouncedQuery("");
        setDateFrom("");
        setDateTo("");
        setKinds([]);
    };

    // Чипсы — только для видов, которые есть за период (или уже выбраны)
    const availableKinds = USER_ACTIVITY_KINDS.filter(
        (kind) => (kindCounts[kind.key] ?? 0) > 0 || kinds.includes(kind.key),
    );
    const totalForFilter = kinds.length > 0
        ? kinds.reduce((sum, k) => sum + (kindCounts[k] ?? 0), 0)
        : Object.values(kindCounts).reduce((sum: number, n: number) => sum + n, 0);

    return (
        <div className="flex max-h-[600px] flex-col overflow-hidden rounded-2xl border border-[#e9edf3] bg-white lg:absolute lg:inset-0 lg:max-h-none">
            <div className="shrink-0 px-[22px] pt-[17px] pb-[14px] border-b border-[#eef2f7] flex items-center gap-[9px]">
                <h2 className="m-0 text-[15px] font-bold">{t("userProfile.activityTitle")}</h2>
                {/* Что означают цвета точек — белая подсказка-легенда (она же фильтр) */}
                <LightTooltip width={Math.min(600, window.innerWidth - 16)} content={
                    <KindLegend counts={kindCounts} selected={kinds}
                                onToggle={toggleKind} onReset={() => setKinds([])}/>
                }>
                    <button type="button" aria-label={t("userProfile.activityLegendTitle")}
                            className="cursor-help grid h-5 w-5 place-items-center rounded-full text-[#a3adbd] hover:bg-[#ececfc] hover:text-[#4e57d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cbddff]">
                        <CircleHelp size={15} strokeWidth={2}/>
                    </button>
                </LightTooltip>
            </div>

            {/* Поиск и фильтры — не прокручиваются вместе со списком */}
            <div className="shrink-0 flex flex-col gap-2.5 border-b border-[#eef2f7] bg-[#fbfcfe] px-[22px] py-3">
                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a3adbd]"/>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("userProfile.activitySearchPlaceholder")}
                        aria-label={t("userProfile.activitySearchPlaceholder")}
                        className="h-[36px] w-full box-border rounded-[8px] border border-[#e5e9f0] bg-white pl-8 pr-8 text-[12.5px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                    />
                    {query !== "" && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Tooltip content={t("userProfile.activitySearchClear")} side="top">
                                <button type="button" onClick={() => setQuery("")}
                                        aria-label={t("userProfile.activitySearchClear")}
                                        className="cursor-pointer grid h-5 w-5 place-items-center rounded-full text-[#a3adbd] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                                    <X size={13}/>
                                </button>
                            </Tooltip>
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            {t("userProfile.activityFrom")}
                        </span>
                        <DatePickerInput value={dateFrom} onChange={setDateFrom}/>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            {t("userProfile.activityTo")}
                        </span>
                        <DatePickerInput value={dateTo} onChange={setDateTo}/>
                    </label>
                </div>

                {availableKinds.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {availableKinds.map((kind) => {
                            const active = kinds.includes(kind.key);
                            return (
                                <button key={kind.key} type="button" onClick={() => toggleKind(kind.key)} aria-pressed={active}
                                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold transition-colors ${
                                            active
                                                ? "border-[#4e57d6] bg-[#ececfc] text-[#4e57d6]"
                                                : "border-[#e5e9f0] bg-white text-[#55617a] hover:border-[#4e57d6]/40 hover:bg-[#f6f8fb]"
                                        }`}>
                                    <KindDot kind={kind}/>
                                    {t(`userProfile.activityKinds.${kind.key}.label`)}
                                    <span className="text-[10.5px] font-bold opacity-70">{kindCounts[kind.key] ?? 0}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 text-[11.5px] text-[#8b97ab]">
                    {/* Показано N из M */}
                    <span>{loading ? " " : t("userProfile.activityShown", {shown: items.length, total: totalForFilter})}</span>
                    {hasFilters && (
                        <button type="button" onClick={reset}
                                className="cursor-pointer font-semibold text-[#4e57d6] hover:underline">
                            {t("userProfile.activityReset")}
                        </button>
                    )}
                </div>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-[18px] pt-[2px]">
                {loading ? (
                    <div className="py-7 text-center text-[#a3adbd] text-[13px]">{t("userProfile.loading")}</div>
                ) : error ? (
                    <div className="py-7 text-center text-[#c0392b] text-[13px]">{t("userProfile.activityLoadError")}</div>
                ) : items.length === 0 ? (
                    <div className="py-7 text-center text-[#a3adbd] text-[13px]">
                        {hasFilters ? t("userProfile.activityNothingFound") : t("userProfile.noActivity")}
                    </div>
                ) : (
                    <>
                        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-[#f1f4f8]">
                            {items.map((item, idx) => {
                                const kind = getUserActivityKind(item);
                                return (
                                    <li key={`${item.type}-${item.timestamp}-${idx}`} className="flex items-start gap-3 py-[11px]">
                                        {/* Точка = вид действия; при наведении — расшифровка */}
                                        <span className="mt-[5px] flex-none">
                                            <LightTooltip side="top" align="start" width={260} content={
                                                <span className="flex items-start gap-2">
                                                    <span className="mt-[5px]"><KindDot kind={kind} size={8}/></span>
                                                    <span>
                                                        <span className="block font-semibold text-[#26324a]">
                                                            {t(`userProfile.activityKinds.${kind.key}.label`)}
                                                        </span>
                                                        <span className="block text-[11.5px] text-[#6b7891]">
                                                            {t(`userProfile.activityKinds.${kind.key}.description`)}
                                                        </span>
                                                    </span>
                                                </span>
                                            }>
                                                <span className="block cursor-help p-[2px] -m-[2px]"><KindDot kind={kind} size={8}/></span>
                                            </LightTooltip>
                                        </span>
                                        <div className="min-w-0">
                                            <div className="text-[13px] text-[#1c2740]">
                                                <HighlightSubstrings text={item.description} terms={terms}/>
                                                {item.vndCode && (
                                                    <span className="text-[#6b7688]"> · <HighlightSubstrings
                                                        text={item.vndCode} terms={terms}/></span>
                                                )}
                                            </div>
                                            {item.vndTitle && (
                                                <div className="truncate text-[12px] text-[#8b97ab]">
                                                    <HighlightSubstrings text={item.vndTitle} terms={terms}/>
                                                </div>
                                            )}
                                            <div className="text-[11px] text-[#a3adbd]">{formatDateTime(item.timestamp)}</div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Низ списка: сюда смотрит IntersectionObserver; кнопка — запасной путь */}
                        <div ref={sentinelRef}/>
                        {hasMore && (
                            <div className="pt-3 text-center">
                                <button type="button" onClick={loadMore} disabled={loadingMore}
                                        className="cursor-pointer inline-flex items-center h-[32px] px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[12px] font-semibold text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-default disabled:opacity-60">
                                    {loadingMore ? t("userProfile.loading") : t("userProfile.activityLoadMore")}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
