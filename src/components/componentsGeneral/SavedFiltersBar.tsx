/**
 * Сохранённые фильтры реестра (БП-16). Применить именованный набор условий одним
 * кликом или сохранить текущий. Универсальный: scope задаёт реестр (sz | procurement).
 */
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {savedFilterService, type SavedFilter} from "@/service/savedFilterService.ts";
import {toast} from "@/service/toastService.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {Bookmark, BookmarkPlus, Check, ChevronDown, Trash2, X} from "lucide-react";

/** Источник сохранённых фильтров. По умолчанию — личные фильтры реестров (savedFilterService). */
export interface SavedFiltersApi {
    list: () => Promise<Pick<SavedFilter, "id" | "name" | "payload">[]>;
    create: (name: string, payload: Record<string, unknown>) => Promise<unknown>;
    remove: (id: number) => Promise<void>;
}

interface Props {
    scope: string;
    /** Свой источник — например, сохранённые поиски общего поиска; тогда scope не используется. */
    api?: SavedFiltersApi;
    /** Текущие условия фильтра — сохраняются как есть. */
    current: Record<string, unknown>;
    onApply: (payload: Record<string, unknown>) => void;
    /**
     * Сбросить все условия фильтра. Кнопка «Снять фильтры» показывается, только пока применён
     * сохранённый фильтр из этой панели; без onReset её нет вовсе.
     */
    onReset?: () => void;
}

const FOCUS_RING = "outline-none focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff]";

