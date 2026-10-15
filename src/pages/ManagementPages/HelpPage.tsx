// Инструкции по работе с системой "Как работать в системе"
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {
    helpService,
    SECTION_ORDER,
    type HelpArticle,
    type HelpArticleBrief,
    type HelpBlock,
    type HelpSection,
} from "@/service/helpService/helpService.ts";
import {toast} from "@/service/toastService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {HelpArticleView} from "@/components/componentsHelp/HelpArticleView.tsx";
import {HelpArticleEditor} from "@/components/componentsHelp/HelpArticleEditor.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";

import {
    ArrowRight, BookOpen, Clock3, Compass, FileText, Layers, Pencil, PenLine, Plus, Search, Settings,
    ShoppingCart, Trash2, Users, type LucideIcon,
} from "lucide-react";

/** Иконка раздела — чтобы оглавление читалось глазами, а не только по заголовкам. */
const SECTION_ICON: Record<HelpSection, LucideIcon> = {
    Start: Compass,
    Sz: FileText,
    Vnd: BookOpen,
    Procurement: ShoppingCart,
    Signing: PenLine,
    Meetings: Users,
    Administration: Settings,
};

/** С какой длины запроса искать ещё и в тексте статей (одна буква совпадает почти везде). */
const BODY_SEARCH_MIN = 2;

const BTN_PRIMARY =
    "inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white " +
    "font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]";

const BTN_SECONDARY =
    "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] " +
    "font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]";

/** Плашка-счётчик в шапке (статьи, разделы, черновики). */
const STAT_CHIP =
    "inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#e5e9f0] bg-white px-3 text-[12.5px]";

/** Весь текст статьи по кусочкам — для поиска по содержанию. */
function bodyText(body: HelpBlock[]): string[] {
    const parts: string[] = [];
    for (const block of body) {
        switch (block.kind) {
            case "text":
            case "note":
                parts.push(block.text);
                break;
            case "steps":
                parts.push(...block.items);
                break;
            case "link":
            case "vnd":
                parts.push(block.label);
                break;
            case "image":
                if (block.caption) parts.push(block.caption);
                for (const m of block.markers ?? []) if (m.text) parts.push(m.text);
                break;
            case "file":
                parts.push(block.fileName);
                break;
        }
    }
    return parts.filter(Boolean);
}

/** Отрывок вокруг первого совпадения — чтобы в оглавлении было видно, где нашлось. */
function snippet(parts: string[], query: string, radius = 48): string | null {
    const q = query.toLowerCase();
    for (const part of parts) {
        const at = part.toLowerCase().indexOf(q);
        if (at < 0) continue;
        const start = Math.max(0, at - radius);
        const end = Math.min(part.length, at + query.length + radius);
        return `${start > 0 ? "…" : ""}${part.slice(start, end).trim()}${end < part.length ? "…" : ""}`;
    }
    return null;
}

/** Название и описание статьи на языке интерфейса: кыргызские — если заполнены, иначе русские. */
function localized(article: HelpArticleBrief, language: string) {
    const kg = language === "ky";
    return {
        title: (kg && article.titleKg) || article.titleRu,
        summary: (kg && article.summaryKg) || article.summaryRu,
    };
}

interface Match {
    article: HelpArticleBrief;
    /** Отрывок текста статьи с совпадением — если нашлось не в названии/описании. */
    bodySnippet: string | null;
}

