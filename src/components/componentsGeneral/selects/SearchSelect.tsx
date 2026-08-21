import {useEffect, useMemo, useRef, useState} from "react";
import {Check, ChevronDown, X} from "lucide-react";

/**
 * Выбор одного значения с поиском.
 *
 * Обычный список годится, пока значений десяток. На пятистах сотрудниках и
 * полусотне подразделений он превращается в прокрутку, где ищут глазами, — и
 * человек выбирает первое похожее, а не нужное. Здесь набирают часть фамилии
 * или названия.
 *
 * Ищет и по подписи, и по подсказке: у однофамильцев различие в должности, и
 * набрать «Иванов юрид» должно быть достаточно.
 */

export interface SearchOption {
    value: number | string;
    label: string;
    /** Должность, подразделение — то, чем различают одинаковые подписи. */
    hint?: string | null;
}

interface Props {
    options: SearchOption[];
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    /** Разрешить пустое значение — показывается пункт «не выбрано» и крестик. */
    allowEmpty?: boolean;
    emptyLabel?: string;
    /** Подсветить рамку: поле обязательное и не заполнено. */
    invalid?: boolean;
    className?: string;
}

/** Больше этого не показываем: длинный список всё равно листают, а не читают. */
const MAX_VISIBLE = 50;

export function SearchSelect({
                                 options,
                                 value,
                                 onChange,
                                 placeholder = "Не выбрано",
                                 disabled,
                                 allowEmpty = true,
                                 emptyLabel = "Не выбрано",
                                 invalid,
                                 className = "",
                             }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [cursor, setCursor] = useState(0);

    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = options.find((o) => o.value === value) ?? null;

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return options.slice(0, MAX_VISIBLE);

        // Каждое слово запроса должно найтись — так «Иванов юрид» отбирает
        // однофамильца из юридического, а не всех Ивановых подряд.
        const words = needle.split(/\s+/);

        return options
            .filter((option) => {
                const haystack = `${option.label} ${option.hint ?? ""}`.toLowerCase();
                return words.every((word) => haystack.includes(word));
            })
            .slice(0, MAX_VISIBLE);
    }, [options, query]);

    // Список перестроился — подсветка съезжает на первый пункт, иначе она
    // указывала бы на строку, которой там уже нет.
    useEffect(() => {
        setCursor(0);
    }, [query]);

    useEffect(() => {
        if (!open) return;

        const onClickOutside = (event: MouseEvent) => {
            if (!boxRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };

        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const pick = (next: number | string | null) => {
        onChange(next);
        setOpen(false);
        setQuery("");
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setCursor((c) => Math.min(c + 1, filtered.length - 1));
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const option = filtered[cursor];
            if (option) pick(option.value);
        }
    };

    const borderClass = invalid
        ? "border-[#e0a9a1]"
        : open ? "border-[#2f68f5]" : "border-[#e5e9f0]";

    return (
        <div ref={boxRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={`flex h-10 w-full items-center gap-2 rounded-[9px] border px-3 text-left
                            text-[13px] transition ${borderClass}
                            ${disabled ? "cursor-default bg-[#fafbfd] text-[#8b97ab]" : "bg-white text-[#1c2740]"}`}
            >
                <span className={`flex-1 truncate ${selected ? "" : "text-[#a8b3c4]"}`}>
                    {selected ? selected.label : placeholder}
                </span>

                {selected && allowEmpty && !disabled && (
                    <span
                        role="button"
                        tabIndex={-1}
                        aria-label="Очистить"
                        onClick={(event) => {
                            event.stopPropagation();
                            pick(null);
                        }}
                        className="shrink-0 rounded p-0.5 text-[#a8b3c4] hover:text-[#c0392b]"
                    >
                        <X size={14}/>
                    </span>
                )}

                {!disabled && <ChevronDown size={15} className="shrink-0 text-[#a8b3c4]"/>}
            </button>

            {open && !disabled && (
                <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-[10px]
                                border border-[#e5e9f0] bg-white shadow-lg">
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Начните вводить…"
                        className="w-full border-b border-[#eef2f7] px-3 py-2 text-[13px] outline-none"
                    />

                    <div className="max-h-[260px] overflow-y-auto py-1">
                        {allowEmpty && !query.trim() && (
                            <Option
                                label={emptyLabel}
                                muted
                                active={value === null}
                                highlighted={false}
                                onClick={() => pick(null)}
                            />
                        )}

                        {filtered.length === 0 ? (
                            <div className="px-3 py-3 text-[13px] text-[#a8b3c4]">
                                Ничего не найдено
                            </div>
                        ) : (
                            filtered.map((option, index) => (
                                <Option
                                    key={option.value}
                                    label={option.label}
                                    hint={option.hint}
                                    active={option.value === value}
                                    highlighted={index === cursor}
                                    onClick={() => pick(option.value)}
                                    onHover={() => setCursor(index)}
                                />
                            ))
                        )}

                        {options.length > MAX_VISIBLE && filtered.length === MAX_VISIBLE && (
                            <div className="border-t border-[#eef2f7] px-3 py-2 text-[12px] text-[#a8b3c4]">
                                Показаны первые {MAX_VISIBLE} — уточните поиск
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Option({label, hint, active, highlighted, muted, onClick, onHover}: {
    label: string;
    hint?: string | null;
    active: boolean;
    highlighted: boolean;
    muted?: boolean;
    onClick: () => void;
    onHover?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={onHover}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition
                        ${highlighted ? "bg-[#f2f6ff]" : ""}`}
        >
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-[13px] ${muted ? "text-[#a8b3c4]" : "text-[#1c2740]"}`}>
                    {label}
                </span>
                {hint && (
                    <span className="block truncate text-[11.5px] text-[#8b97ab]">{hint}</span>
                )}
            </span>
            {active && <Check size={14} className="shrink-0 text-[#2f68f5]"/>}
        </button>
    );
}