export function SavedFiltersBar({scope, api, current, onApply, onReset}: Props) {
    const {t} = useTranslation();
    const [filters, setFilters] = useState<Pick<SavedFilter, "id" | "name" | "payload">[]>([]);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    /** Фильтр, удаление которого ждёт подтверждения в модалке. */
    const [pendingDelete, setPendingDelete] = useState<Pick<SavedFilter, "id" | "name"> | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    // api приходит новым объектом на каждый рендер родителя — держим в ref, чтобы не перезагружать список.
    const apiRef = useRef(api);
    useEffect(() => {
        apiRef.current = api;
    });

    // Какой сохранённый фильтр сейчас применён. snapshot - состояние условий сразу после применения
    // (его фиксируем на следующем рендере, когда родитель уже получил новые значения): стоит
    // условиям измениться руками - фильтр перестаёт считаться применённым.
    const [applied, setApplied] = useState<{id: number; name: string; snapshot: string | null} | null>(null);
    const currentKey = JSON.stringify(current);
    useEffect(() => {
        if (!applied) return;
        if (applied.snapshot === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setApplied({...applied, snapshot: currentKey});
        } else if (applied.snapshot !== currentKey) {
            setApplied(null);
        }
    }, [applied, currentKey]);

    async function reload() {
        try {
            setFilters(await (apiRef.current?.list() ?? await savedFilterService.list(scope)));
        } catch {
            /* список фильтров не критичен для работы реестра */
        }
    }

    useEffect(() => {
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope]);

    // Выпадающий список закрывается кликом снаружи и по Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    function apply(f: Pick<SavedFilter, "id" | "name" | "payload">) {
        onApply(f.payload);
        setApplied({id: f.id, name: f.name, snapshot: null});
        setOpen(false);
    }

    function startNaming() {
        setNaming(true);
        setOpen(false);
        setError(null);
    }

    function cancelNaming() {
        setNaming(false);
        setName("");
        setError(null);
    }

    async function save() {
        const trimmed = name.trim();
        if (!trimmed) {
            setError(t("savedFilters.nameRequired"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await (apiRef.current?.create(trimmed, current) ?? await savedFilterService.create(scope, trimmed, current));
            setName("");
            setNaming(false);
            toast.success(t("savedFilters.savedToast", {name: trimmed}));
            await reload();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? t("savedFilters.saveFailed"));
            toast.error(t("savedFilters.saveFailed"), msg);
        } finally {
            setBusy(false);
        }
    }

    /** Корзина в списке: закрываем выпадашку и спрашиваем подтверждение. */
    function askRemove(f: Pick<SavedFilter, "id" | "name">) {
        setOpen(false);
        setDeleteError(null);
        setPendingDelete(f);
    }

    function cancelRemove() {
        if (deleting) return;
        setPendingDelete(null);
        setDeleteError(null);
    }

    async function confirmRemove() {
        if (!pendingDelete) return;
        const id = pendingDelete.id;
        setDeleting(true);
        setDeleteError(null);
        try {
            await (apiRef.current?.remove(id) ?? await savedFilterService.remove(id));
            setPendingDelete(null);
            if (applied?.id === id) setApplied(null);
            toast.success(t("savedFilters.deletedToast", {name: pendingDelete.name}));
            await reload();
        } catch {
            // Модалку не закрываем: пусть пользователь видит, что фильтр остался, и может повторить.
            setDeleteError(t("savedFilters.deleteFailed"));
            toast.error(t("savedFilters.deleteFailed"));
        } finally {
            setDeleting(false);
        }
    }

    const hasFilters = filters.length > 0;

    /**
     * «Снять фильтры» - сбрасывает все условия реестра разом. Появляется только пока применён сохранённый
     * фильтр из панели (в том числе пустой - иначе он застрял бы); стоит условиям измениться руками -
     * фильтр уже не считается применённым, и кнопка пропадает (отдельные условия снимаются чипсами).
     */
    const resetButton = onReset && applied ? (
        <button
            type="button"
            onClick={() => {
                onReset();
                setApplied(null);
            }}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] font-semibold text-[#55617a] transition-colors hover:border-[#f1c9c2] hover:bg-[#fbeae7] hover:text-[#c0392b]"
        >
            <X className="h-4 w-4"/>
            {t("savedFilters.reset")}
        </button>
    ) : null;

    return (
        <div ref={rootRef} className="flex flex-wrap items-center gap-2">
            {naming ? (
                <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={e => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    <div className="relative">
                        <BookmarkPlus
                            className="pointer-events-none absolute left-[11px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#2f68f5]"/>
                        <input
                            autoFocus
                            value={name}
                            maxLength={120}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === "Escape" && cancelNaming()}
                            placeholder={t("savedFilters.namePlaceholder")}
                            className={`h-9 w-[240px] rounded-[9px] border bg-white pl-[34px] pr-3 text-[13px] text-[#0f1b2d] placeholder:text-[#a3adbd] ${
                                error ? "border-[#f1c9c2]" : "border-[#e5e9f0]"
                            } ${FOCUS_RING}`}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border-none bg-[#2f68f5] px-3.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_#2f68f5] hover:brightness-[1.06] disabled:cursor-default disabled:opacity-60"
                    >
                        <Check className="h-4 w-4" strokeWidth={2.5}/>
                        {busy ? t("general.saving") : t("general.save")}
                    </button>
                    <button
                        type="button"
                        onClick={cancelNaming}
                        disabled={busy}
                        className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        {t("general.cancel")}
                    </button>
                </form>
            ) : !hasFilters ? (
                /* Пустое состояние: подсказка и сразу действие. */
                <div
                    className="inline-flex h-10 items-center gap-2.5 rounded-[11px] border border-dashed border-[#cbddff] bg-[#f6f9ff] pl-2.5 pr-1.5">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#e9f0ff] text-[#2f68f5]">
                        <Bookmark className="h-[13px] w-[13px]" strokeWidth={2.25}/>
                    </span>
                    <span className="text-[13px] text-[#8b97ab]">{t("savedFilters.empty")}</span>
                    <button
                        type="button"
                        onClick={startNaming}
                        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#cbddff] bg-white px-2.5 text-[12.5px] font-semibold text-[#2f68f5] transition-colors hover:border-[#2f68f5] hover:bg-[#2f68f5] hover:text-white"
                    >
                        <BookmarkPlus className="h-[15px] w-[15px]"/>
                        {t("savedFilters.save")}
                    </button>
                    {resetButton}
                </div>
            ) : (
                <>
                    <div className="relative">
                        <button
                            type="button"
                            aria-haspopup="true"
                            aria-expanded={open}
                            onClick={() => setOpen(o => !o)}
                            className={`inline-flex h-9 min-w-[200px] max-w-[340px] cursor-pointer items-center gap-2 rounded-[9px] border pl-2.5 pr-2 text-[13px] font-semibold ${
                                applied ? "bg-[#f3f7ff] text-[#2f68f5]" : "bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                            } ${
                                open ? "border-[#2f68f5] ring-[3px] ring-[#e9f0ff]" : applied ? "border-[#2f68f5]" : "border-[#e5e9f0]"
                            }`}
                        >
                            <Bookmark className="h-4 w-4 flex-none text-[#2f68f5]"/>
                            <span className="flex-1 truncate text-left">{applied ? applied.name : t("savedFilters.title")}</span>
                            <span
                                className="rounded-full bg-[#e9f0ff] px-[7px] py-[1px] font-mono text-[11px] font-bold text-[#2f68f5]">
                                {filters.length}
                            </span>
                            <ChevronDown
                                className={`h-4 w-4 flex-none text-[#8b97ab] transition-transform ${open ? "rotate-180" : ""}`}/>
                        </button>

                        {open && (
                            <div
                                className="absolute left-0 top-full z-20 mt-1.5 w-[320px] overflow-hidden rounded-[12px] border border-[#e5e9f0] bg-white shadow-[0_12px_32px_-12px_rgba(15,27,45,.25)]">
                                <div className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                                    {t("savedFilters.applyHint")}
                                </div>
                                <ul className="m-0 max-h-[260px] list-none overflow-y-auto p-1.5">
                                    {filters.map(f => (
                                        <li key={f.id}
                                            className={`group flex items-center gap-1 rounded-[8px] hover:bg-[#f3f7ff] ${applied?.id === f.id ? "bg-[#eef3ff]" : ""}`}>
                                            <button
                                                type="button"
                                                onClick={() => apply(f)}
                                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent px-2 py-2 text-left text-[13px] text-[#1c2740]"
                                            >
                                                {applied?.id === f.id
                                                    ? <Check className="h-3.5 w-3.5 flex-none text-[#2f68f5]" strokeWidth={2.5}/>
                                                    : <Bookmark className="h-3.5 w-3.5 flex-none text-[#a3adbd] group-hover:text-[#2f68f5]"/>}
                                                <span className={`truncate ${applied?.id === f.id ? "font-semibold text-[#2f68f5]" : ""}`}>{f.name}</span>
                                            </button>
                                            <Tooltip content={t("savedFilters.delete")} side="top" className="mr-1 flex-none">
                                                <button
                                                    type="button"
                                                    aria-label={t("savedFilters.delete")}
                                                    onClick={() => askRemove(f)}
                                                    className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5"/>
                                                </button>
                                            </Tooltip>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={startNaming}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[9px] border border-[#cbddff] bg-[#f6f9ff] px-3 text-[13px] font-semibold text-[#2f68f5] hover:bg-[#e9f0ff]"
                    >
                        <BookmarkPlus className="h-4 w-4"/>
                        {t("savedFilters.save")}
                    </button>
                    {resetButton}
                </>
            )}

            {error && <span className="text-[12px] text-[#c0392b]">{error}</span>}

            {/* Подтверждение удаления сохранённого фильтра */}
            <ConfirmDeleteModal
                open={pendingDelete !== null}
                onClose={cancelRemove}
                onConfirm={() => void confirmRemove()}
                title={t("savedFilters.deleteConfirmTitle")}
                message={t("savedFilters.deleteConfirmMessage", {name: pendingDelete?.name ?? ""})}
                loading={deleting}
                error={deleteError}
            />
        </div>
    );
}