export function HelpPage() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const articleRef = useRef<HTMLElement>(null);
    const language = i18n.language;

    const [toc, setToc] = useState<HelpArticleBrief[]>([]);
    const [canEdit, setCanEdit] = useState(false);
    const [openArticle, setOpenArticle] = useState<HelpArticle | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [articleLoading, setArticleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** Полные тексты статей для поиска по содержанию: грузятся один раз, при первом поиске. */
    const [fullTexts, setFullTexts] = useState<Map<number, string[]> | null>(null);
    const [indexing, setIndexing] = useState(false);

    /** Открыт редактор: либо новая статья, либо правка открытой. */
    const [editing, setEditing] = useState<HelpArticle | "new" | null>(null);
    const [deleting, setDeleting] = useState<HelpArticleBrief | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const load = useCallback(async (selectId?: number) => {
        try {
            setLoading(true);
            setError(null);

            const {articles, mayEdit} = await helpService.index(true);
            setToc(articles);
            setCanEdit(mayEdit);
            setFullTexts(null); // статьи могли измениться — индекс поиска собираем заново

            const id = selectId ?? openArticle?.id ?? articles[0]?.id;
            setOpenArticle(id ? await helpService.article(id) : null);
        } catch {
            setError(t("help.page.loadError"));
        } finally {
            setLoading(false);
        }
    }, [openArticle?.id, t]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); /* один раз при входе */ // eslint-disable-next-line
    }, []);

    const query = search.trim();

    // Ссылка на текущее оглавление: если пока шла загрузка текстов статьи успели перезагрузить
    // (сохранение, удаление), устаревший индекс не применяем.
    const tocRef = useRef(toc);
    useEffect(() => { tocRef.current = toc; }, [toc]);
    const indexingRef = useRef(false);

    // Поиск по тексту статей: оглавление знает только названия и описания, поэтому при первом
    // запросе забираем статьи целиком (их немного) и дальше ищем по ним без запросов к серверу.
    useEffect(() => {
        if (query.length < BODY_SEARCH_MIN || fullTexts !== null || indexingRef.current || toc.length === 0) return;

        const tocAtStart = toc;
        indexingRef.current = true;
        setIndexing(true);
        Promise.all(toc.map((a) => helpService.article(a.id).then((full) => [a.id, bodyText(full.body)] as const)))
            .then((pairs) => { if (tocRef.current === tocAtStart) setFullTexts(new Map(pairs)); })
            .catch(() => { if (tocRef.current === tocAtStart) setFullTexts(new Map()); })
            .finally(() => {
                indexingRef.current = false;
                setIndexing(false);
            });
    }, [query, fullTexts, toc]);

    const openArticleById = async (id: number) => {
        try {
            setError(null);
            setArticleLoading(true);
            setOpenArticle(await helpService.article(id));
        } catch {
            setError(t("help.page.openError"));
            toast.error(t("help.page.openError"));
        } finally {
            setArticleLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            setDeleteBusy(true);
            await helpService.remove(deleting.id);
            toast.success(t("help.toast.deleted"), localized(deleting, language).title);
            setDeleting(null);
            setOpenArticle(null);
            await load();
        } catch {
            toast.error(t("help.toast.deleteFailed"));
        } finally {
            setDeleteBusy(false);
        }
    };

    const matches: Match[] = useMemo(() => {
        if (!query) return toc.map((article) => ({article, bodySnippet: null}));

        const q = query.toLowerCase();
        const result: Match[] = [];
        for (const article of toc) {
            const {title, summary} = localized(article, language);
            const inTitle = title.toLowerCase().includes(q)
                || (summary ?? "").toLowerCase().includes(q)
                || article.titleRu.toLowerCase().includes(q);
            const body = fullTexts?.get(article.id);
            const bodySnippet = body && query.length >= BODY_SEARCH_MIN ? snippet(body, query) : null;
            if (inTitle || bodySnippet) result.push({article, bodySnippet: inTitle ? null : bodySnippet});
        }
        return result;
    }, [toc, query, fullTexts, language]);

    const bySection = useMemo(() => {
        const map = new Map<HelpSection, Match[]>();
        for (const m of matches) {
            const list = map.get(m.article.section) ?? [];
            list.push(m);
            map.set(m.article.section, list);
        }
        return map;
    }, [matches]);

    const draftsCount = toc.filter((a) => !a.isPublished).length;
    const sectionsCount = new Set(toc.map((a) => a.section)).size;

    // Открыли статью при активном поиске — прокручиваем к первому совпадению в тексте.
    const scrollToFirstMatch = useCallback(() => {
        const mark = articleRef.current?.querySelector("article mark");
        mark?.scrollIntoView({behavior: "smooth", block: "center"});
    }, []);

    useEffect(() => {
        if (!query || !openArticle) return;
        const timer = window.setTimeout(scrollToFirstMatch, 60);
        return () => window.clearTimeout(timer);
    }, [openArticle, query, scrollToFirstMatch]);

    const opened = openArticle ? localized(openArticle, language) : null;
    const openArticleHasMatch = !!(openArticle && opened && query && (
        opened.title.toLowerCase().includes(query.toLowerCase())
        || (opened.summary ?? "").toLowerCase().includes(query.toLowerCase())
        || bodyText(openArticle.body).some((p) => p.toLowerCase().includes(query.toLowerCase()))));

    // Сводка — слева от кнопки «Новая статья»: сколько всего материала и что ещё не опубликовано.
    const stats = !loading && toc.length > 0 ? (
        <>
            <span className={STAT_CHIP}>
                <BookOpen className="h-[15px] w-[15px] text-[#4e57d6]" strokeWidth={2}/>
                <span className="font-semibold text-[#0f1b2d]">{toc.length}</span>
                <span className="text-[#8b97ab]">{t("help.stats.articles", {count: toc.length})}</span>
            </span>
            <span className={STAT_CHIP}>
                <Layers className="h-[15px] w-[15px] text-[#4e57d6]" strokeWidth={2}/>
                <span className="font-semibold text-[#0f1b2d]">{sectionsCount}</span>
                <span className="text-[#8b97ab]">{t("help.stats.sections", {count: sectionsCount})}</span>
            </span>
            {canEdit && draftsCount > 0 && (
                <Tooltip content={t("help.stats.draftsHint")}>
                    <span className={`${STAT_CHIP} !border-[#f0dcae] !bg-[#fdf6e7] text-[#8a5a00]`}>
                        <span className="font-semibold">{draftsCount}</span>
                        {t("help.stats.drafts", {count: draftsCount})}
                    </span>
                </Tooltip>
            )}
        </>
    ) : null;

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("help.page.title")}
                description={t("help.page.description")}
                actions={stats || canEdit ? (
                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                        {stats}
                        {canEdit && (
                            <button type="button" onClick={() => setEditing("new")} className={BTN_PRIMARY}>
                                <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                                {t("help.page.newArticle")}
                            </button>
                        )}
                    </div>
                ) : undefined}
            />

            {error && (
                <div className="mb-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,340px)_1fr]">
                {/* Оглавление */}
                <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
                    <div className="flex items-center gap-1">
                        <SearchBar
                            value={search}
                            onChange={setSearch}
                            variant="white"
                            placeholder={t("help.search.placeholder")}
                        />
                        <HelpTooltip side="right" content={t("help.search.hint")}/>
                    </div>

                    {query && (
                        <div className="flex items-center gap-1.5 px-1 text-[12px] text-[#8b97ab]">
                            <Search className="h-3.5 w-3.5" strokeWidth={2}/>
                            {indexing
                                ? t("help.search.indexing")
                                : t("help.search.found", {count: matches.length})}
                        </div>
                    )}

                    <nav className="rounded-2xl border border-[#eef2f7] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                        {loading && toc.length === 0 ? (
                            <Loader size="sm" fullHeight={false}/>
                        ) : matches.length === 0 ? (
                            <EmptyState
                                embedded
                                title={query ? t("help.search.nothingTitle") : t("help.page.noArticlesTitle")}
                                description={query
                                    ? t("help.search.nothingHint")
                                    : canEdit ? t("help.page.noArticlesHint") : undefined}
                            />
                        ) : SECTION_ORDER.filter((s) => bySection.has(s)).map((section) => {
                            const SectionIcon = SECTION_ICON[section];
                            const items = bySection.get(section)!;
                            return (
                                <div key={section} className="mb-1.5 last:mb-0">
                                    <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
                                        <SectionIcon className="h-[14px] w-[14px] text-[#4e57d6]" strokeWidth={2.2}/>
                                        <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[#4e57d6]">
                                            {t(`help.sections.${section}`)}
                                        </span>
                                        <span className="ml-auto rounded-full bg-[#ececfc] px-[7px] py-[1px] font-mono text-[10.5px] font-bold text-[#4e57d6]">
                                            {items.length}
                                        </span>
                                    </div>
                                    {items.map(({article: a, bodySnippet}) => {
                                        const active = openArticle?.id === a.id;
                                        const {title, summary} = localized(a, language);
                                        return (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => void openArticleById(a.id)}
                                                className={`relative w-full cursor-pointer rounded-[10px] border-none px-3 py-2 text-left transition-colors ${
                                                    active ? "bg-[#ececfc]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                                            >
                                                {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[#4e57d6]"/>}
                                                <span className={`block text-[13px] font-semibold ${active ? "text-[#4e57d6]" : "text-[#1c2740]"}`}>
                                                    <HighlightText text={title} query={query}/>
                                                    {!a.isPublished && (
                                                        <span className="ml-1.5 rounded-full bg-[#fdf6e7] px-1.5 py-[1px] text-[10.5px] font-semibold text-[#b3730a]">
                                                            {t("help.article.draftBadge")}
                                                        </span>
                                                    )}
                                                </span>
                                                {summary && (
                                                    <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-[#8b97ab]">
                                                        <HighlightText text={summary} query={query}/>
                                                    </span>
                                                )}
                                                {bodySnippet && (
                                                    <span className="mt-1 block rounded-[7px] bg-[#f6f8fb] px-2 py-1 text-[11.5px] leading-[1.45] text-[#55617a]">
                                                        <HighlightText text={bodySnippet} query={query}/>
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>

                    <Clue>{t("help.page.clue")}</Clue>
                </aside>

                {/* Статья */}
                <section ref={articleRef}
                         className="min-w-0 rounded-2xl border border-[#eef2f7] bg-white p-5 sm:p-7 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                    {articleLoading || (loading && !openArticle) ? (
                        <Loader label={t("help.article.opening")}/>
                    ) : !openArticle || !opened ? (
                        <EmptyState
                            embedded
                            icon={BookOpen}
                            title={t("help.article.chooseTitle")}
                            description={t("help.article.chooseHint")}
                        />
                    ) : (
                        <article className="flex flex-col gap-5">
                            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef2f7] pb-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ececfc] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.05em] text-[#4e57d6]">
                                            {(() => {
                                                const SectionIcon = SECTION_ICON[openArticle.section];
                                                return <SectionIcon className="h-3 w-3" strokeWidth={2.2}/>;
                                            })()}
                                            {t(`help.sections.${openArticle.section}`)}
                                        </span>
                                        {!openArticle.isPublished && (
                                            <Tooltip content={t("help.article.draftHint")}>
                                                <span className="rounded-full bg-[#fdf6e7] px-2.5 py-1 text-[11px] font-semibold text-[#b3730a]">
                                                    {t("help.article.draft")}
                                                </span>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <h2 className="m-0 mt-2.5 text-[21px] font-bold tracking-[-0.01em] text-[#0f1b2d]">
                                        <HighlightText text={opened.title} query={query}/>
                                    </h2>
                                    {opened.summary && (
                                        <p className="m-0 mt-1.5 max-w-[66ch] text-[13.5px] leading-[1.6] text-[#55617a]">
                                            <HighlightText text={opened.summary} query={query}/>
                                        </p>
                                    )}
                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#a3adbd]">
                                        <Clock3 className="h-3.5 w-3.5" strokeWidth={2}/>
                                        {t("help.article.updated", {date: formatDateTime(openArticle.updatedAt)})}
                                        {openArticle.updatedByName && ` · ${openArticle.updatedByName}`}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {openArticle.routePath && (
                                        <Tooltip content={t("help.article.goToHint")}>
                                            <button type="button" onClick={() => navigate(openArticle.routePath!)}
                                                    className={BTN_SECONDARY}>
                                                {t("help.article.goTo")}
                                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2}/>
                                            </button>
                                        </Tooltip>
                                    )}
                                    {canEdit && (
                                        <>
                                            <Tooltip content={t("help.article.editHint")}>
                                                <button type="button" onClick={() => setEditing(openArticle)} className={BTN_SECONDARY}>
                                                    <Pencil className="h-3.5 w-3.5" strokeWidth={2}/>
                                                    {t("help.article.edit")}
                                                </button>
                                            </Tooltip>
                                            <Tooltip content={t("help.article.deleteHint")}>
                                                <button type="button" onClick={() => setDeleting(openArticle)}
                                                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[9px] border border-[#e5e9f0] bg-white text-[#c0392b] hover:bg-[#fdf1f1]">
                                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2}/>
                                                </button>
                                            </Tooltip>
                                        </>
                                    )}
                                </div>
                            </header>

                            {query && (
                                <div className={`flex flex-wrap items-center justify-between gap-2 rounded-[10px] border px-3.5 py-2 text-[12.5px] ${
                                    openArticleHasMatch
                                        ? "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]"
                                        : "border-[#eef2f7] bg-[#f6f8fb] text-[#8b97ab]"}`}>
                                    <span>
                                        {openArticleHasMatch
                                            ? t("help.search.matchesInArticle", {query})
                                            : t("help.search.noMatchInArticle", {query})}
                                    </span>
                                    {openArticleHasMatch && (
                                        <button type="button" onClick={scrollToFirstMatch}
                                                className="cursor-pointer border-none bg-transparent p-0 text-[12.5px] font-semibold text-[#8a6100] underline">
                                            {t("help.search.toFirstMatch")}
                                        </button>
                                    )}
                                </div>
                            )}

                            <HelpArticleView body={openArticle.body} highlight={query}/>
                        </article>
                    )}
                </section>
            </div>

            {editing && (
                <HelpArticleEditor
                    article={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={async (id) => {
                        const isNew = editing === "new";
                        setEditing(null);
                        toast.success(isNew ? t("help.toast.created") : t("help.toast.saved"));
                        await load(id);
                    }}
                />
            )}

            <ConfirmDeleteModal
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() => void confirmDelete()}
                loading={deleteBusy}
                title={t("help.delete.title")}
                message={deleting ? t("help.delete.message", {title: localized(deleting, language).title}) : ""}
            />
        </div>
    );
}
