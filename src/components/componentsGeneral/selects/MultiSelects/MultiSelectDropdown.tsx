import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, ChevronDown, Search, X} from "lucide-react";
import {HighlightText} from "@/utils/HighlightText.tsx";
import * as React from "react";
import {useClickOutside} from "@/hooks/useClickOutside.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

export interface MultiSelectOption {
    key: string;
    label: string;
    /** Переопределяет цвет чипса выбора в кнопке-триггере (напр. фирменные цвета источника
     * учётной записи, как в бейджах на странице "Пользователи") - используется, только когда
     * выбран единственный пункт с этим цветом; при нескольких выбранных - обычный цвет. */
    chipClassName?: string;
}

interface MultiSelectDropdownProps {
    options: MultiSelectOption[];
    selectedKeys: string[];               // ключи выбранных (видимых) пунктов
    onToggle: (key: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;

    label?: string;                        // подпись сверху (например "Колонки")
    icon?: React.ReactNode;                 // иконка внутри кнопки (например Filter)
    triggerLabel: string;                   // текст на самой кнопке ("Колонки")

    /** Показать triggerLabel отдельной подписью НАД кнопкой (как у MultiSelectField) - тогда
     * плейсхолдер внутри самой кнопки, пока ничего не выбрано, становится общим "Открыть список…"
     * вместо "{triggerLabel}…". По умолчанию выключено - не меняет старые места использования
     * (напр. панель фильтров страницы "Пользователи", где подписи над кнопками нет). */
    showFieldLabel?: boolean;

    searchable?: boolean;                   // явно включить поиск
    searchThreshold?: number;               // авто-включение поиска, если пунктов больше этого числа
    searchPlaceholder?: string;

    className?: string;
    menuWidth?: string;
}

export function MultiSelectDropdown({
                                        options,
                                        selectedKeys,
                                        onToggle,
                                        onSelectAll,
                                        onDeselectAll,
                                        label,
                                        icon,
                                        triggerLabel,
                                        showFieldLabel = false,
                                        searchable = false,
                                        searchThreshold = 8,
                                        searchPlaceholder,
                                        className = "",
                                        menuWidth = "260px",
                                    }: MultiSelectDropdownProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    useClickOutside(rootRef, open, () => {
        setOpen(false);
        setQuery("");
    });

    const showSearch = searchable || options.length > searchThreshold;

    const filteredOptions = showSearch && query.trim()
        ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options;

    const selectedOptions = options.filter((o) => selectedKeys.includes(o.key));
    const allSelected = options.length > 0 && selectedKeys.length === options.length;
    const noneSelected = selectedKeys.length === 0;
    const someSelected = !allSelected && !noneSelected;

    // Единственный выбранный пункт может задать свой цвет чипса (напр. источник учётной записи -
    // как бейджи на странице "Пользователи"); при нескольких выбранных смешивать цвета не имеет
    // смысла - используем обычный фирменный.
    const chipClassName =
        selectedOptions.length === 1 && selectedOptions[0].chipClassName
            ? selectedOptions[0].chipClassName
            : "bg-[#ececfc] text-[#4e57d6]";

    // Пока ничего не выбрано - серым "{triggerLabel}…" (или общим "Открыть список…", если подпись
    // уже показана отдельно над кнопкой - см. showFieldLabel); когда выбрано всё - "Все" (как в
    // MultiSelectField); иначе - чипс с выбором (первый + "+N" при нескольких), а полный список
    // выбранного - в тултипе при наведении.
    const triggerButton = (
        <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex items-center gap-2 h-9 px-3 rounded-[9px] border text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] ${
                open
                    ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                    : "border-[#e5e9f0] bg-white"
            }`}
        >
            {icon}
            {allSelected ? (
                <span className="font-semibold text-[#3a4560]">{t("general.selectAll")}</span>
            ) : noneSelected ? (
                <span className="font-normal text-[#8b97ab]">
                    {showFieldLabel ? t("general.openList") : `${triggerLabel}…`}
                </span>
            ) : (
                <span className={`max-w-[140px] truncate rounded-full px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap ${chipClassName}`}>
                    {selectedOptions.length === 1
                        ? selectedOptions[0].label
                        : `${selectedOptions[0].label} +${selectedOptions.length - 1}`}
                </span>
            )}
            <ChevronDown
                className={`w-[15px] h-[15px] flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`}
                strokeWidth={2}
            />
        </button>
    );

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            {showFieldLabel && (
                <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                    {triggerLabel}
                </span>
            )}
            {someSelected ? (
                <Tooltip content={selectedOptions.map((o) => o.label).join(", ")} side="bottom">
                    {triggerButton}
                </Tooltip>
            ) : (
                triggerButton
            )}

            {open && (
                <div
                    style={{width: menuWidth}}
                    className="absolute top-[42px] right-0 z-30 bg-white border border-[#e5e9f0] rounded-xl shadow-[0_18px_46px_-14px_rgba(15,27,45,.28)] overflow-hidden"
                >
                    <div className="px-2.5 pt-2 pb-1.5">
                        {label && (
                            <span className="block text-[10.5px] font-bold tracking-[.05em] uppercase text-[#a3adbd] mb-1.5">
                                {label}
                            </span>
                        )}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onSelectAll}
                                disabled={allSelected}
                                className={`text-[11px] font-semibold cursor-pointer ${
                                    allSelected
                                        ? "text-[#c3ccd8] cursor-default"
                                        : "text-[#4e57d6] hover:underline"
                                }`}
                            >
                                {t("general.selectAll")}
                            </button>
                            <button
                                type="button"
                                onClick={onDeselectAll}
                                disabled={noneSelected}
                                className={`text-[11px] font-semibold cursor-pointer ${
                                    noneSelected
                                        ? "text-[#c3ccd8] cursor-default"
                                        : "text-[#4e57d6] hover:underline"
                                }`}
                            >
                                {t("general.deselectAll")}
                            </button>
                        </div>
                    </div>

                    {showSearch && (
                        <div className="px-2 pb-2 border-b border-[#eef2f7]">
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
                            const on = selectedKeys.includes(o.key);
                            return (
                                <button
                                    key={o.key}
                                    type="button"
                                    onClick={() => onToggle(o.key)}
                                    className="w-full flex items-center gap-[11px] px-2.5 py-[9px] rounded-lg bg-transparent text-left cursor-pointer hover:bg-[#f6f8fb]"
                                >
                                    <span
                                        className={`w-5 h-5 flex-none rounded-md grid place-items-center ${
                                            on
                                                ? "border-[1.5px] border-[#4e57d6] bg-[#4e57d6]"
                                                : "border-[1.5px] border-[#cbd3df] bg-white"
                                        }`}
                                    >
                                        <Check
                                            className="w-[13px] h-[13px] text-white"
                                            strokeWidth={3}
                                            style={{opacity: on ? 1 : 0}}
                                        />
                                    </span>
                                    <span className="text-[13px] text-[#26324a]">
                                        <HighlightText text={o.label} query={query} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}