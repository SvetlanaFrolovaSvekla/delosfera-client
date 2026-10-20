// Страница "Активность на портале" — развёрнутая версия виджета "Последняя активность"
// Та же страница открывается и в "Управление → Наблюдение" (embedded) - компактнее и с пояснением,
// чем лента отличается от "Технического журнала действий".
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link, useNavigate} from "react-router-dom";
import type {ActivityIcon} from "@/service/activityLogService/activityLogServiceType.ts";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useActivityFeed} from "@/hooks/activityLogHooks/useActivityFeed.ts";
import {formatDateTime, parseDDMMYYYY, timeAgo} from "@/utils/dateUtils.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {LightTooltip} from "@/components/componentsGeneral/tooltips/LightTooltip.tsx";
import {ActivityVsAuditNote} from "@/components/componentsGeneral/knowledgeBaseComponents/ActivityVsAuditNote.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Icon} from "@/assets/icons/Icon";
import {CircleHelp, Loader2, Lock, ScrollText, Search, X} from "lucide-react";


const ICON_STYLE: Record<ActivityIcon, { iconName: string; col: string; bg: string }> = {
    check: {iconName: "check", col: "#1c7a4d", bg: "#e2f4ea"},
    x: {iconName: "x", col: "#c0392b", bg: "#fbe7e4"},
    doc: {iconName: "vnd", col: "#2f68f5", bg: "#e9f0ff"},
    clock: {iconName: "clock", col: "#7a5ce0", bg: "#efeafe"},
    // Правки/изменения (записки, заявки, маршруты и т.п.) — тот же цвет, что и
    // у карандаша в "Истории" на карточке документа (DocumentHistory.tsx).
    edit: {iconName: "edit", col: "#55617a", bg: "#eef1f5"},
    info: {iconName: "info", col: "#6b7280", bg: "#f1f2f4"},
    // Удаление черновика — красная мусорка, тот же красный, что и у "x".
    trash: {iconName: "trash", col: "#c0392b", bg: "#fbe7e4"},
};

/** Порядок типов событий в фильтре */
const ICON_ORDER: ActivityIcon[] = ["doc", "check", "x", "clock", "edit", "trash", "info"];

// Те же разделы, что и в виджете "Последняя активность" на главной.
const SECTIONS: { id: string; label: string; module?: string }[] = [
    {id: "all", label: "Все"},
    {id: "vnd", label: "ВНД", module: "vnd"},
    {id: "sz", label: "СЗ", module: "sz"},
    {id: "prc", label: "Закупки", module: "prc"},
];

const PAGE_SIZE = 30;

