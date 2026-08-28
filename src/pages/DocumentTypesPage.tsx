import {useEffect, useState} from "react";
import {AlertTriangle, ChevronRight, Plus, Trash2} from "lucide-react";
import {
    documentTypeService, готовКРаботе,
    FIELD_KINDS, FIELD_KIND_TITLE, FieldKind,
    type DocumentType, type DocumentTypeField,
} from "@/service/documentTypeService/documentTypeService.ts";
import {workflowService} from "@/service/workflowService/workflowService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {toast} from "@/service/toastService.ts";

/**
 * Типы документов, заводимые без программирования.
 *
 * Банк добавляет свой вид документа, задаёт поля карточки и шаблон маршрута —
 * и документ начинает ходить по согласованию наравне со встроенными.
 *
 * Шаблон маршрута здесь не украшение: без него документ такого типа отправить
 * на согласование нельзя, сервер откажет словами «согласовывать нечем».
 * Поэтому тип без шаблона помечен прямо в списке, а не выясняется при первой
 * отправке — к тому времени карточку уже заполнили.
 */

interface Шаблон {
    id: number;
    name: string;
}

export function DocumentTypesPage() {
    const [types, setTypes] = useState<DocumentType[]>([]);
    const [templates, setTemplates] = useState<Шаблон[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);

    const load = async () => {
        const [t, tpl] = await Promise.all([
            documentTypeService.list(),
            workflowService.templates().catch(() => []),
        ]);
        setTypes(t);
        setTemplates(tpl.map((x: {id: number; name?: string; title?: string}) => ({
            id: x.id,
            name: x.name ?? x.title ?? `Шаблон ${x.id}`,
        })));
    };

    useEffect(() => {
        load().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const создать = async () => {
        const titleRu = window.prompt("Название нового типа документа");
        if (!titleRu?.trim()) return;

        const code = window.prompt(
            "Системное имя латиницей — попадёт в номер документа, менять потом нельзя",
            translit(titleRu),
        );
        if (!code?.trim()) return;

        try {
            const created = await documentTypeService.create({
                code: code.trim(),
                titleRu: titleRu.trim(),
                isActive: true,
            });
            await load();
            setOpenId(created.id);
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            toast.error("Не удалось завести тип", r.response?.data?.message);
        }
    };

    if (loading) return <Loader label="Загружаем типы…"/>;

    const безМаршрута = types.filter((t) => !готовКРаботе(t)).length;

    return (
        <div className="flex flex-col gap-5">
            <PageHeader
                title="Типы документов"
                description="Свои виды документов: поля карточки и маршрут согласования — без программирования"
                actions={
                    <button
                        type="button"
                        onClick={создать}
                        className="flex items-center gap-2 rounded-[10px] bg-[#2f68f5] px-4 py-2
                                   text-[14px] font-medium text-white transition hover:bg-[#2554cc]"
                    >
                        <Plus size={16}/>
                        Новый тип
                    </button>
                }
            />

            {безМаршрута > 0 && (
                <p className="flex items-start gap-2 rounded-[10px] bg-[#fbeeda] px-4 py-3
                              text-[13.5px] text-[#96590a]">
                    <AlertTriangle size={16} className="mt-0.5 flex-none"/>
                    <span>
                        {безМаршрута === 1 ? "Один тип" : `Типов без маршрута: ${безМаршрута}`}
                        {" "}— документы такого типа заводятся, но отправить их на согласование
                        нельзя, пока не выбран шаблон маршрута.
                    </span>
                </p>
            )}

            {types.length === 0 ? (
                <EmptyState
                    title="Своих типов пока нет"
                    description="Встроенные виды документов — записки, нормативные документы, закупки — настраиваются в своих разделах."
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {types.map((type) => (
                        <TypeCard
                            key={type.id}
                            type={type}
                            templates={templates}
                            open={openId === type.id}
                            onToggle={() => setOpenId(openId === type.id ? null : type.id)}
                            onChanged={load}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function TypeCard({type, templates, open, onToggle, onChanged}: {
    type: DocumentType;
    templates: Шаблон[];
    open: boolean;
    onToggle: () => void;
    onChanged: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const рабочий = готовКРаботе(type);

    const сохранить = async (change: Partial<DocumentType>) => {
        setSaving(true);
        try {
            await documentTypeService.update(type.id, {
                titleRu: change.titleRu ?? type.titleRu,
                titleEn: change.titleEn ?? type.titleEn,
                titleKg: change.titleKg ?? type.titleKg,
                description: change.description ?? type.description,
                routeTemplateId: change.routeTemplateId !== undefined
                    ? change.routeTemplateId
                    : type.routeTemplateId,
                numberPattern: change.numberPattern ?? type.numberPattern,
                isActive: change.isActive ?? type.isActive,
            });
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            toast.error("Не удалось сохранить", r.response?.data?.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <article className="overflow-hidden rounded-[12px] border border-[#e1e7ef] bg-white">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f8fafc]"
            >
                <ChevronRight
                    size={15}
                    className={`flex-none text-[#8593a8] transition-transform ${open ? "rotate-90" : ""}`}
                />

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[#101a2c]">
                        {type.titleRu}
                    </span>
                    <span className="block truncate text-[12px] text-[#8593a8]">
                        <code className="font-mono">{type.code}</code>
                        {" · "}
                        {type.routeTemplateName
                            ? <>маршрут: {type.routeTemplateName}</>
                            : <span className="text-[#96590a]">маршрут не выбран</span>}
                        {type.fields.length > 0 && <> · полей: {type.fields.length}</>}
                    </span>
                </span>

                {!type.isActive && (
                    <span className="flex-none rounded-[5px] bg-[#eef2f7] px-2 py-0.5 text-[11px] text-[#5b6b85]">
                        выключен
                    </span>
                )}
                {!рабочий && (
                    <AlertTriangle size={15} className="flex-none text-[#96590a]"/>
                )}
            </button>

            {open && (
                <div className="flex flex-col gap-4 border-t border-[#eef2f7] bg-[#fafbfd] p-4">

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Поле label="Название">
                            <input
                                defaultValue={type.titleRu}
                                onBlur={(e) => e.target.value !== type.titleRu
                                    && сохранить({titleRu: e.target.value})}
                                className={ввод}
                            />
                        </Поле>

                        <Поле
                            label="Шаблон маршрута"
                            hint={рабочий
                                ? undefined
                                : "Без шаблона документ нельзя отправить на согласование"}
                        >
                            <select
                                value={type.routeTemplateId ?? ""}
                                onChange={(e) => сохранить({
                                    routeTemplateId: e.target.value ? Number(e.target.value) : null,
                                })}
                                className={`${ввод} ${рабочий ? "" : "border-[#e0b978]"}`}
                            >
                                <option value="">— не выбран —</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </Поле>

                        <Поле
                            label="Маска номера"
                            hint="Например ПР-{year}-{seq}. Пусто — номер как у прочих документов"
                        >
                            <input
                                defaultValue={type.numberPattern ?? ""}
                                onBlur={(e) => e.target.value !== (type.numberPattern ?? "")
                                    && сохранить({numberPattern: e.target.value || null})}
                                placeholder="ПР-{year}-{seq}"
                                className={`${ввод} font-mono`}
                            />
                        </Поле>

                        <Поле label="Состояние">
                            <label className="flex cursor-pointer items-center gap-2 py-2 text-[13.5px] text-[#4d5a72]">
                                <input
                                    type="checkbox"
                                    checked={type.isActive}
                                    onChange={(e) => сохранить({isActive: e.target.checked})}
                                    className="h-4 w-4 accent-[#2f68f5]"
                                />
                                Предлагать при создании документа
                            </label>
                        </Поле>
                    </div>

                    <Поля type={type} onChanged={onChanged}/>

                    {saving && <p className="text-[12.5px] text-[#8593a8]">Сохраняем…</p>}
                </div>
            )}
        </article>
    );
}

/** Поля карточки этого типа. */
function Поля({type, onChanged}: {type: DocumentType; onChanged: () => Promise<void>}) {
    const добавить = async () => {
        const titleRu = window.prompt("Название поля");
        if (!titleRu?.trim()) return;

        const code = window.prompt("Имя поля латиницей — по нему хранится значение",
                                   translit(titleRu));
        if (!code?.trim()) return;

        try {
            await documentTypeService.addField(type.id, {
                code: code.trim(),
                titleRu: titleRu.trim(),
                kind: FieldKind.Text,
                isRequired: false,
                showInList: false,
            });
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            toast.error("Не удалось добавить поле", r.response?.data?.message);
        }
    };

    const удалить = async (field: DocumentTypeField) => {
        if (!window.confirm(`Удалить поле «${field.titleRu}»? Значения, уже введённые в карточках, пропадут.`)) return;
        try {
            await documentTypeService.removeField(field.id);
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            toast.error("Не удалось удалить поле", r.response?.data?.message);
        }
    };

    const менять = async (field: DocumentTypeField, change: Partial<DocumentTypeField>) => {
        try {
            await documentTypeService.updateField(field.id, {
                code: field.code,
                titleRu: change.titleRu ?? field.titleRu,
                kind: change.kind ?? field.kind,
                dictionaryId: change.dictionaryId !== undefined ? change.dictionaryId : field.dictionaryId,
                isRequired: change.isRequired ?? field.isRequired,
                showInList: change.showInList ?? field.showInList,
                order: change.order ?? field.order,
                hint: change.hint ?? field.hint,
            });
            await onChanged();
        } catch (e: unknown) {
            const r = e as {response?: {data?: {message?: string}}};
            toast.error("Не удалось изменить поле", r.response?.data?.message);
        }
    };

    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h4 className="text-[13.5px] font-semibold text-[#101a2c]">Поля карточки</h4>
                <button
                    type="button"
                    onClick={добавить}
                    className="flex items-center gap-1.5 text-[13px] text-[#2f68f5] hover:underline"
                >
                    <Plus size={14}/>
                    Добавить поле
                </button>
            </div>

            {type.fields.length === 0 ? (
                <p className="text-[13px] text-[#8593a8]">
                    Полей нет. В карточке будут только название и вложения.
                </p>
            ) : (
                <div className="overflow-hidden rounded-[9px] border border-[#e1e7ef] bg-white">
                    {type.fields.map((field) => (
                        <div
                            key={field.id}
                            className="flex flex-wrap items-center gap-3 border-b border-[#f2f5f9]
                                       px-3 py-2.5 last:border-b-0"
                        >
                            <input
                                defaultValue={field.titleRu}
                                onBlur={(e) => e.target.value !== field.titleRu
                                    && менять(field, {titleRu: e.target.value})}
                                className="min-w-[160px] flex-1 rounded-[7px] border border-transparent
                                           px-2 py-1 text-[13.5px] outline-none transition
                                           hover:border-[#e1e7ef] focus:border-[#2f68f5]"
                            />

                            <code className="font-mono text-[11.5px] text-[#8593a8]">{field.code}</code>

                            <select
                                value={field.kind}
                                onChange={(e) => менять(field, {kind: Number(e.target.value) as FieldKind})}
                                className="rounded-[7px] border border-[#e1e7ef] px-2 py-1 text-[12.5px]
                                           outline-none focus:border-[#2f68f5]"
                            >
                                {FIELD_KINDS.map((k) => (
                                    <option key={k} value={k}>{FIELD_KIND_TITLE[k]}</option>
                                ))}
                            </select>

                            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#4d5a72]">
                                <input
                                    type="checkbox"
                                    checked={field.isRequired}
                                    onChange={(e) => менять(field, {isRequired: e.target.checked})}
                                    className="h-3.5 w-3.5 accent-[#2f68f5]"
                                />
                                обязательное
                            </label>

                            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#4d5a72]">
                                <input
                                    type="checkbox"
                                    checked={field.showInList}
                                    onChange={(e) => менять(field, {showInList: e.target.checked})}
                                    className="h-3.5 w-3.5 accent-[#2f68f5]"
                                />
                                в списке
                            </label>

                            <button
                                type="button"
                                onClick={() => удалить(field)}
                                aria-label={`Удалить поле ${field.titleRu}`}
                                className="rounded p-1 text-[#a8b3c4] transition hover:bg-[#fbe8e5] hover:text-[#b3372a]"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function Поле({label, hint, children}: {
    label: string; hint?: string; children: React.ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-[#4d5a72]">{label}</span>
            {children}
            {hint && <span className="text-[11.5px] leading-[1.5] text-[#96590a]">{hint}</span>}
        </label>
    );
}

const ввод =
    "rounded-[9px] border border-[#e1e7ef] bg-white px-3 py-2 text-[13.5px] " +
    "outline-none transition focus:border-[#2f68f5]";

/**
 * Подсказывает системное имя по названию. Только подсказка — человек правит
 * поле руками, а угадать «правильную» латиницу за него мы всё равно не сможем.
 */
function translit(source: string): string {
    const карта: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
        и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
        с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
        щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    };

    return source
        .toLowerCase()
        .split("")
        .map((c) => карта[c] ?? c)
        .join("")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
}
