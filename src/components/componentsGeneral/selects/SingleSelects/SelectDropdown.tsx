// Плоский выпадающий список, может быть поиск, лейбл и др. (не модалка)
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, ChevronDown, Search, X} from "lucide-react";
import {HighlightText} from "@/utils/highlightText.tsx";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import {ACCENT, type Accent} from "@/constants/accent.ts";

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectDropdownProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;            // подпись (см. labelPosition)
    /** "inline" (по умолчанию) — подпись слева от панели, в одну строку (напр. "Статус").
     *  "top" — подпись отдельной строкой над панелью, как заголовок поля формы (напр. панель
     *  фильтров, где подписей несколько и по одной строке они не помещаются). */
    labelPosition?: "inline" | "top";
    placeholder?: string;
    searchable?: boolean;      // показывать ли поиск внутри списка
    searchPlaceholder?: string;
    className?: string;
    minWidth?: string;
    valueClassName?: string;
    /** Подсветить кнопку как невалидную/незаполненную (жёлтая рамка вместо обычной) */
    invalid?: boolean;
    /** "md" (по умолчанию) - обычная высота полей формы; "sm" - компактный вариант для панелей инструментов. */
    size?: "md" | "sm";
    /** Подсветить кнопку как включённую (синяя рамка и текст), например "курсор в таблице". */
    active?: boolean;
    /* Жирность лейбла */
    labelClassName?: string;
    /** Акцентный цвет открытого списка и выбранного пункта. По умолчанию фиолетовый. */
    accent?: Accent;
}

export function SelectDropdown({
                                   options,
                                   value,
                                   onChange,
                                   label,
                                   labelPosition = "inline",
                                   placeholder,
                                   searchable = false,
                                   searchPlaceholder,
                                   className = "",
                                   minWidth = "180px",
                                   valueClassName,
                                   invalid = false,
                                   size = "md",
                                   active = false,
                                   labelClassName = "font-bold",
                                   accent = "violet",
                               }: SelectDropdownProps) {
    const {t} = useTranslation();
    const a = ACCENT[accent];
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    useClickOutside(rootRef, open, () => {
        setOpen(false);
        setQuery("");
    });

    const selected = options.find((o) => o.value === value);

    const filteredOptions = searchable && query.trim()
        ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options;

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setOpen(false);
        setQuery("");
    };

    return (
        <div
            ref={rootRef}
            className={`${labelPosition === "top" ? "flex flex-col gap-1 items-start" : "flex items-center gap-2"} ${className}`}
        >
            {label && (
                <span className={`text-[11px] tracking-[.04em] uppercase text-[#a3adbd] whitespace-nowrap ${labelClassName}`}>
                    {label}
                </span>
            )}

            {/* Своя relative-обёртка вокруг кнопки и панели — чтобы "top-[42px]" у панели ниже
                всегда отсчитывался от низа именно кнопки, а не всего блока вместе с подписью
                (та при labelPosition="top" занимает свою строку и сбила бы отступ). */}
            <div className="relative flex-1 min-w-0">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    style={{minWidth}}
                    className={`inline-flex items-center justify-between gap-2 border font-medium outline-none cursor-pointer hover:bg-[#f6f8fb] ${
                        size === "sm"
                            ? "h-7 px-2 rounded-[6px] text-[11.5px]"
                            : "h-9 px-3 rounded-[9px] text-[12.5px]"
                    } ${active ? "text-[#2f68f5]" : "text-[#3a4560]"} ${
                        open
                            ? `${a.border} ring-[3px] ${a.ring} bg-[#f6f8fb]`
                            : invalid
                                ? "border-[#e0b978] bg-white"
                                : active
                                    ? "border-[#cbddff] bg-white"
                                    : "border-[#e5e9f0] bg-white"
                    }`}
                >
                  <span
                      className={`truncate ${selected ? (valueClassName ?? "font-normal") : "text-[#a3adbd] font-normal"}`}>
                      {selected?.label ?? placeholder ?? "—"}
                  </span>
                    <ChevronDown
                        className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`}
                        strokeWidth={2}
                    />
                </button>

                {open && (
                    <div
                        style={{minWidth}}
                        className={`absolute ${size === "sm" ? "top-[32px]" : "top-[42px]"} left-0 z-30 bg-white border border-[#e5e9f0] rounded-xl shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)] overflow-hidden animate-in fade-in zoom-in-95`}
                    >
                        {searchable && (
                            <div className="p-2 border-b border-[#eef2f7]">
                                <div className="relative">
                                    <Search
                                        className="absolute left-[9px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#a3adbd]"
                                        strokeWidth={2}
                                    />
                                    <input
                                        autoFocus
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={searchPlaceholder ?? t("general.search")}
                                        className={`w-full h-8 pl-7 pr-7 rounded-[7px] border border-[#e5e9f0] bg-[#f6f8fb] text-[12.5px] text-[#1c2740] outline-none ${a.focusBorder} focus:bg-white`}
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery("")}
                                            className="absolute right-[6px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#e5e9f0] hover:text-[#55617a] cursor-pointer"
                                        >
                                            <X className="w-[12px] h-[12px]" strokeWidth={2.5}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="max-h-[260px] overflow-y-auto p-1">
                            {filteredOptions.length === 0 && (
                                <div className="px-3 py-4 text-center text-[12px] text-[#a3adbd]">
                                    {t("general.notFound")}
                                </div>
                            )}
                            {filteredOptions.map((o) => {
                                const isSelected = o.value === value;
                                return (
                                    <button
                                        key={o.value}
                                        type="button"
                                        onClick={() => handleSelect(o.value)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-[9px] rounded-lg text-left text-[12.5px] cursor-pointer ${
                                            isSelected
                                                ? `${a.softBg} ${a.text} font-semibold`
                                                : "text-[#26324a] hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                    <span className="truncate">
                                        <HighlightText text={o.label} query={query}/>
                                    </span>
                                        {isSelected &&
                                            <Check className="w-[14px] h-[14px] flex-none" strokeWidth={2.5}/>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}