/** "дд.мм.гггг" -> ISO начала (или конца) этого дня по местному времени; неполная дата - нет отбора */
function dayBoundaryIso(value: string, endOfDay: boolean): string | undefined {
    const d = parseDDMMYYYY(value);
    if (!d) return undefined;
    return (endOfDay
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

interface ActivityFeedPageProps {
    /** Открыта внутри "Управление → Наблюдение": без своих отступов страницы, заголовок
     * помельче, сверху - чем лента отличается от "Технического журнала действий". */
    embedded?: boolean;
}

export function ActivityFeedPage({embedded = false}: ActivityFeedPageProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [section, setSection] = useState<string>("all");
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [icons, setIcons] = useState<ActivityIcon[]>([]);

    // Запрос на сервер - не на каждую букву, а когда пользователь остановился
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
        return () => clearTimeout(timer);
    }, [query]);

    const activeModule = SECTIONS.find((s) => s.id === section)?.module;
    const from = dayBoundaryIso(dateFrom, false);
    const to = dayBoundaryIso(dateTo, true);
    const {items, hasMore, isLoading, isLoadingMore, error, loadMore} = useActivityFeed(
        {module: activeModule, q: debouncedQuery || undefined, from, to, icons}, PAGE_SIZE,
    );

    // Подсвечиваем то, по чему сервер уже отобрал (а не то, что ещё печатается)
    const terms = useMemo(() => splitSearchTerms(debouncedQuery), [debouncedQuery]);
    const hasFilters = query.trim() !== "" || dateFrom !== "" || dateTo !== "" || icons.length > 0;

    const toggleIcon = (icon: ActivityIcon) =>
        setIcons((prev) => prev.includes(icon) ? prev.filter((x) => x !== icon) : [...prev, icon]);

    const reset = () => {
        setQuery("");
        setDebouncedQuery("");
        setDateFrom("");
        setDateTo("");
        setIcons([]);
    };

    return (
        // Те же отступы и шапка, что у остальных страниц "Наблюдения" (как "Пожелания и замечания")
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("activityFeed.title")}
                description={t("activityFeed.subtitle")}
                // В "Наблюдении" кнопки нет - "Технический журнал действий" там соседний пункт меню
                actions={embedded ? undefined : <TechnicalLogButton/>}
            />
            {/* Чем отличается от технического журнала - свёрнуто по умолчанию */}
            {embedded && <ActivityVsAuditNote current="activity" className="mb-5"/>}
            <div className="flex flex-wrap gap-2 mb-5">
                {SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        className="cursor-pointer rounded-full px-3 py-[5px] text-[12px] font-semibold transition-colors"
                        style={{
                            border: `1px solid ${section === s.id ? "#2f68f5" : "#e5e9f0"}`,
                            background: section === s.id ? "#eef3ff" : "#fff",
                            color: section === s.id ? "#2f68f5" : "#55617a",
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Поиск и фильтры */}
            <section
                className="flex flex-col gap-3 rounded-[14px] border border-[#e9edf3] bg-white px-[18px] py-[14px] mb-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_170px_170px]">
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            {t("activityFeed.searchLabel")}
                        </span>
                        <span className="relative block">
                            <Search size={14}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a3adbd]"/>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t("activityFeed.searchPlaceholder")}
                                className="h-[36px] w-full box-border rounded-[8px] border border-[#e5e9f0] bg-white pl-8 pr-8 text-[12.5px] text-[#1c2740] outline-none focus:border-[#2f68f5]"
                            />
                            {query !== "" && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <Tooltip content={t("activityFeed.clearSearch")} side="top">
                                        <button type="button" onClick={() => setQuery("")}
                                                aria-label={t("activityFeed.clearSearch")}
                                                className="cursor-pointer grid h-5 w-5 place-items-center rounded-full text-[#a3adbd] hover:bg-[#eef3ff] hover:text-[#2f68f5]">
                                            <X size={13}/>
                                        </button>
                                    </Tooltip>
                                </span>
                            )}
                        </span>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            {t("activityFeed.dateFrom")}
                        </span>
                        <DatePickerInput value={dateFrom} onChange={setDateFrom}/>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                            {t("activityFeed.dateTo")}
                        </span>
                        <DatePickerInput value={dateTo} onChange={setDateTo}/>
                    </label>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                        {t("activityFeed.typeLabel")}
                    </span>
                    {ICON_ORDER.map((icon) => {
                        const style = ICON_STYLE[icon];
                        const active = icons.includes(icon);
                        return (
                            <button key={icon} type="button" onClick={() => toggleIcon(icon)} aria-pressed={active}
                                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border py-[3px] pl-[3px] pr-2.5 text-[12px] font-semibold transition-colors ${
                                        active
                                            ? "border-[#2f68f5] bg-[#eef3ff] text-[#2f68f5]"
                                            : "border-[#e5e9f0] bg-white text-[#55617a] hover:border-[#2f68f5]/40 hover:bg-[#f6f8fb]"
                                    }`}>
                                <span className="grid h-[20px] w-[20px] place-items-center rounded-full"
                                      style={{background: style.bg, color: style.col}}>
                                    <Icon name={style.iconName} width={11} height={11}/>
                                </span>
                                {t(`activityFeed.types.${icon}`)}
                            </button>
                        );
                    })}
                    {hasFilters && (
                        <button type="button" onClick={reset}
                                className="ml-auto cursor-pointer text-[12px] font-semibold text-[#2f68f5] hover:underline">
                            {t("activityFeed.reset")}
                        </button>
                    )}
                </div>
            </section>

            <section
                className="overflow-hidden rounded-[14px] border border-[#e9edf3] bg-white px-[18px] pb-[14px] pt-1.5">
                {isLoading ? (
                    // Загрузка активности…
                    <Loader label={t("activityFeed.loading")} fullHeight={false}/>
                ) : error ? (
                    <div className="py-6 text-center text-[13px] text-[#c0392b]">{error}</div>
                ) : items.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-[#8b97ab]">
                        {/* По этому отбору ничего нет / Пока нет событий */}
                        {hasFilters ? t("activityFeed.noResults") : t("activityFeed.empty")}
                    </div>
                ) : (
                    <>
                        {items.map((item) => {
                            const style = ICON_STYLE[item.icon] ?? ICON_STYLE.info;
                            // canOpen=false — запись о чужом черновике ВНД, который у пользователя нет
                            // прав открыть (см. тот же приём в RecentActivityCard.tsx на главной, и
                            // ActivityLogService.CanOpenVndEntry на бэке).
                            const locked = !item.canOpen;
                            return (
                                <div
                                    key={`${item.module}-${item.id}`}
                                    onClick={locked ? undefined : () => navigate(item.url)}
                                    title={locked ? "Черновик недоступен — нет прав на просмотр чужих черновиков" : undefined}
                                    className={
                                        "flex gap-[11px] border-t border-[#f3f6f9] py-[9px] first:border-t-0 " +
                                        (locked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#fafbfc]")
                                    }
                                >
                                    <span
                                        className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px]"
                                        style={locked ? {
                                            background: "#eef1f5",
                                            color: "#8b97ab"
                                        } : {background: style.bg, color: style.col}}
                                    >
                                        {locked ? <Lock className="h-3.5 w-3.5"/> :
                                            <Icon name={style.iconName} width={14} height={14}/>}
                                    </span>
                                    <div className="min-w-0">
                                        {/* whitespace-pre-line — сервер разносит длинный список изменённых
                                            реквизитов по строкам через \n (см. VndService.BuildChangedFieldsList) */}
                                        <div className="whitespace-pre-line text-[12.5px] leading-[1.4] text-[#26324a]">
                                            <HighlightSubstrings text={item.text} terms={terms}/>
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-[#8b97ab]">
                                            {timeAgo(item.createdAt, t)}
                                            {/* Точная дата - чтобы было видно, как запись легла в выбранный период */}
                                            <span className="text-[#b4bdcc]"> · {formatDateTime(item.createdAt)}</span>
                                            {locked && " · нет доступа"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {hasMore && (
                            <div className="flex justify-center border-t border-[#f3f6f9] pt-3">
                                <button type="button" onClick={loadMore} disabled={isLoadingMore}
                                        className="cursor-pointer inline-flex items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#2f68f5] hover:bg-[#eef3ff] disabled:cursor-default disabled:opacity-60">
                                    {isLoadingMore && <Loader2 size={14} className="animate-spin"/>}
                                    {t("activityFeed.loadMore")}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

/** Кнопка "Технический журнал действий" - только у тех, кому он открыт (право "Управление
 * пользователями", как и у самой страницы /management/audit). Рядом "?" - почему она видна. */
function TechnicalLogButton() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    if (!hasPermission(PermissionCode.ManageUsers)) return null;

    return (
        <span className="inline-flex items-center gap-2">
            <Link to="/management/audit"
                  className="inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[var(--app-accent,_#2f68f5)] px-[18px] text-[13.5px] font-semibold text-white! no-underline shadow-[0_6px_16px_-6px_var(--app-accent,_#2f68f5)] hover:text-white! hover:brightness-[1.06]">
                <ScrollText size={18} strokeWidth={2}/>
                {t("activityFeed.technicalLog.button")}
            </Link>
            <LightTooltip align="end" width={320} content={
                <div>
                    <div className="mb-1 font-semibold text-[#1c2740]">{t("activityFeed.technicalLog.whyTitle")}</div>
                    <div className="text-[12px] text-[#55617a]">{t("activityFeed.technicalLog.whyText")}</div>
                </div>
            }>
                <button type="button" aria-label={t("activityFeed.technicalLog.whyTitle")}
                        className="cursor-help grid h-6 w-6 place-items-center rounded-full text-[#a3adbd] hover:bg-[#eef3ff] hover:text-[#2f68f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cbddff]">
                    <CircleHelp size={15} strokeWidth={2}/>
                </button>
            </LightTooltip>
        </span>
    );
}
