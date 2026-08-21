import {useState} from "react";
import {ArrowDown, ArrowUp, Trash2} from "lucide-react";
import {
    helpService,
    SECTION_ORDER,
    SECTION_TITLE,
    type HelpArticle,
    type HelpBlock,
    type HelpSection,
} from "@/service/helpService/helpService.ts";

/**
 * Редактор статьи инструкции.
 *
 * Блоки добавляются кнопками, а не размечаются в тексте: разметку пришлось бы
 * объяснять тому, кто пишет инструкцию, — а он как раз тот человек, которому
 * объяснять не должны. Порядок меняется стрелками, потому что перетаскивание в
 * длинном списке промахивается чаще, чем попадает.
 */

interface Props {
    /** Пусто — создаётся новая статья. */
    article: HelpArticle | null;

    onClose: () => void;
    onSaved: (id: number) => void;
}

const ВИДЫ: {kind: HelpBlock["kind"]; label: string; hint: string}[] = [
    {kind: "text", label: "Абзац", hint: "Объяснение"},
    {kind: "steps", label: "Шаги", hint: "Что делать по порядку"},
    {kind: "note", label: "Замечание", hint: "Важное или предупреждение"},
    {kind: "link", label: "Переход", hint: "Кнопка в раздел системы"},
    {kind: "vnd", label: "Документ", hint: "Ссылка на ВНД"},
];

