// Инструкции по работе с системой "Как работать в системе"
import {useCallback, useEffect, useMemo, useState} from "react";
import {Pencil, Plus, Search, Trash2} from "lucide-react";
import {
    helpService,
    SECTION_ORDER,
    SECTION_TITLE,
    type HelpArticle,
    type HelpArticleBrief,
    type HelpSection,
} from "@/service/helpService/helpService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {HelpArticleView} from "@/components/help/HelpArticleView.tsx";
import {HelpArticleEditor} from "@/components/help/HelpArticleEditor.tsx";

export function HelpPage() {
    const [toc, setToc] = useState<HelpArticleBrief[]>([]);
    const [canEdit, setCanEdit] = useState(false);
    const [openArticle, setOpenArticle] = useState<HelpArticle | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /** Открыт редактор: либо новая статья, либо правка открытой. */
    const [editing, setEditing] = useState<HelpArticle | "new" | null>(null);

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const load = useCallback(async (selectId?: number) => {
        try {
            setLoading(true);
            setError(null);

            const {articles, mayEdit} = await helpService.index(true);
            setToc(articles);
            setCanEdit(mayEdit);

            const id = selectId ?? openArticle?.id ?? articles[0]?.id;
            setOpenArticle(id ? await helpService.article(id) : null);
        } catch {
            setError("Не удалось загрузить инструкции");
        } finally {
            setLoading(false);
        }
    }, [openArticle?.id]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); /* один раз при входе */ // eslint-disable-next-line
    }, []);

    const openArticleById = async (id: number) => {
        try {
            setError(null);
            setOpenArticle(await helpService.article(id));
        } catch {
            setError("Не удалось открыть статью");
        }
    };

    const removeArticle = async (article: HelpArticleBrief) => {
        if (!window.confirm(`Удалить статью «${article.titleRu}»? Действие необратимо.`)) return;

        try {
            await helpService.remove(article.id);
            setOpenArticle(null);
            await load();
        } catch {
            setError("Не удалось удалить статью");
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return toc;

        return toc.filter((a) =>
            a.titleRu.toLowerCase().includes(q) ||
            (a.summaryRu ?? "").toLowerCase().includes(q));
    }, [toc, search]);

    const bySection = useMemo(() => {
        const map = new Map<HelpSection, HelpArticleBrief[]>();
        for (const a of filtered) {
            const list = map.get(a.section) ?? [];
            list.push(a);
            map.set(a.section, list);
        }
        return map;
    }, [filtered]);

    return (
        <div className="flex flex-col gap-4 p-[22px_26px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-[12.5px] text-[#8b97ab]">Инструкция</div>
                    <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">
                        Как работать в системе
                    </h1>
                    <p className="m-0 mt-1.5 max-w-[70ch] text-[13px] leading-[1.7] text-[#55617a]">
                        Пошаговые инструкции по разделам. Ссылки в статьях ведут прямо на
                        нужный экран — искать пункт меню по описанию не придётся.
                    </p>
                </div>

                {canEdit && (
                    <button onClick={() => setEditing("new")}
                            className="flex h-10 items-center gap-2 rounded-[10px] border-none bg-[#2f68f5] px-4 text-[13px] font-semibold text-white">
                        <Plus className="h-4 w-4" strokeWidth={2.5}/>
                        Новая статья
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <div className="grid gap-5" style={{gridTemplateColumns: "minmax(240px, 320px) 1fr"}}>
                {/* ── оглавление ─────────────────────────────── */}
                <aside className="flex flex-col gap-3 self-start">
                    <label className="relative flex items-center">
                        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#a3adbd]" strokeWidth={2}/>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по инструкциям"
                            className="h-10 w-full rounded-[10px] border border-[#e5e9f0] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#2f68f5]"
                        />
                    </label>

                    <nav className="rounded-[12px] border border-[#e5e9f0] bg-white p-2">
                        {filtered.length === 0 ? (
                            <p className="m-0 px-3 py-6 text-center text-[12.5px] text-[#8b97ab]">
                                {loading ? "Загрузка…" : search ? "Ничего не нашлось" : "Статей пока нет"}
                            </p>
                        ) : SECTION_ORDER.filter((s) => bySection.has(s)).map((section) => (
                            <div key={section} className="mb-1.5 last:mb-0">
                                <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[#8b97ab]">
                                    {SECTION_TITLE[section]}
                                </div>
                                {bySection.get(section)!.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => openArticleById(a.id)}
                                        className={`w-full cursor-pointer rounded-[9px] border-none px-3 py-2 text-left ${
                                            openArticle?.id === a.id ? "bg-[#e9f0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                                    >
                                        <span className={`block text-[13px] font-semibold ${
                                            openArticle?.id === a.id ? "text-[#2f68f5]" : "text-[#1c2740]"}`}>
                                            {a.titleRu}
                                            {!a.isPublished && (
                                                <span className="ml-1.5 text-[11px] font-normal text-[#b3730a]">
                                                    черновик
                                                </span>
                                            )}
                                        </span>
                                        {a.summaryRu && (
                                            <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-[#8b97ab]">
                                                {a.summaryRu}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* ── статья ─────────────────────────────────── */}
                <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-6">
                    {!openArticle ? (
                        <p className="m-0 py-10 text-center text-[13px] text-[#8b97ab]">
                            {loading ? "Загрузка…" : "Выберите статью слева"}
                        </p>
                    ) : (
                        <article className="flex flex-col gap-4">
                            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef2f7] pb-4">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#8b97ab]">
                                        {SECTION_TITLE[openArticle.section]}
                                    </div>
                                    <h2 className="m-0 mt-1 text-[20px] font-bold text-[#0f1b2d]">
                                        {openArticle.titleRu}
                                    </h2>
                                    {openArticle.summaryRu && (
                                        <p className="m-0 mt-1 max-w-[66ch] text-[13.5px] text-[#55617a]">
                                            {openArticle.summaryRu}
                                        </p>
                                    )}
                                </div>

                                {canEdit && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditing(openArticle)}
                                                title="Изменить статью"
                                                className="flex h-9 items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#55617a]">
                                            <Pencil className="h-3.5 w-3.5" strokeWidth={2}/>
                                            Изменить
                                        </button>
                                        <button onClick={() => removeArticle(openArticle)}
                                                title="Удалить статью"
                                                className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#e5e9f0] bg-white text-[#c0392b]">
                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2}/>
                                        </button>
                                    </div>
                                )}
                            </header>

                            <HelpArticleView body={openArticle.body}/>

                            <footer className="border-t border-[#eef2f7] pt-3 text-[11.5px] text-[#a3adbd]">
                                Изменено {formatDateTime(openArticle.updatedAt)}
                                {openArticle.updatedByName && ` · ${openArticle.updatedByName}`}
                            </footer>
                        </article>
                    )}
                </section>
            </div>

            {editing && (
                <HelpArticleEditor
                    article={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={async (id) => {
                        setEditing(null);
                        await load(id);
                    }}
                />
            )}
        </div>
    );
}