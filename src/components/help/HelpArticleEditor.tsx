import {useState} from "react";
import {useTranslation} from "react-i18next";
import {
    ArrowDown, ArrowRight, ArrowUp, BookOpen, Image as ImageIcon, Info, ListOrdered, Paperclip, Plus,
    TextAlignStart, Trash2, X, type LucideIcon,
} from "lucide-react";
import {HelpScreenshot} from "@/components/help/HelpScreenshot.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";
import {toast} from "@/service/toastService.ts";
import {
    helpService,
    SECTION_ORDER,
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

/** Виды блоков. Подписи — в переводах: help.blocks.<kind>.label / .hint. */
const ВИДЫ: {kind: HelpBlock["kind"]; icon: LucideIcon}[] = [
    {kind: "text", icon: TextAlignStart},
    {kind: "steps", icon: ListOrdered},
    {kind: "note", icon: Info},
    {kind: "link", icon: ArrowRight},
    {kind: "vnd", icon: BookOpen},
    {kind: "image", icon: ImageIcon},
    {kind: "file", icon: Paperclip},
];

/** Общий вид поля ввода — используется и в статье, и в редакторе снимка (как поля форм ВНД). */
const поле =
    "w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2 text-[13px] text-[#1c2740] outline-none " +
    "placeholder:text-[#a3adbd] hover:bg-[#f6f8fb] focus:border-[#4e57d6] focus:bg-white focus:ring-[3px] focus:ring-[#ececfc]";

/** Подпись поля и пояснение под ним. */
const подпись = "text-[11.5px] font-semibold text-[#55617a]";
const пояснение = "text-[11px] leading-[1.45] text-[#a3adbd]";

/** Маленькая кнопка действия над блоком (вверх/вниз/удалить). */
const кнопкаБлока =
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border border-[#e5e9f0] bg-white " +
    "text-[#8b97ab] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40";

export const HelpArticleEditor = ({article, onClose, onSaved}: Props) => {
    const {t} = useTranslation();
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
            image: {kind: "image", fileId: 0, caption: "", markers: []},
            file: {kind: "file", fileId: 0, fileName: "", size: 0},
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
            setОшибка(t("help.editor.titleRequired"));
            toast.warning(t("help.editor.titleRequired"));
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
            setОшибка(message ?? t("help.editor.saveFailed"));
            toast.error(t("help.editor.saveFailed"), message);
            setЗанято(false);
        }
    };



    const текущийВид = (kind: HelpBlock["kind"]) => ВИДЫ.find((v) => v.kind === kind);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0f1b2d]/40 p-4 backdrop-blur-[2px]"
             role="dialog" aria-modal="true" aria-label={t("help.editor.ariaLabel")}>
            <div className="my-6 flex w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,27,45,0.35)]">
                {/* ── шапка ─────────────────────────────────── */}
                <div className="relative flex items-center justify-center border-b border-[#eef2f7] px-5 py-4">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <HelpTooltip
                            side="right"
                            content={t("help.editor.help")}
                        />
                    </div>
                    <h3 className="m-0 text-center text-[15px] font-semibold text-[#1c2740]">
                        {article ? t("help.editor.editTitle") : t("help.editor.newTitle")}
                    </h3>
                    <button type="button" onClick={onClose} aria-label={t("help.editor.close")}
                            className="absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a]">
                        <X className="h-4 w-4" strokeWidth={2}/>
                    </button>
                </div>

                <div className="flex flex-col gap-5 px-6 py-5">
                    {ошибка && (
                        <div className="rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-3.5 py-2.5 text-[12.5px] text-[#c0392b]">
                            {ошибка}
                        </div>
                    )}

                    {/* ── реквизиты ─────────────────────────── */}
                    <div className="rounded-2xl border border-[#eef2f7] p-4">
                        <div className="mb-3.5 text-[12px] font-bold uppercase tracking-[.04em] text-[#2d354a]">{t("help.editor.aboutTitle")}</div>

                        <div className="grid gap-3 sm:grid-cols-[1fr_230px]">
                            <label className="flex flex-col gap-1.5">
                                <span className={подпись}>{t("help.editor.title")} <span className="text-[#c0392b]">*</span></span>
                                <input className={поле} value={titleRu} onChange={(e) => setTitleRu(e.target.value)}
                                       placeholder={t("help.editor.titlePlaceholder")}/>
                            </label>

                            <div className="flex flex-col gap-1.5">
                                <span className={подпись}>{t("help.editor.section")}</span>
                                <SelectDropdown
                                    options={SECTION_ORDER.map((s) => ({value: s, label: t(`help.sections.${s}`)}))}
                                    value={section}
                                    onChange={(v) => setSection(v as HelpSection)}
                                    minWidth="100%"
                                />
                            </div>
                        </div>

                        <label className="mt-3 flex flex-col gap-1.5">
                            <span className={подпись}>{t("help.editor.summary")}</span>
                            <input className={поле} value={summaryRu} onChange={(e) => setSummaryRu(e.target.value)}
                                   placeholder={t("help.editor.summaryPlaceholder")}/>
                            <span className={пояснение}>{t("help.editor.summaryHint")}</span>
                        </label>

                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
                            <label className="flex flex-col gap-1.5">
                                <span className={подпись}>{t("help.editor.route")}</span>
                                <input className={поле} value={routePath} onChange={(e) => setRoutePath(e.target.value)}
                                       placeholder="/sz"/>
                                <span className={пояснение}>
                                    {t("help.editor.routeHint")}
                                </span>
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className={подпись}>{t("help.editor.order")}</span>
                                <input type="number" className={поле} value={sortOrder}
                                       onChange={(e) => setSortOrder(Number(e.target.value))}/>
                                <span className={пояснение}>{t("help.editor.orderHint")}</span>
                            </label>
                        </div>
                    </div>

                    {/* ── блоки ─────────────────────────────── */}
                    <div className="rounded-2xl border border-[#eef2f7] p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-bold uppercase tracking-[.04em] text-[#2d354a]">{t("help.editor.contentTitle")}</span>
                            <span className="text-[11.5px] text-[#a3adbd]">
                                {body.length > 0 ? t("help.editor.blocksCount", {count: body.length}) : t("help.editor.empty")}
                            </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {ВИДЫ.map((v) => (
                                <button key={v.kind} type="button" onClick={() => добавить(v.kind)}
                                        className="group flex cursor-pointer items-start gap-2.5 rounded-[11px] border border-[#e5e9f0] bg-white p-2.5 text-left hover:border-[#c9cdf5] hover:bg-[#f8f8ff]">
                                    <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[#f2f5f9] text-[#8b97ab] group-hover:bg-[#ececfc] group-hover:text-[#4e57d6]">
                                        <v.icon className="h-4 w-4" strokeWidth={2}/>
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-[12.5px] font-semibold text-[#1c2740]">+ {t(`help.blocks.${v.kind}.label`)}</span>
                                        <span className="block text-[11px] leading-[1.35] text-[#8b97ab]">{t(`help.blocks.${v.kind}.hint`)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        {body.length === 0 ? (
                            <div className="mt-3">
                                <Clue>{t("help.editor.startHint")}</Clue>
                            </div>
                        ) : (
                            <div className="mt-3 flex flex-col gap-2.5">
                                {body.map((block, i) => {
                                    const вид = текущийВид(block.kind);
                                    const Icon = вид?.icon;
                                    return (
                                        <div key={i} className="rounded-[12px] border border-[#eef2f7] bg-[#fafbfd] p-3">
                                            <div className="mb-2.5 flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2">
                                                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white font-mono text-[11px] font-bold text-[#8b97ab] ring-1 ring-[#e5e9f0]">
                                                        {i + 1}
                                                    </span>
                                                    {Icon && <Icon className="h-3.5 w-3.5 text-[#4e57d6]" strokeWidth={2}/>}
                                                    <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#55617a]">
                                                        {вид ? t(`help.blocks.${вид.kind}.label`) : block.kind}
                                                    </span>
                                                </span>
                                                <div className="flex gap-1">
                                                    <Tooltip content={t("help.editor.moveUp")}>
                                                        <button type="button" onClick={() => сдвинуть(i, -1)} disabled={i === 0}
                                                                className={кнопкаБлока}>
                                                            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2}/>
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={t("help.editor.moveDown")}>
                                                        <button type="button" onClick={() => сдвинуть(i, 1)} disabled={i === body.length - 1}
                                                                className={кнопкаБлока}>
                                                            <ArrowDown className="h-3.5 w-3.5" strokeWidth={2}/>
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content={t("help.editor.removeBlock")}>
                                                        <button type="button" onClick={() => убрать(i)}
                                                                className={`${кнопкаБлока} !text-[#c0392b] hover:!bg-[#fdf1f1]`}>
                                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2}/>
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </div>

                                            {block.kind === "text" && (
                                                <textarea rows={3} className={поле} value={block.text}
                                                          placeholder={t("help.editor.paragraphPlaceholder")}
                                                          onChange={(e) => заменить(i, {...block, text: e.target.value})}/>
                                            )}

                                            {block.kind === "steps" && (
                                                <div className="flex flex-col gap-1.5">
                                                    {block.items.map((item, j) => (
                                                        <div key={j} className="flex items-center gap-2">
                                                            <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#ececfc] text-[11.5px] font-bold text-[#4e57d6]">
                                                                {j + 1}
                                                            </span>
                                                            <input className={поле} value={item} placeholder={t("help.editor.stepPlaceholder")}
                                                                   onChange={(e) => заменить(i, {
                                                                       ...block,
                                                                       items: block.items.map((x, k) => (k === j ? e.target.value : x)),
                                                                   })}/>
                                                            <Tooltip content={t("help.editor.removeStep")}>
                                                                <button type="button" onClick={() => заменить(i, {
                                                                    ...block, items: block.items.filter((_, k) => k !== j),
                                                                })} className={`${кнопкаБлока} !text-[#c0392b]`}>
                                                                    <Trash2 className="h-3 w-3" strokeWidth={2}/>
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => заменить(i, {...block, items: [...block.items, ""]})}
                                                            className="mt-0.5 inline-flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[12px] font-semibold text-[#4e57d6]">
                                                        <Plus className="h-3.5 w-3.5" strokeWidth={2.2}/>
                                                        {t("help.editor.addStep")}
                                                    </button>
                                                </div>
                                            )}

                                            {block.kind === "note" && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        {(["info", "warning"] as const).map((tone) => (
                                                            <button key={tone} type="button"
                                                                    onClick={() => заменить(i, {...block, tone})}
                                                                    className={`h-8 cursor-pointer rounded-[8px] border px-3 text-[12px] font-semibold ${
                                                                        (block.tone ?? "info") === tone
                                                                            ? tone === "info"
                                                                                ? "border-[#4e57d6] bg-[#ececfc] text-[#4e57d6]"
                                                                                : "border-[#e0a43a] bg-[#fdf3e0] text-[#8a5a00]"
                                                                            : "border-[#e5e9f0] bg-white text-[#55617a]"}`}>
                                                                {tone === "info" ? t("help.editor.toneInfo") : t("help.editor.toneWarning")}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <textarea rows={2} className={поле} value={block.text}
                                                              placeholder={t("help.editor.notePlaceholder")}
                                                              onChange={(e) => заменить(i, {...block, text: e.target.value})}/>
                                                </div>
                                            )}

                                            {block.kind === "link" && (
                                                <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                                                    <input className={поле} value={block.label} placeholder={t("help.editor.linkLabelPlaceholder")}
                                                           onChange={(e) => заменить(i, {...block, label: e.target.value})}/>
                                                    <input className={поле} value={block.path} placeholder="/sz"
                                                           onChange={(e) => заменить(i, {...block, path: e.target.value})}/>
                                                </div>
                                            )}

                                            {block.kind === "image" && (
                                                <HelpImageBlockEditor
                                                    block={block}
                                                    onChange={(next) => заменить(i, next)}
                                                />
                                            )}

                                            {block.kind === "file" && (
                                                <HelpFileBlockEditor
                                                    block={block}
                                                    onChange={(next) => заменить(i, next)}
                                                />
                                            )}

                                            {block.kind === "vnd" && (
                                                <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                                                    <input className={поле} value={block.label} placeholder={t("help.editor.vndLabelPlaceholder")}
                                                           onChange={(e) => заменить(i, {...block, label: e.target.value})}/>
                                                    <input type="number" className={поле} value={block.documentId}
                                                           placeholder={t("help.editor.vndIdPlaceholder")}
                                                           onChange={(e) => заменить(i, {...block, documentId: Number(e.target.value)})}/>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── подвал ────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f7] bg-[#fafbfd] px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                        <PlainCheckbox checked={isPublished} onChange={setIsPublished}>
                            {t("help.editor.publish")}
                        </PlainCheckbox>
                        <span className={`pl-7 ${пояснение}`}>
                            {isPublished ? t("help.editor.publishedHint") : t("help.editor.draftHint")}
                        </span>
                    </div>

                    <div className="flex gap-2.5">
                        <button type="button" onClick={onClose} disabled={занято}
                                className="h-10 cursor-pointer rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb]">
                            {t("help.editor.cancel")}
                        </button>
                        <button type="button" onClick={() => void сохранить()} disabled={занято}
                                className="h-10 cursor-pointer rounded-[10px] border-none bg-[#4e57d6] px-5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50">
                            {занято ? t("help.editor.saving") : article ? t("help.editor.save") : t("help.editor.create")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Редактор снимка экрана.
 *
 * Выноски ставятся щелчком по картинке, а не вводом координат: попасть мышью в
 * нужную кнопку проще, чем угадать её положение в процентах. Щелчок по самой
 * выноске её убирает.
 */
function HelpImageBlockEditor({block, onChange}: {
    block: Extract<HelpBlock, {kind: "image"}>;
    onChange: (block: HelpBlock) => void;
}) {
    const {t} = useTranslation();
    const [загрузка, setЗагрузка] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const markers = block.markers ?? [];

    const загрузить = async (file: File) => {
        setЗагрузка(true);
        setОшибка(null);
        try {
            const {fileId} = await helpService.uploadImage(file);
            // Новый снимок — старые выноски к нему не относятся.
            onChange({...block, fileId, markers: []});
        } catch (e) {
            const текст = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setОшибка(текст ?? t("help.editor.imageUploadFailed"));
        } finally {
            setЗагрузка(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-[9px] border border-[#e5e9f0] px-3 py-1.5
                                  text-[13px] text-[#55617a] transition hover:border-[#4e57d6] hover:text-[#4e57d6]">
                    {block.fileId > 0 ? t("help.editor.replaceImage") : t("help.editor.uploadImage")}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void загрузить(file);
                            e.target.value = "";
                        }}
                    />
                </label>

                {загрузка && <span className="text-[12.5px] text-[#8b97ab]">{t("help.editor.uploading")}</span>}

                {block.fileId > 0 && (
                    <span className="text-[12.5px] text-[#8b97ab]">
                        {t("help.editor.markerHint")}
                    </span>
                )}
            </div>

            {ошибка && <p className="m-0 text-[13px] text-[#c0392b]">{ошибка}</p>}

            {block.fileId > 0 && (
                <>
                    <HelpScreenshot
                        fileId={block.fileId}
                        markers={markers}
                        onPick={(x, y) => onChange({...block, markers: [...markers, {x, y, text: ""}]})}
                        onRemoveMarker={(index) =>
                            onChange({...block, markers: markers.filter((_, j) => j !== index)})}
                    />

                    {markers.map((marker, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="grid h-[20px] w-[20px] flex-none place-items-center
                                             rounded-full bg-[#c0392b] text-[11px] font-bold text-white">
                                {index + 1}
                            </span>
                            <input
                                className={поле}
                                value={marker.text ?? ""}
                                placeholder={t("help.editor.markerPlaceholder")}
                                onChange={(e) => onChange({
                                    ...block,
                                    markers: markers.map((m, j) =>
                                        j === index ? {...m, text: e.target.value} : m),
                                })}
                            />
                        </div>
                    ))}

                    <input
                        className={поле}
                        value={block.caption ?? ""}
                        placeholder={t("help.editor.captionPlaceholder")}
                        onChange={(e) => onChange({...block, caption: e.target.value})}
                    />
                </>
            )}
        </div>
    );
}

/**
 * Редактор блока с приложенным файлом (.docx, .pdf) — карточка со скачиванием и
 * просмотром на странице статьи. Устроен так же, как HelpImageBlockEditor: один
 * файл на блок, замена вместо правки содержимого.
 */
function HelpFileBlockEditor({block, onChange}: {
    block: Extract<HelpBlock, {kind: "file"}>;
    onChange: (block: HelpBlock) => void;
}) {
    const {t} = useTranslation();
    const [загрузка, setЗагрузка] = useState(false);
    const [ошибка, setОшибка] = useState<string | null>(null);

    const загрузить = async (file: File) => {
        setЗагрузка(true);
        setОшибка(null);
        try {
            const {fileId, fileName, size} = await helpService.uploadFile(file);
            onChange({...block, fileId, fileName, size});
        } catch (e) {
            const текст = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setОшибка(текст ?? t("help.editor.fileUploadFailed"));
        } finally {
            setЗагрузка(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-[9px] border border-[#e5e9f0] px-3 py-1.5
                                  text-[13px] text-[#55617a] transition hover:border-[#4e57d6] hover:text-[#4e57d6]">
                    {block.fileId > 0 ? t("help.editor.replaceFile") : t("help.editor.uploadFile")}
                    <input
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void загрузить(file);
                            e.target.value = "";
                        }}
                    />
                </label>

                {загрузка && <span className="text-[12.5px] text-[#8b97ab]">{t("help.editor.uploading")}</span>}

                {block.fileId > 0 && !загрузка && (
                    <span className="text-[12.5px] text-[#8b97ab]">{block.fileName}</span>
                )}
            </div>

            {ошибка && <p className="m-0 text-[13px] text-[#c0392b]">{ошибка}</p>}
        </div>
    );
}
