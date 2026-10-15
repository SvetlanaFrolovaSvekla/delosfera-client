// Модалка "Добавить ВНД на доску": быстрый поиск по коду/названию (тот же, что в шапке) и кнопка
// "Добавить" у каждого результата. Модалка не закрывается после добавления — можно набрать
// несколько документов подряд.
import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Check, CornerUpLeft, Loader2, Plus, Search, X} from "lucide-react";

import {useVndQuickSearch} from "@/hooks/vndHooks/useVndQuickSearch.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {HighlightText} from "@/utils/highlightText.tsx";

interface VndBoardAddModalProps {
    open: boolean;
    onClose: () => void;
    /** Документы, которые уже на доске */
    boardIds: Set<number>;
    /** Связанные с СП документы, убранные пользователем, — их не "добавляют", а возвращают */
    hiddenIds: Set<number>;
    canViewExtended: boolean;
    onAdd: (vndId: number) => Promise<void>;
}

export function VndBoardAddModal({open, onClose, ...rest}: VndBoardAddModalProps) {
    if (!open) return null;
    // Отдельный компонент, чтобы при каждом открытии поиск начинался с чистого листа
    return createPortal(<AddModalContent onClose={onClose} {...rest}/>, document.body);
}

function AddModalContent({onClose, boardIds, hiddenIds, canViewExtended, onAdd}: Omit<VndBoardAddModalProps, "open">) {
    const {t} = useTranslation();
    const [query, setQuery] = useState("");
    const [pendingId, setPendingId] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const {results, loading} = useVndQuickSearch(query);
    const tooShort = query.trim().length < 2;

    useEffect(() => {
        inputRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const add = async (id: number) => {
        if (pendingId !== null) return;
        setPendingId(id);
        try {
            await onAdd(id);
        } finally {
            setPendingId(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(15,27,45,0.42)] px-4 pt-[6vh] backdrop-blur-[2px]"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="vnd-board-add-title"
                className="w-full max-w-[680px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,27,45,0.45)]"
            >
                <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
                    <div>
                        <h2 id="vnd-board-add-title" className="m-0 text-[17px] font-bold tracking-[-0.01em]">
                            {t("vndBoard.addModal.title")}
                        </h2>
                        <p className="m-0 mt-1 text-[12.5px] leading-snug text-[#8b97ab]">
                            {t("vndBoard.addModal.description")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("general.cancel")}
                        className="grid h-8 w-8 flex-none place-items-center rounded-lg border-none bg-transparent text-[#8b97ab] cursor-pointer hover:bg-[#f2f5f9]"
                    >
                        <X className="h-[18px] w-[18px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="px-6 pb-3 pt-2">
                    <label className="flex h-11 items-center gap-2.5 rounded-[11px] border border-[#dfe5ee] bg-[#f7f9fc] px-3.5 focus-within:border-[#4e57d6] focus-within:bg-white focus-within:shadow-[0_0_0_3px_#ececfc]">
                        <Search className="h-[17px] w-[17px] flex-none text-[#8b97ab]" strokeWidth={2}/>
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("vndBoard.addModal.placeholder")}
                            className="h-full min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#0f1b2d] outline-none placeholder:text-[#a3adbd]"
                        />
                        {loading && <Loader2 className="h-4 w-4 flex-none animate-spin text-[#4e57d6]" strokeWidth={2.2}/>}
                    </label>
                </div>

                <div className="min-h-[240px] max-h-[70vh] overflow-y-auto border-t border-[#eef2f7] px-3 py-2">
                    {tooShort ? (
                        <p className="m-0 px-3 py-8 text-center text-[12.5px] text-[#a3adbd]">
                            {t("vndBoard.addModal.hint")}
                        </p>
                    ) : !loading && results.length === 0 ? (
                        <p className="m-0 px-3 py-8 text-center text-[12.5px] text-[#a3adbd]">
                            {t("vndBoard.addModal.nothing")}
                        </p>
                    ) : (
                        <ul className="m-0 list-none p-0">
                            {results.map((r) => {
                                const onBoard = boardIds.has(r.id);
                                const isHidden = hiddenIds.has(r.id);
                                const status = STATUS_META[r.status];
                                return (
                                    <li key={r.id}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#f7f9fc]">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[12px] font-semibold text-[#4e57d6]">
                                                    <HighlightText text={r.code} query={query}/>
                                                </span>
                                                {canViewExtended && status && (
                                                    <span className="rounded-md px-1.5 py-[1px] text-[10.5px] font-semibold"
                                                          style={{color: status.color, background: status.bg}}>
                                                        {t(status.label)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 line-clamp-2 text-[13px] text-[#1c2740]">
                                                <HighlightText text={r.name} query={query}/>
                                            </div>
                                        </div>
                                        {onBoard ? (
                                            <span className="inline-flex h-8 flex-none items-center gap-1.5 rounded-lg bg-[#e2f4ea] px-3 text-[12px] font-semibold text-[#1c7a4d]">
                                                <Check className="h-3.5 w-3.5" strokeWidth={2.4}/>
                                                {t("vndBoard.addModal.onBoard")}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={pendingId !== null}
                                                onClick={() => void add(r.id)}
                                                className="inline-flex h-8 flex-none items-center gap-1.5 rounded-lg border border-[#cbd3f5] bg-white px-3 text-[12px] font-semibold text-[#4e57d6] cursor-pointer hover:bg-[#ececfc] disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {pendingId === r.id
                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4}/>
                                                    : isHidden
                                                        ? <CornerUpLeft className="h-3.5 w-3.5" strokeWidth={2.4}/>
                                                        : <Plus className="h-3.5 w-3.5" strokeWidth={2.4}/>}
                                                {isHidden ? t("vndBoard.actions.restore") : t("vndBoard.addModal.add")}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
