/**
 * Сохранённые фильтры реестра (БП-16). Применить именованный набор условий одним
 * кликом или сохранить текущий. Универсальный: scope задаёт реестр (sz | procurement).
 */
import {useEffect, useState} from "react";
import {savedFilterService, type SavedFilter} from "@/service/savedFilterService.ts";
import {BookmarkPlus, Trash2} from "lucide-react";

interface Props {
    scope: string;
    /** Текущие условия фильтра — сохраняются как есть. */
    current: Record<string, unknown>;
    onApply: (payload: Record<string, unknown>) => void;
}

export function SavedFiltersBar({scope, current, onApply}: Props) {
    const [filters, setFilters] = useState<SavedFilter[]>([]);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        try {
            setFilters(await savedFilterService.list(scope));
        } catch {
            /* список фильтров не критичен для работы реестра */
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope]);

    function apply(id: number) {
        const f = filters.find(x => x.id === id);
        if (f) onApply(f.payload);
    }

    async function save() {
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Введите название фильтра");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await savedFilterService.create(scope, trimmed, current);
            setName("");
            setNaming(false);
            await reload();
        } catch (e: unknown) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(msg ?? "Не удалось сохранить фильтр");
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: number) {
        try {
            await savedFilterService.remove(id);
            await reload();
        } catch {
            /* удаление не удалось — оставляем список как есть */
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                className="h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] text-[#0f1b2d] min-w-[180px]"
                value=""
                disabled={filters.length === 0}
                onChange={e => e.target.value && apply(Number(e.target.value))}
            >
                <option value="">
                    {filters.length === 0 ? "Нет сохранённых фильтров" : "Применить фильтр…"}
                </option>
                {filters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            {!naming ? (
                <button
                    type="button"
                    onClick={() => {setNaming(true); setError(null);}}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] font-semibold text-[#2f68f5] cursor-pointer hover:bg-[#f0f4ff]"
                >
                    <BookmarkPlus className="w-4 h-4"/>
                    Сохранить фильтр
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Название фильтра"
                        className="h-9 rounded-[9px] border border-[#e5e9f0] bg-white px-2.5 text-[13px] min-w-[160px]"
                    />
                    <button
                        type="button" onClick={save} disabled={busy}
                        className="h-9 px-3 rounded-[9px] border-none bg-[#2f68f5] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
                    >
                        {busy ? "…" : "Сохранить"}
                    </button>
                    <button
                        type="button" onClick={() => {setNaming(false); setName(""); setError(null);}} disabled={busy}
                        className="h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] font-semibold text-[#55617a] cursor-pointer"
                    >
                        Отмена
                    </button>
                </div>
            )}

            {filters.length > 0 && (
                <details className="relative">
                    <summary className="text-[12px] text-[#8b97ab] cursor-pointer list-none px-1">управление</summary>
                    <div className="absolute z-10 mt-1 bg-white border border-[#e5e9f0] rounded-[10px] shadow-lg p-2 flex flex-col gap-1 min-w-[220px]">
                        {filters.map(f => (
                            <div key={f.id} className="flex items-center justify-between gap-2 text-[12.5px] text-[#3a4560] px-1">
                                <span className="truncate max-w-[170px]">{f.name}</span>
                                <button
                                    type="button" title="Удалить фильтр" onClick={() => void remove(f.id)}
                                    className="text-[#c0392b] hover:opacity-70 cursor-pointer bg-transparent border-none p-0 shrink-0"
                                >
                                    <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {error && <span className="text-[12px] text-[#c0392b]">{error}</span>}
        </div>
    );
}
