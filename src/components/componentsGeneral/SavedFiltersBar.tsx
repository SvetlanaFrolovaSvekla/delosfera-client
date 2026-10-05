/**
 * Сохранённые фильтры реестра (БП-16). Применить именованный набор условий одним
 * кликом или сохранить текущий. Универсальный: scope задаёт реестр (sz | procurement).
 */
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {savedFilterService, type SavedFilter} from "@/service/savedFilterService.ts";
import {Bookmark, BookmarkPlus, Check, ChevronDown, Trash2} from "lucide-react";

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
}

const FOCUS_RING = "outline-none focus:border-[#2f68f5] focus:ring-[3px] focus:ring-[#e9f0ff]";

export function SavedFiltersBar({scope, api, current, onApply}: Props) {
    const {t} = useTranslation();
    const [filters, setFilters] = useState<Pick<SavedFilter, "id" | "name" | "payload">[]>([]);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    // api приходит новым объектом на каждый рендер родителя — держим в ref, чтобы не перезагружать список.
    const apiRef = useRef(api);
    useEffect(() => {
        apiRef.current = api;
    });

    async function reload() {
        try {
            setFilters(await (apiRef.current?.list() ?? savedFilterService.list(scope)));
        } catch {
            /* список фильтров не критичен для работы реестра */
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
            await (apiRef.current?.create(trimmed, current) ?? savedFilterService.create(scope, trimmed, current));
            setName("");
            setNaming(false);
            await reload();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? t("savedFilters.saveFailed"));
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: number) {
        try {
            await (apiRef.current?.remove(id) ?? savedFilterService.remove(id));
            await reload();
        } catch {
            /* удаление не удалось — оставляем список как есть */
        }
    }

    const hasFilters = filters.length > 0;

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
                </div>
            ) : (
                <>
                    <div className="relative">
                        <button
                            type="button"
                            aria-haspopup="true"
                            aria-expanded={open}
                            onClick={() => setOpen(o => !o)}
                            className={`inline-flex h-9 min-w-[200px] cursor-pointer items-center gap-2 rounded-[9px] border bg-white pl-2.5 pr-2 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] ${
                                open ? "border-[#2f68f5] ring-[3px] ring-[#e9f0ff]" : "border-[#e5e9f0]"
                            }`}
                        >
                            <Bookmark className="h-4 w-4 flex-none text-[#2f68f5]"/>
                            <span className="flex-1 text-left">{t("savedFilters.title")}</span>
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
                                        <li key={f.id} className="group flex items-center gap-1 rounded-[8px] hover:bg-[#f3f7ff]">
                                            <button
                                                type="button"
                                                onClick={() => apply(f)}
                                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent px-2 py-2 text-left text-[13px] text-[#1c2740]"
                                            >
                                                <Bookmark className="h-3.5 w-3.5 flex-none text-[#a3adbd] group-hover:text-[#2f68f5]"/>
                                                <span className="truncate">{f.name}</span>
                                            </button>
                                            <button
                                                type="button"
                                                title={t("savedFilters.delete")}
                                                aria-label={t("savedFilters.delete")}
                                                onClick={() => void remove(f.id)}
                                                className="mr-1 grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5"/>
                                            </button>
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
                </>
            )}

            {error && <span className="text-[12px] text-[#c0392b]">{error}</span>}
        </div>
    );
}
