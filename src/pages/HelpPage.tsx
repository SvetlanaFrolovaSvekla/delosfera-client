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
import {HelpArticleView} from "@/components/help/HelpArticleView.tsx";
import {HelpArticleEditor} from "@/components/help/HelpArticleEditor.tsx";
import {formatDateTime} from "@/utils/dateUtils.ts";

/**
 * Инструкции по работе с системой (KB-01..03).
 *
 * Слева оглавление по разделам, справа статья. Разделы названы работой человека
 * («Служебные записки», «Закупки»), а не пунктами меню: искать инструкцию идут от
 * задачи, а не от того, где лежит экран.
 *
 * Поиск фильтрует оглавление сразу, без отдельной страницы результатов: статей
 * в разделе десятки, а не тысячи, и переносить человека на другой экран ради
 * фильтра значит терять место, где он читал.
 */

export function HelpPage() {
    const [оглавление, setОглавление] = useState<HelpArticleBrief[]>([]);
    const [можноПравить, setМожноПравить] = useState(false);
    const [открыта, setОткрыта] = useState<HelpArticle | null>(null);
    const [поиск, setПоиск] = useState("");
    const [занято, setЗанято] = useState(true);
    const [ошибка, setОшибка] = useState<string | null>(null);

    /** Открыт редактор: либо новая статья, либо правка открытой. */
    const [правим, setПравим] = useState<HelpArticle | "новая" | null>(null);

    const загрузить = useCallback(async (выбрать?: number) => {
        try {
            setЗанято(true);
            setОшибка(null);

            const {articles, mayEdit} = await helpService.index(true);
            setОглавление(articles);
            setМожноПравить(mayEdit);

            const id = выбрать ?? открыта?.id ?? articles[0]?.id;
            setОткрыта(id ? await helpService.article(id) : null);
        } catch {
            setОшибка("Не удалось загрузить инструкции");
        } finally {
            setЗанято(false);
        }
    }, [открыта?.id]);

    useEffect(() => { void загрузить(); /* один раз при входе */ // eslint-disable-next-line
    }, []);

    const открыть = async (id: number) => {
        try {
            setОшибка(null);
            setОткрыта(await helpService.article(id));
        } catch {
            setОшибка("Не удалось открыть статью");
        }
    };

    const удалить = async (article: HelpArticleBrief) => {
        if (!window.confirm(`Удалить статью «${article.titleRu}»? Действие необратимо.`)) return;

        try {
            await helpService.remove(article.id);
            setОткрыта(null);
            await загрузить();
        } catch {
            setОшибка("Не удалось удалить статью");
        }
    };

    const найденные = useMemo(() => {
        const q = поиск.trim().toLowerCase();
        if (!q) return оглавление;

        return оглавление.filter((a) =>
            a.titleRu.toLowerCase().includes(q) ||
            (a.summaryRu ?? "").toLowerCase().includes(q));
    }, [оглавление, поиск]);

    const поРазделам = useMemo(() => {
        const map = new Map<HelpSection, HelpArticleBrief[]>();
        for (const a of найденные) {
            const list = map.get(a.section) ?? [];
            list.push(a);
            map.set(a.section, list);
        }
        return map;
    }, [найденные]);

    return (
        <div className="flex flex-col gap-4 p-[22px_26px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-[12.5px] text-[#8b97ab]">Система</div>
                    <h1 className="m-0 mt-[3px] text-[19px] font-bold text-[#0f1b2d]">
                        Как работать в системе
                    </h1>
                    <p className="m-0 mt-1.5 max-w-[70ch] text-[13px] leading-[1.7] text-[#55617a]">
                        Пошаговые инструкции по разделам. Ссылки в статьях ведут прямо на
                        нужный экран — искать пункт меню по описанию не придётся.
                    </p>
                </div>

                {можноПравить && (
                    <button onClick={() => setПравим("новая")}
                            className="flex h-10 items-center gap-2 rounded-[10px] border-none bg-[#2f68f5] px-4 text-[13px] font-semibold text-white">
                        <Plus className="h-4 w-4" strokeWidth={2.5}/>
                        Новая статья
                    </button>
                )}
            </div>

            {ошибка && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {ошибка}
                </div>
            )}

            <div className="grid gap-5" style={{gridTemplateColumns: "minmax(240px, 320px) 1fr"}}>
                {/* ── оглавление ─────────────────────────────── */}
                <aside className="flex flex-col gap-3 self-start">
                    <label className="relative flex items-center">
                        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#a3adbd]" strokeWidth={2}/>
                        <input
                            value={поиск}
                            onChange={(e) => setПоиск(e.target.value)}
                            placeholder="Поиск по инструкциям"
                            className="h-10 w-full rounded-[10px] border border-[#e5e9f0] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#2f68f5]"
                        />
                    </label>

                    <nav className="rounded-[12px] border border-[#e5e9f0] bg-white p-2">
                        {найденные.length === 0 ? (
                            <p className="m-0 px-3 py-6 text-center text-[12.5px] text-[#8b97ab]">
                                {занято ? "Загрузка…" : поиск ? "Ничего не нашлось" : "Статей пока нет"}
                            </p>
                        ) : SECTION_ORDER.filter((s) => поРазделам.has(s)).map((section) => (
                            <div key={section} className="mb-1.5 last:mb-0">
                                <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[#8b97ab]">
                                    {SECTION_TITLE[section]}
                                </div>
                                {поРазделам.get(section)!.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => открыть(a.id)}
                                        className={`w-full cursor-pointer rounded-[9px] border-none px-3 py-2 text-left ${
                                            открыта?.id === a.id ? "bg-[#e9f0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                                    >
                                        <span className={`block text-[13px] font-semibold ${
                                            открыта?.id === a.id ? "text-[#2f68f5]" : "text-[#1c2740]"}`}>
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
                    {!открыта ? (
                        <p className="m-0 py-10 text-center text-[13px] text-[#8b97ab]">
                            {занято ? "Загрузка…" : "Выберите статью слева"}
                        </p>
                    ) : (
                        <article className="flex flex-col gap-4">
                            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef2f7] pb-4">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#8b97ab]">
                                        {SECTION_TITLE[открыта.section]}
                                    </div>
                                    <h2 className="m-0 mt-1 text-[20px] font-bold text-[#0f1b2d]">
                                        {открыта.titleRu}
                                    </h2>
                                    {открыта.summaryRu && (
                                        <p className="m-0 mt-1 max-w-[66ch] text-[13.5px] text-[#55617a]">
                                            {открыта.summaryRu}
                                        </p>
                                    )}
                                </div>

                                {можноПравить && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setПравим(открыта)}
                                                title="Изменить статью"
                                                className="flex h-9 items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[12.5px] text-[#55617a]">
                                            <Pencil className="h-3.5 w-3.5" strokeWidth={2}/>
                                            Изменить
                                        </button>
                                        <button onClick={() => удалить(открыта)}
                                                title="Удалить статью"
                                                className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#e5e9f0] bg-white text-[#c0392b]">
                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2}/>
                                        </button>
                                    </div>
                                )}
                            </header>

                            <HelpArticleView body={открыта.body}/>

                            <footer className="border-t border-[#eef2f7] pt-3 text-[11.5px] text-[#a3adbd]">
                                Изменено {formatDateTime(открыта.updatedAt)}
                                {открыта.updatedByName && ` · ${открыта.updatedByName}`}
                            </footer>
                        </article>
                    )}
                </section>
            </div>

            {правим && (
                <HelpArticleEditor
                    article={правим === "новая" ? null : правим}
                    onClose={() => setПравим(null)}
                    onSaved={async (id) => {
                        setПравим(null);
                        await загрузить(id);
                    }}
                />
            )}
        </div>
    );
}