export const HelpArticleEditor = ({article, onClose, onSaved}: Props) => {
    const [section, setSection] = useState<HelpSection>(article?.section ?? "Start");
    const [titleRu, setTitleRu] = useState(article?.titleRu ?? "");
    const [summaryRu, setSummaryRu] = useState(article?.summaryRu ?? "");
    const [routePath, setRoutePath] = useState(article?.routePath ?? "");
    const [sortOrder, setSortOrder] = useState(article?.sortOrder ?? 0);
    const [isPublished, setIsPublished] = useState(article?.isPublished ?? false);
    const [body, setBody] = useState<HelpBlock[]>(article?.body ?? []);

    const [занято, setЗанято] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const добавить = (kind: HelpBlock["kind"]) => {
        const пустой: Record<HelpBlock["kind"], HelpBlock> = {
            text: {kind: "text", text: ""},
            steps: {kind: "steps", items: [""]},
            note: {kind: "note", tone: "info", text: ""},
            link: {kind: "link", label: "", path: ""},
            vnd: {kind: "vnd", label: "", documentId: 0},
        };
        setBody([...body, пустой[kind]]);
    };

    const заменить = (i: number, block: HelpBlock) =>
        setBody(body.map((b, j) => (j === i ? block : b)));

    const убрать = (i: number) => setBody(body.filter((_, j) => j !== i));

    const сдвинуть = (i: number, шаг: -1 | 1) => {
        const j = i + шаг;
        if (j < 0 || j >= body.length) return;
        const копия = [...body];
        [копия[i], копия[j]] = [копия[j], копия[i]];
        setBody(копия);
    };

    const сохранить = async () => {
        if (!titleRu.trim()) {
            setОшибка("У статьи должно быть название");
            return;
        }

        try {
            setЗанято(true);
            setОшибка(null);

            const input = {
                section,
                titleRu: titleRu.trim(),
                summaryRu: summaryRu.trim() || null,
                routePath: routePath.trim() || null,
                sortOrder,
                isPublished,
                body,
            };

            const id = article
                ? (await helpService.update(article.id, input), article.id)
                : await helpService.create(input);

            onSaved(id);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setОшибка(message ?? "Не удалось сохранить статью");
            setЗанято(false);
        }
    };

    const поле = "w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2f68f5]";

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
             role="dialog" aria-modal="true" aria-label="Редактор статьи">
            <div className="my-6 flex w-full max-w-[760px] flex-col gap-4 rounded-[14px] bg-white p-6 shadow-xl">
                <h2 className="m-0 text-[17px] font-semibold text-[#0f1b2d]">
                    {article ? "Изменить статью" : "Новая статья"}
                </h2>

                {ошибка && (
                    <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-3 py-2 text-[12.5px] text-[#c0392b]">
                        {ошибка}
                    </div>
                )}

                <div className="grid gap-3" style={{gridTemplateColumns: "1fr 200px"}}>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Название</span>
                        <input className={поле} value={titleRu} onChange={(e) => setTitleRu(e.target.value)}
                               placeholder="Как отправить записку на согласование"/>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Раздел</span>
                        <select className={`${поле} h-[38px]`} value={section}
                                onChange={(e) => setSection(e.target.value as HelpSection)}>
                            {SECTION_ORDER.map((s) => (
                                <option key={s} value={s}>{SECTION_TITLE[s]}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">
                        Одной строкой: на какой вопрос отвечает статья
                    </span>
                    <input className={поле} value={summaryRu} onChange={(e) => setSummaryRu(e.target.value)}
                           placeholder="Кого выбирать согласующими и что делать с замечаниями"/>
                </label>

                <div className="grid gap-3" style={{gridTemplateColumns: "1fr 120px"}}>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">
                            Экран, к которому относится — на нём появится кнопка справки
                        </span>
                        <input className={поле} value={routePath} onChange={(e) => setRoutePath(e.target.value)}
                               placeholder="/sz"/>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">Порядок</span>
                        <input type="number" className={поле} value={sortOrder}
                               onChange={(e) => setSortOrder(Number(e.target.value))}/>
                    </label>
                </div>

                {/* ── блоки ─────────────────────────────────── */}
                <div className="flex flex-col gap-2.5 border-t border-[#eef2f7] pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#26324a]">Содержание</span>
                        <div className="flex flex-wrap gap-1.5">
                            {ВИДЫ.map((v) => (
                                <button key={v.kind} onClick={() => добавить(v.kind)} title={v.hint}
                                        className="h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 text-[12px] font-semibold text-[#55617a] hover:border-[#cbddff]">
                                    + {v.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {body.length === 0 && (
                        <p className="m-0 rounded-[10px] border border-dashed border-[#e5e9f0] px-4 py-6 text-center text-[12.5px] text-[#8b97ab]">
                            Добавьте первый блок кнопками выше
                        </p>
                    )}

                    {body.map((block, i) => (
                        <div key={i} className="rounded-[10px] border border-[#eef2f7] bg-[#fafbfd] p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8b97ab]">
                                    {ВИДЫ.find((v) => v.kind === block.kind)?.label ?? block.kind}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => сдвинуть(i, -1)} disabled={i === 0}
                                            title="Выше"
                                            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#e5e9f0] bg-white text-[#8b97ab] disabled:opacity-40">
                                        <ArrowUp className="h-3.5 w-3.5" strokeWidth={2}/>
                                    </button>
                                    <button onClick={() => сдвинуть(i, 1)} disabled={i === body.length - 1}
                                            title="Ниже"
                                            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#e5e9f0] bg-white text-[#8b97ab] disabled:opacity-40">
                                        <ArrowDown className="h-3.5 w-3.5" strokeWidth={2}/>
                                    </button>
                                    <button onClick={() => убрать(i)} title="Удалить блок"
                                            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#e5e9f0] bg-white text-[#c0392b]">
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2}/>
                                    </button>
                                </div>
                            </div>

                            {block.kind === "text" && (
                                <textarea rows={3} className={поле} value={block.text}
                                          placeholder="Текст абзаца"
                                          onChange={(e) => заменить(i, {...block, text: e.target.value})}/>
                            )}

                            {block.kind === "steps" && (
                                <div className="flex flex-col gap-1.5">
                                    {block.items.map((item, j) => (
                                        <div key={j} className="flex items-center gap-2">
                                            <span className="w-5 text-right text-[12px] text-[#8b97ab]">{j + 1}.</span>
                                            <input className={поле} value={item} placeholder="Что сделать"
                                                   onChange={(e) => заменить(i, {
                                                       ...block,
                                                       items: block.items.map((x, k) => (k === j ? e.target.value : x)),
                                                   })}/>
                                            <button onClick={() => заменить(i, {
                                                ...block, items: block.items.filter((_, k) => k !== j),
                                            })}
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#e5e9f0] bg-white text-[#c0392b]">
                                                <Trash2 className="h-3 w-3" strokeWidth={2}/>
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => заменить(i, {...block, items: [...block.items, ""]})}
                                            className="mt-0.5 w-fit border-none bg-transparent p-0 text-[12px] text-[#2f68f5] underline">
                                        добавить шаг
                                    </button>
                                </div>
                            )}

                            {block.kind === "note" && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        {(["info", "warning"] as const).map((tone) => (
                                            <button key={tone}
                                                    onClick={() => заменить(i, {...block, tone})}
                                                    className={`h-8 rounded-[8px] border px-3 text-[12px] font-semibold ${
                                                        (block.tone ?? "info") === tone
                                                            ? "border-[#2f68f5] bg-[#eaf0ff] text-[#2f68f5]"
                                                            : "border-[#e5e9f0] bg-white text-[#55617a]"}`}>
                                                {tone === "info" ? "Пояснение" : "Предупреждение"}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea rows={2} className={поле} value={block.text}
                                              placeholder="Что важно знать"
                                              onChange={(e) => заменить(i, {...block, text: e.target.value})}/>
                                </div>
                            )}

                            {block.kind === "link" && (
                                <div className="grid gap-2" style={{gridTemplateColumns: "1fr 180px"}}>
                                    <input className={поле} value={block.label} placeholder="Надпись на кнопке"
                                           onChange={(e) => заменить(i, {...block, label: e.target.value})}/>
                                    <input className={поле} value={block.path} placeholder="/sz"
                                           onChange={(e) => заменить(i, {...block, path: e.target.value})}/>
                                </div>
                            )}

                            {block.kind === "vnd" && (
                                <div className="grid gap-2" style={{gridTemplateColumns: "1fr 140px"}}>
                                    <input className={поле} value={block.label} placeholder="Название документа"
                                           onChange={(e) => заменить(i, {...block, label: e.target.value})}/>
                                    <input type="number" className={поле} value={block.documentId}
                                           placeholder="id в базе ВНД"
                                           onChange={(e) => заменить(i, {...block, documentId: Number(e.target.value)})}/>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f7] pt-4">
                    <label className="flex items-center gap-2 text-[13px] text-[#55617a]">
                        <input type="checkbox" className="h-4 w-4" checked={isPublished}
                               onChange={(e) => setIsPublished(e.target.checked)}/>
                        Опубликовать — статью увидят все сотрудники
                    </label>

                    <div className="flex gap-2.5">
                        <button onClick={onClose} disabled={занято}
                                className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] text-[#55617a]">
                            Отмена
                        </button>
                        <button onClick={сохранить} disabled={занято}
                                className="h-10 rounded-[10px] border-none bg-[#2f68f5] px-5 text-[13px] font-semibold text-white disabled:opacity-40">
                            {занято ? "Сохраняем…" : "Сохранить"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
