// Плоский выпадающий список, может быть поиск, лейбл и др. (не модалка)
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, ChevronDown, Search, X} from "lucide-react";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {useClickOutside} from "@/hooks/useClickOutside.ts";

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectDropdownProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;            // подпись слева (например "Статус")
    placeholder?: string;
    searchable?: boolean;      // показывать ли поиск внутри списка
    searchPlaceholder?: string;
    className?: string;
    minWidth?: string;
}

export function SelectDropdown({
                                   options,
                                   value,
                                   onChange,
                                   label,
                                   placeholder,
                                   searchable = false,
                                   searchPlaceholder,
                                   className = "",
                                   minWidth = "180px",
                               }: SelectDropdownProps) {
    const {t} = useTranslation();
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
        <div ref={rootRef} className={`relative flex items-center gap-2 ${className}`}>
            {label && (
                <span className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] whitespace-nowrap">
                    {label}
                </span>
            )}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{minWidth}}
                className={`inline-flex items-center justify-between gap-2 h-9 px-3 rounded-[9px] border text-[12.5px] font-medium text-[#3a4560] outline-none cursor-pointer hover:bg-[#f6f8fb] ${
                    open
                        ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                        : "border-[#e5e9f0] bg-white"
                }`}
            >
               <span className={`truncate font-normal ${selected ? "" : "text-[#a3adbd] font-normal"}`}>
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
                    className="absolute top-[42px] left-0 z-30 bg-white border border-[#e5e9f0] rounded-xl shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)] overflow-hidden animate-in fade-in zoom-in-95"
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
                                    className="w-full h-8 pl-7 pr-7 rounded-[7px] border border-[#e5e9f0] bg-[#f6f8fb] text-[12.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] focus:bg-white"
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
                                            ? "bg-[#ececfc] text-[#4e57d6] font-semibold"
                                            : "text-[#26324a] hover:bg-[#f6f8fb]"
                                    }`}
                                >
                                    <span className="truncate">
                                        <HighlightText text={o.label} query={query}/>
                                    </span>
                                    {isSelected && <Check className="w-[14px] h-[14px] flex-none" strokeWidth={2.5}/>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}